import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

/**
 * Turnstile lifecycle in the contact form.
 *
 * Two failures here cost real enquiries, so both are covered explicitly:
 *
 * 1. Submitting before the check has issued a token is refused server-side, so
 *    the button must be disabled until it arrives.
 * 2. A Turnstile token is SINGLE-USE. If a submission is rejected (a mistyped
 *    email, say) and the widget is not reset, the corrected resubmission replays
 *    a spent token, Cloudflare returns `timeout-or-duplicate`, and the visitor
 *    is locked out of the form entirely.
 *
 * The widget itself is mocked: the real one loads a Cloudflare script that
 * cannot run in jsdom, and what matters here is the contract between form and
 * widget, not Cloudflare's internals.
 */

interface CapturedProps {
  onToken: (token: string) => void;
  onUnavailable?: () => void;
  resetSignal?: number;
}

const captured = vi.hoisted(() => ({ props: null as CapturedProps | null }));

vi.mock("./TurnstileWidget", () => ({
  TurnstileWidget: (props: CapturedProps) => {
    captured.props = props;
    return null;
  },
}));

const { ContactForm } = await import("./ContactForm");

const SITE_KEY = "0xTEST_SITE_KEY";

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/full name/i), {
    target: { value: "Jane Recruiter" },
  });
  fireEvent.change(screen.getByLabelText(/^email/i), {
    target: { value: "jane@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/enquiry type/i), {
    target: { value: "job" },
  });
  fireEvent.change(screen.getByLabelText(/subject/i), {
    target: { value: "Frontend role" },
  });
  fireEvent.change(screen.getByLabelText(/message/i), {
    target: { value: "We have an opening that fits your profile nicely." },
  });
  fireEvent.click(screen.getByLabelText(/happy for OJ Florendo/i));
}

const submitButton = () =>
  screen.getByRole("button", { name: /send project enquiry/i });

/** Deliver a token from the mocked widget, as Cloudflare would. */
function emitToken(token: string) {
  act(() => captured.props?.onToken(token));
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  captured.props = null;
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", SITE_KEY);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ContactForm — Turnstile enforced", () => {
  it("blocks submission until the check has issued a token", () => {
    render(<ContactForm />);

    // Before the token arrives the visitor must not be able to submit, or they
    // hit a "couldn't confirm you're human" error they did nothing to cause.
    expect(submitButton()).toBeDisabled();
    expect(
      screen.getByText(/running a quick security check/i),
    ).toBeInTheDocument();

    emitToken("fresh-token");

    expect(submitButton()).toBeEnabled();
    expect(
      screen.queryByText(/running a quick security check/i),
    ).not.toBeInTheDocument();
  });

  it("sends the token with the submission", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, delivered: true }),
    });
    render(<ContactForm />);
    emitToken("fresh-token");
    fillValidForm();

    fireEvent.click(submitButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(
      (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
    ) as { turnstileToken?: string };
    expect(body.turnstileToken).toBe("fresh-token");
  });

  it("resets the widget after a rejected submission so a retry is not a replay", async () => {
    // The server rejects the email domain; the token is already spent.
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        ok: false,
        error: "Please check the highlighted fields and try again.",
        fieldErrors: { email: "We couldn't verify that email domain." },
      }),
    });
    render(<ContactForm />);
    emitToken("spent-token");
    fillValidForm();

    const before = captured.props?.resetSignal ?? 0;
    fireEvent.click(submitButton());

    await screen.findByText(/couldn't verify that email domain/i);

    // A fresh token must have been requested...
    expect(captured.props?.resetSignal ?? 0).toBeGreaterThan(before);
    // ...and the spent one dropped, so it can never be resubmitted.
    expect(submitButton()).toBeDisabled();

    // Once the replacement arrives the visitor can correct and retry.
    emitToken("replacement-token");
    expect(submitButton()).toBeEnabled();
  });

  it("resets the widget when the request fails outright", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    render(<ContactForm />);
    emitToken("spent-token");
    fillValidForm();

    const before = captured.props?.resetSignal ?? 0;
    fireEvent.click(submitButton());

    await screen.findByText(/couldn't be sent/i);
    expect(captured.props?.resetSignal ?? 0).toBeGreaterThan(before);
  });

  it("stops claiming a check is running once it has failed to load", () => {
    render(<ContactForm />);

    expect(
      screen.getByText(/running a quick security check/i),
    ).toBeInTheDocument();

    act(() => captured.props?.onUnavailable?.());

    // The widget shows its own explanation; the button must not imply progress.
    expect(
      screen.queryByText(/running a quick security check/i),
    ).not.toBeInTheDocument();
    // Still blocked, because the server would refuse a tokenless submission.
    expect(submitButton()).toBeDisabled();
  });
});

describe("ContactForm — Turnstile not configured", () => {
  it("leaves the form fully usable", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    render(<ContactForm />);

    expect(submitButton()).toBeEnabled();
    expect(
      screen.queryByText(/running a quick security check/i),
    ).not.toBeInTheDocument();
  });
});
