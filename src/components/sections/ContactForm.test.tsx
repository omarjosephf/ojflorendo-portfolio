import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ContactForm } from "./ContactForm";

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: /send enquiry/i }));

function fillEssentials(email = "jane@example.com") {
  fireEvent.change(screen.getByLabelText(/your name/i), {
    target: { value: "Jane Baker" },
  });
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: email },
  });
  fireEvent.click(screen.getByLabelText(/ai automation or workflow/i));
  fireEvent.change(screen.getByLabelText(/how can i help/i), {
    target: { value: "We answer the same booking questions every day." },
  });
  fireEvent.click(screen.getByLabelText(/happy for Joseph Florendo/i));
}

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
    submit();

    expect(await screen.findByText(/please enter your name/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
    expect(screen.getByText(/please choose what you need/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    // The first error receives focus.
    expect(screen.getByLabelText(/your name/i)).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email before submitting", async () => {
    render(<ContactForm />);
    fillEssentials("not-an-email");
    submit();

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a company website that is not a web address", async () => {
    render(<ContactForm />);
    fillEssentials();
    fireEvent.change(screen.getByLabelText(/company website/i), {
      target: { value: "not a website" },
    });
    submit();

    expect(await screen.findByText(/enter a web address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company website/i)).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("groups the fields into three announced sections (ADR-0033)", () => {
    render(<ContactForm />);
    for (const name of ["About you", "Your business", "Your project"]) {
      expect(screen.getByRole("group", { name })).toBeInTheDocument();
    }
    const need = screen.getByRole("radiogroup", { name: /what do you need/i });
    expect(need).toHaveAttribute("aria-required", "true");
    expect(within(need).getAllByRole("radio").map((r) => r.closest("label")?.textContent)).toEqual([
      "AI automation or workflow",
      "AI agent",
      "Website or care plan",
      "Something else",
    ]);
    const areas = screen.getByRole("group", { name: /areas to improve/i });
    expect(within(areas).getAllByRole("checkbox")).toHaveLength(6);
  });

  it("marks only the essentials as required", () => {
    render(<ContactForm />);
    for (const label of [/your role/i, /company name/i, /company website/i, /company size/i, /budget/i]) {
      expect(screen.getByLabelText(label)).not.toBeRequired();
    }
    for (const label of [/your name/i, /email address/i, /how can i help/i]) {
      expect(screen.getByLabelText(label)).toBeRequired();
    }
  });

  it("offers no retired enquiry types and no build check", () => {
    const { container } = render(<ContactForm />);
    const text = container.textContent!.toLowerCase();
    for (const retired of ["build check", "job opportunity", "collaboration", "sponsorship", "speaking", "subject"]) {
      expect(text).not.toContain(retired);
    }
  });

  it("shows amounts only as budget choices (ADR-0033)", () => {
    const { container } = render(<ContactForm />);
    const budget = screen.getByLabelText(/budget/i);
    const outside = container.cloneNode(true) as HTMLElement;
    outside.querySelector(`#${CSS.escape(budget.id)}`)!.remove();
    expect(outside.textContent).not.toMatch(/[£$€]\s?\d/);
    expect(budget.textContent).toMatch(/£1,000/);
  });
});

describe("ContactForm (after sending)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubDelivered() {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, delivered: true, mode: "resend" }), {
          status: 200,
        }),
      ),
    );
  }

  it("sends the new fields and thanks the visitor, with no reply-time promise", async () => {
    stubDelivered();
    render(<ContactForm />);
    fillEssentials();
    fireEvent.click(screen.getByLabelText(/admin and paperwork/i));
    fireEvent.change(screen.getByLabelText(/budget/i), {
      target: { value: "2500-5000" },
    });
    submit();

    expect(await screen.findByText("Thanks.")).toBeInTheDocument();
    expect(screen.getByText("I'll read it and reply by email.")).toBeInTheDocument();
    const sent = JSON.parse(
      (vi.mocked(fetch).mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(sent).toMatchObject({
      enquiryType: "automation",
      areas: ["admin"],
      budget: "2500-5000",
    });
    expect(sent).not.toHaveProperty("subject");
    expect(screen.queryByText(/working day|within \d/i)).not.toBeInTheDocument();
  });

  it("offers the booking link after sending only when one is configured", async () => {
    stubDelivered();
    const { unmount } = render(<ContactForm />);
    fillEssentials();
    submit();
    await screen.findByText("Thanks.");
    expect(screen.queryByRole("link", { name: /book a free 30-minute call/i })).toBeNull();
    unmount();

    stubDelivered();
    render(
      <ContactForm
        booking={{ href: "https://cal.com/example/30min", label: "Book a free 30-minute call" }}
      />,
    );
    fillEssentials();
    submit();
    const link = await screen.findByRole("link", {
      name: /book a free 30-minute call \(opens in a new tab\)/i,
    });
    expect(link).toHaveAttribute("href", "https://cal.com/example/30min");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
