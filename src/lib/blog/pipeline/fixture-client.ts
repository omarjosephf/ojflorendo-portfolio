import { BlogPipelineValidationError, BlogWorkflowFault } from "./errors";
import {
  containsDisallowedPrivateMaterial,
  containsInstructionLikeText,
} from "./security";
import type {
  BlogAgentRole,
  BlogModelStage,
  ModelCallQuote,
  ModelCallRequest,
  ModelCallResponse,
  ModelClient,
} from "./types";

export type SavedFixtureCall = {
  stage: BlogModelStage;
  reservationMicroUsd: number;
  response: unknown;
} | {
  stage: BlogModelStage;
  reservationMicroUsd: number;
  failure: "adapter-failure";
};

export interface SavedFixtureClientConfig {
  schemaVersion: 1;
  contextId: string;
  role: BlogAgentRole;
  calls: SavedFixtureCall[];
}

const ROLES = ["planner-researcher", "writer", "reviewer-verifier"] as const;
const STAGES = ["research", "draft", "review", "revision", "final-review"] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function parseConfig(value: unknown): SavedFixtureClientConfig {
  const issues: string[] = [];
  if (!isObject(value)) throw new BlogPipelineValidationError(["root must be an object"], "fixture client");
  const expected = new Set(["schemaVersion", "contextId", "role", "calls"]);
  for (const key of expected) {
    if (!Object.hasOwn(value, key)) issues.push(`root.${key} is required`);
  }
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) issues.push(`root.${key} is not allowed`);
  }
  if (value.schemaVersion !== 1) issues.push("root.schemaVersion must be 1");
  if (
    typeof value.contextId !== "string" ||
    value.contextId.length > 100 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value.contextId)
  ) {
    issues.push("root.contextId must be a lowercase hyphenated identifier of at most 100 characters");
  } else if (containsDisallowedPrivateMaterial(value.contextId)) {
    issues.push("root.contextId contains credential-shaped, machine-local or personal sensitive material");
  } else if (containsInstructionLikeText(value.contextId)) {
    issues.push("root.contextId contains instruction-like text");
  }
  if (!ROLES.includes(value.role as BlogAgentRole)) issues.push("root.role is invalid");

  const calls: SavedFixtureCall[] = [];
  if (!Array.isArray(value.calls) || value.calls.length < 1 || value.calls.length > 5) {
    issues.push("root.calls must contain between 1 and 5 fixture calls");
  } else {
    value.calls.forEach((call, index) => {
      const path = `root.calls[${index}]`;
      if (!isObject(call)) {
        issues.push(`${path} must be an object`);
        return;
      }
      const callKeys = new Set(["stage", "reservationMicroUsd", "response", "failure"]);
      for (const key of ["stage", "reservationMicroUsd"]) {
        if (!Object.hasOwn(call, key)) issues.push(`${path}.${key} is required`);
      }
      for (const key of Object.keys(call)) {
        if (!callKeys.has(key)) issues.push(`${path}.${key} is not allowed`);
      }
      const hasResponse = Object.hasOwn(call, "response");
      const hasFailure = Object.hasOwn(call, "failure");
      if (hasResponse === hasFailure) {
        issues.push(`${path} must contain exactly one of response or failure`);
      }
      if (hasFailure && call.failure !== "adapter-failure") {
        issues.push(`${path}.failure must be adapter-failure`);
      }
      if (!STAGES.includes(call.stage as BlogModelStage)) issues.push(`${path}.stage is invalid`);
      if (!Number.isSafeInteger(call.reservationMicroUsd) || (call.reservationMicroUsd as number) < 0) {
        issues.push(`${path}.reservationMicroUsd must be a non-negative safe integer`);
      }
      const common = {
        stage: STAGES.includes(call.stage as BlogModelStage) ? (call.stage as BlogModelStage) : "research",
        reservationMicroUsd:
          Number.isSafeInteger(call.reservationMicroUsd) && (call.reservationMicroUsd as number) >= 0
            ? (call.reservationMicroUsd as number)
            : 0,
      };
      calls.push(
        hasFailure
          ? { ...common, failure: "adapter-failure" }
          : { ...common, response: call.response },
      );
    });
  }
  if (issues.length > 0) throw new BlogPipelineValidationError(issues, "fixture client");
  return {
    schemaVersion: 1,
    contextId: value.contextId as string,
    role: value.role as BlogAgentRole,
    calls,
  };
}

/**
 * The only Phase 18.2 adapter. It reads an already-loaded fixture queue and has
 * no filesystem, network, credential, subprocess or repository-write ability.
 */
export class SavedFixtureModelClient implements ModelClient {
  readonly adapter = "saved-fixture-v1";
  readonly contextId: string;
  readonly role: BlogAgentRole;
  #calls: SavedFixtureCall[];
  #quotedCallId: string | undefined;

  constructor(rawConfig: unknown) {
    const config = parseConfig(rawConfig);
    this.contextId = config.contextId;
    this.role = config.role;
    this.#calls = config.calls.map((call) => structuredClone(call));
  }

  quote(request: ModelCallRequest): ModelCallQuote {
    const next = this.requireNext(request);
    this.#quotedCallId = request.callId;
    return { reservationMicroUsd: next.reservationMicroUsd };
  }

  async generate(request: ModelCallRequest): Promise<ModelCallResponse> {
    const next = this.requireNext(request);
    if (this.#quotedCallId !== request.callId) {
      throw new BlogWorkflowFault(
        "fixture-call-not-reserved",
        request.stage,
        "The fixture call was dispatched without its matching quote.",
      );
    }
    this.#quotedCallId = undefined;
    this.#calls.shift();
    if ("failure" in next) {
      throw new Error("Saved fixture requested a synthetic adapter failure.");
    }
    return structuredClone(next.response) as ModelCallResponse;
  }

  get remainingCalls() {
    return this.#calls.length;
  }

  private requireNext(request: ModelCallRequest) {
    if (request.role !== this.role) {
      throw new BlogWorkflowFault(
        "fixture-role-mismatch",
        request.stage,
        "The fixture client received a request for another role.",
      );
    }
    const next = this.#calls[0];
    if (!next) {
      throw new BlogWorkflowFault(
        "fixture-exhausted",
        request.stage,
        "The saved fixture has no response for this call.",
      );
    }
    if (next.stage !== request.stage) {
      throw new BlogWorkflowFault(
        "fixture-stage-mismatch",
        request.stage,
        "The saved fixture call order does not match the workflow state machine.",
      );
    }
    return next;
  }
}
