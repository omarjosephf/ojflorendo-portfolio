import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// A date deliberately unlike the real one. The bug this guards was an intro
// that hardcoded "September 2026" beside a footer reading now.updated: while
// the two happened to agree the page looked correct, so a test using the real
// data passes against the bug and proves nothing. Only a different date
// separates "derived from the data" from "a literal that currently matches".
vi.mock("@/data/now", () => ({
  now: {
    updated: "April 2031",
    items: [],
    personalNote: "",
  },
}));

import { Now } from "./Now";

describe("Now", () => {
  it("takes both dates from now.updated rather than a literal", () => {
    render(<Now />);

    expect(
      screen.getByText("My current focus, updated April 2031."),
    ).toBeInTheDocument();
    expect(screen.getByText("Last updated April 2031.")).toBeInTheDocument();
  });
});
