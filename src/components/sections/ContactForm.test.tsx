import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactForm } from "./ContactForm";

// These tests cover CLIENT-side validation only. Invalid input must be caught
// before any network request is made — so a stubbed fetch must never be called.
// The full submit → mock-transport flow is covered by the Playwright e2e tests.
describe("ContactForm (client validation)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows required-field errors and does not submit when empty", async () => {
    render(<ContactForm />);
    fireEvent.click(screen.getByRole("button", { name: /send project enquiry/i }));

    expect(await screen.findByText(/please enter your name/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email before submitting", async () => {
    render(<ContactForm />);
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Jane Recruiter" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByLabelText(/enquiry type/i), {
      target: { value: "job" },
    });
    fireEvent.change(screen.getByLabelText(/subject/i), {
      target: { value: "Hello there" },
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "A message long enough to pass validation." },
    });
    fireEvent.click(screen.getByLabelText(/happy for OJ Florendo/i));
    fireEvent.click(screen.getByRole("button", { name: /send project enquiry/i }));

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
