import type { BlogModelStage } from "./types";

export class BlogPipelineValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[], source = "blog pipeline value") {
    super(`${source} is invalid:\n- ${issues.join("\n- ")}`);
    this.name = "BlogPipelineValidationError";
    this.issues = [...issues];
  }
}

export class BlogWorkflowFault extends Error {
  readonly code: string;
  readonly stage: BlogModelStage | "configuration";

  constructor(code: string, stage: BlogModelStage | "configuration", message: string) {
    super(message);
    this.name = "BlogWorkflowFault";
    this.code = code;
    this.stage = stage;
  }
}
