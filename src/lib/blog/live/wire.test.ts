import { describe, expect, it } from "vitest";
import { BlogPipelineValidationError } from "../pipeline/errors";
import {
  CRITIQUE_SCHEMA,
  IDEA_SLATE_SCHEMA,
  RESEARCH_SELECTION_SCHEMA,
  REVIEWER_OUTPUT_SCHEMA,
  SEO_REVIEW_SCHEMA,
  WIRE_SCHEMA_DISALLOWED_KEYWORDS,
  WRITER_DRAFT_SCHEMA,
  parseCritique,
  parseIdeaSlate,
  parseSeoReview,
  projectResearchSelection,
  stampWireVersion,
} from "./wire";

const WIRE_SCHEMAS = {
  RESEARCH_SELECTION_SCHEMA,
  WRITER_DRAFT_SCHEMA,
  REVIEWER_OUTPUT_SCHEMA,
  IDEA_SLATE_SCHEMA,
  SEO_REVIEW_SCHEMA,
  CRITIQUE_SCHEMA,
};

/** Every keyword and enum value in a schema, with its path. */
function walk(node: unknown, path: string, visit: (key: string, value: unknown, path: string) => void) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => walk(item, `${path}[${index}]`, visit));
    return;
  }
  if (node === null || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    visit(key, value, path);
    // Property names are data, not keywords; walk their schemas only.
    if (key === "properties") {
      for (const [name, schema] of Object.entries(value as Record<string, unknown>)) walk(schema, `${path}.${name}`, visit);
    } else {
      walk(value, `${path}.${key}`, visit);
    }
  }
}

describe("wire schemas", () => {
  it.each(Object.entries(WIRE_SCHEMAS))("%s keeps to the subset OpenRouter passes to Gemini intact", (_name, schema) => {
    const problems: string[] = [];
    walk(schema, "$", (key, value, path) => {
      if ((WIRE_SCHEMA_DISALLOWED_KEYWORDS as readonly string[]).includes(key)) problems.push(`${path}.${key}`);
      if (key === "enum" && (!Array.isArray(value) || value.some((item) => typeof item !== "string"))) {
        problems.push(`${path}.enum holds a non-string value`);
      }
    });
    expect(problems).toEqual([]);
    expect(Object.keys((schema as { properties: object }).properties)).not.toContain("schemaVersion");
  });
});

describe("stampWireVersion", () => {
  it("adds version 1 to an object that has none", () => {
    expect(stampWireVersion({ lessons: [] })).toEqual({ schemaVersion: 1, lessons: [] });
  });

  it("leaves a model-supplied version for the parser to check", () => {
    expect(stampWireVersion({ schemaVersion: 2, lessons: [] })).toEqual({ schemaVersion: 2, lessons: [] });
    expect(() => parseCritique(stampWireVersion({ schemaVersion: 2, lessons: [] }), new Set())).toThrow(BlogPipelineValidationError);
  });

  it("passes anything that is not an object through unchanged", () => {
    expect(stampWireVersion("text")).toBe("text");
    expect(stampWireVersion(null)).toBeNull();
    expect(stampWireVersion([1])).toEqual([1]);
  });

  it("still rejects the empty object OpenRouter returned when the schema was lost (13 October 2026)", () => {
    const empty = stampWireVersion({});
    expect(() => parseIdeaSlate(empty, new Set(["a"]))).toThrow(BlogPipelineValidationError);
    expect(() => parseSeoReview(empty)).toThrow(BlogPipelineValidationError);
    expect(() => parseCritique(empty, new Set())).toThrow(BlogPipelineValidationError);
    expect(() => projectResearchSelection(empty, [])).toThrow(BlogPipelineValidationError);
  });
});
