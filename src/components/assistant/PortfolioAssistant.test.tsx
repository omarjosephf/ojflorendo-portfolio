import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PortfolioAssistant } from "./PortfolioAssistant";
import {
  ASSISTANT_SESSION_KEY,
  saveAssistantSession,
} from "@/lib/assistant/client-state";
import type { AssistantResult } from "@/lib/assistant/types";

let fetchMock: ReturnType<typeof vi.fn>;

// These component tests do not benchmark Vite's first module transformation.
// Preload the real panel; production browser tests still exercise lazy loading.
beforeAll(async () => { await import("./AssistantPanel"); });

const GROUNDED: AssistantResult = {
  state: "answered",
  answer: "OJ has two published projects: Cited and this portfolio platform.",
  citations: [
    {
      quote: "OJ has two published projects",
      label: "About OJ",
      href: "/#about",
    },
  ],
  modelRoute: "primary",
};

beforeEach(() => {
  window.sessionStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function respondWith(result: unknown, ok = true) {
  fetchMock.mockImplementation(async () => new Response(JSON.stringify(result), {
    status: ok ? 200 : 502,
    headers: { "Content-Type": "application/json" },
  }));
}

async function openAssistant() {
  fireEvent.click(
    screen.getByRole("button", { name: /open e\.v/i }),
  );
  const dialog = await screen.findByRole("dialog");
  const input = screen.getByLabelText(/message e\.v/i);
  await waitFor(() => expect(input).toBeEnabled());
  return dialog;
}

async function askSomething(text = "What projects has OJ built?") {
  fireEvent.change(screen.getByLabelText(/message e\.v/i), {
    target: { value: text },
  });
  fireEvent.click(
    screen.getByRole("button", { name: /send message to e\.v/i }),
  );
}

function sentBody(call = 0) {
  return JSON.parse(fetchMock.mock.calls[call]![1].body);
}

describe("E.V experience", () => {
  it("starts with a minimal welcome and keeps the full disclosure in the header control", async () => {
    render(<PortfolioAssistant />);
    await openAssistant();

    expect(screen.getByRole("heading", { name: "E.V" })).toBeVisible();
    expect(screen.queryByText(/^beta$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Chat color theme")).not.toBeInTheDocument();
    expect(screen.getByText("OJ’s portfolio AI assistant", { exact: true })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Hi, I'm E.V." })).toBeVisible();
    expect(screen.getByText("How can I help you?", { exact: true })).toBeVisible();
    expect(screen.getByLabelText("Message E.V", { exact: true })).toHaveAttribute(
      "placeholder",
      "Write a message…",
    );
    expect(screen.queryByText(/suggested questions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/looking through oj's approved content/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear chat" })).not.toBeInTheDocument();

    const disclosureButton = screen.getByRole("button", {
      name: "About & privacy",
    });
    const disclosureId = disclosureButton.getAttribute("aria-controls");
    expect(disclosureButton).toHaveAttribute("aria-expanded", "false");
    expect(disclosureId).toBeTruthy();
    expect(document.getElementById(disclosureId!)).not.toBeVisible();

    fireEvent.click(disclosureButton);
    expect(disclosureButton).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("region", { name: "About & privacy" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "AI answers from OJ’s published portfolio, with sources. Not OJ.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(
      screen.getByText(/questions go through oj's server to google, with openai as a backup/i),
    ).toBeVisible();
    expect(screen.getByText(/up to 20 recent completed exchanges/i)).toBeVisible();
  });

  it("shows the character counter only when the input is near its limit", async () => {
    render(<PortfolioAssistant />);
    await openAssistant();

    const input = screen.getByLabelText("Message E.V", { exact: true });
    fireEvent.change(input, { target: { value: "x".repeat(239) } });
    expect(screen.queryByText(/characters remaining/i)).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "x".repeat(240) } });
    expect(screen.getByText("40 characters remaining", { exact: true })).toBeVisible();
  });

  it("renders a validated answer and keeps its source available on demand", async () => {
    respondWith(GROUNDED);
    render(<PortfolioAssistant />);
    await openAssistant();
    await askSomething();

    expect(await screen.findByText(GROUNDED.answer)).toBeVisible();
    fireEvent.click(screen.getByText("1 source"));
    expect(screen.getByText(`“${GROUNDED.citations[0]!.quote}”`)).toBeVisible();
    expect(screen.getByRole("link", { name: "About OJ" })).toHaveAttribute(
      "href",
      "/#about",
    );
  });

  it("shows and announces fallback use, and preserves the visible label on restore", async () => {
    const fallback: AssistantResult = { ...GROUNDED, modelRoute: "fallback" };
    respondWith(fallback);
    const first = render(<PortfolioAssistant />);
    await openAssistant();
    await askSomething();

    expect(await screen.findByText(GROUNDED.answer)).toBeVisible();
    expect(screen.getByText("Backup model used", { exact: true })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      `E.V: Backup model used. ${GROUNDED.answer}`,
    );
    await waitFor(() =>
      expect(window.sessionStorage.getItem(ASSISTANT_SESSION_KEY)).toContain(
        '"modelRoute":"fallback"',
      ),
    );

    first.unmount();
    render(<PortfolioAssistant />);
    await openAssistant();
    expect(screen.getByText("Backup model used", { exact: true })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("renders an attacker-selected API href as plain text", async () => {
    respondWith({
      ...GROUNDED,
      citations: [{ ...GROUNDED.citations[0], href: "https://evil.example/x" }],
    });
    render(<PortfolioAssistant />);
    await openAssistant();
    await askSomething();

    await screen.findByText(GROUNDED.answer);
    fireEvent.click(screen.getByText("1 source"));
    expect(screen.queryByRole("link", { name: "About OJ" })).not.toBeInTheDocument();
    expect(screen.getByText("About OJ")).toBeVisible();
  });

  it("echoes immediately, announces a quiet pending state and blocks duplicate submission", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<PortfolioAssistant />);
    await openAssistant();
    await askSomething();

    expect(screen.getByText("What projects has OJ built?")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Thinking…");
    expect(screen.getByLabelText(/message e\.v/i)).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /send message/i }),
    ).toBeDisabled();
    fireEvent.submit(screen.getByLabelText(/message e\.v/i).closest("form")!);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ends a stalled response body at the ten-second UI deadline", async () => {
    fetchMock.mockResolvedValue(
      new Response(new ReadableStream<Uint8Array>({ start() {} })),
    );
    render(<PortfolioAssistant />);
    await openAssistant();
    vi.useFakeTimers();
    await askSomething("Will this finish?");

    const signal = fetchMock.mock.calls[0]![1].signal as AbortSignal;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    vi.useRealTimers();

    expect(signal.aborted).toBe(true);
    expect(screen.getByText(/i can't answer right now/i, { selector: "article p" })).toBeVisible();
    expect(screen.getByLabelText(/message e\.v/i)).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent(/i can't answer right now/i);
  });

  it("shows humane not-covered and unavailable messages with a route to OJ", async () => {
    respondWith({ state: "not-covered", answer: "OJ has not published that detail." });
    const view = render(<PortfolioAssistant />);
    await openAssistant();
    await askSomething("What are OJ's hobbies?");

    expect(await screen.findByText(/i can.t answer that from the information i have/i, { selector: "article p" })).toBeVisible();
    expect(screen.queryByText(/not in oj's approved content/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /contact oj/i })).toBeVisible();

    view.unmount();
    window.sessionStorage.clear();
    respondWith({ state: "surprise", answer: "trust me" });
    render(<PortfolioAssistant />);
    await openAssistant();
    await askSomething();
    expect(await screen.findByText(/i can't answer right now/i, { selector: 'article p' })).toBeVisible();
    expect(screen.queryByText("trust me")).not.toBeInTheDocument();
  });
});

describe("tab continuity and privacy", () => {
  it("clearing a pending request suppresses its result even after a new question succeeds", async () => {
    let release!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { release = resolve; }));
    render(<PortfolioAssistant />);
    await openAssistant();
    await askSomething("Old pending question");
    const signal = fetchMock.mock.calls[0]![1].signal as AbortSignal;
    fireEvent.click(screen.getByRole("button", { name: /clear chat/i }));
    expect(signal.aborted).toBe(true);
    respondWith(GROUNDED);
    await askSomething("A new question");
    await screen.findByText(GROUNDED.answer);
    await act(async () => { release(new Response(JSON.stringify({ state: "not-covered", answer: "Stale answer" }))); });
    expect(screen.queryByText("Stale answer")).not.toBeInTheDocument();
    expect(screen.queryByText("Old pending question")).not.toBeInTheDocument();
    expect(sentBody(1).history).toEqual([]);
  });

  it.each(["broken", JSON.stringify({ version: 99 }), "x".repeat(33_000)])("continues in memory after an invalid stored record", async (record) => {
    window.sessionStorage.setItem(ASSISTANT_SESSION_KEY, record);
    respondWith(GROUNDED);
    render(<PortfolioAssistant />);
    await openAssistant();
    expect(screen.getByText(/staying in memory for now/i, { selector: "p:not(.sr-only)" })).toBeVisible();
    await askSomething();
    await screen.findByText(GROUNDED.answer);
    expect(window.sessionStorage.getItem(ASSISTANT_SESSION_KEY)).toBeNull();
  });

  it("does not promise erasure when browser storage cannot remove an old copy", async () => {
    saveAssistantSession(window.sessionStorage, [{ id: 0, question: "Previously saved", result: GROUNDED }], 1, 2);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("denied"); });
    render(<PortfolioAssistant />);
    await openAssistant();
    expect(screen.getByText(/older saved messages may reappear/i, { selector: "p:not(.sr-only)" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /clear chat/i }));
    expect(screen.queryByText("Previously saved")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(ASSISTANT_SESSION_KEY)).toContain("Previously saved");
    expect(screen.getByText(/older saved messages may reappear/i, { selector: "p:not(.sr-only)" })).toBeVisible();
  });
  it("keeps a completed exchange across close/reopen and refresh without resending", async () => {
    respondWith(GROUNDED);
    const first = render(<PortfolioAssistant />);
    await openAssistant();
    await askSomething();
    await screen.findByText(GROUNDED.answer);
    await waitFor(() =>
      expect(window.sessionStorage.getItem(ASSISTANT_SESSION_KEY)).not.toBeNull(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /close e\.v/i }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await openAssistant();
    expect(screen.getByText(GROUNDED.answer)).toBeVisible();

    first.unmount();
    render(<PortfolioAssistant />);
    await openAssistant();
    expect(screen.getByText(GROUNDED.answer)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears the live and saved chat and sends no old context afterward", async () => {
    respondWith(GROUNDED);
    render(<PortfolioAssistant />);
    await openAssistant();
    await askSomething();
    await screen.findByText(GROUNDED.answer);

    fireEvent.click(screen.getByRole("button", { name: /clear chat/i }));
    expect(screen.queryByText(GROUNDED.answer)).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(ASSISTANT_SESSION_KEY)).toBeNull();

    respondWith(GROUNDED);
    await askSomething("A fresh question");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sentBody(1).history).toEqual([]);
  });

  it("aborts and discards a pending request when closed", async () => {
    let release: (value: unknown) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    render(<PortfolioAssistant />);
    await openAssistant();
    await askSomething("A request that should stop");

    const signal = fetchMock.mock.calls[0]![1].signal as AbortSignal;
    fireEvent.click(
      screen.getByRole("button", { name: /close e\.v/i }),
    );
    expect(signal.aborted).toBe(true);

    await openAssistant();
    expect(screen.queryByText("A request that should stop")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(ASSISTANT_SESSION_KEY)).toBeNull();
    release(new Response(JSON.stringify(GROUNDED)));
    await Promise.resolve();
    expect(screen.queryByText(GROUNDED.answer)).not.toBeInTheDocument();
  });

  it("never saves or transmits a blocked sensitive question", async () => {
    render(<PortfolioAssistant />);
    await openAssistant();
    await askSomething("Email me at visitor@example.com");

    expect(await screen.findByText(/message was not sent anywhere/i, { selector: "article p" })).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(ASSISTANT_SESSION_KEY) ?? "").not.toContain(
      "visitor@example.com",
    );
  });

  it("restores question/source context but never replays answer prose", async () => {
    respondWith(GROUNDED);
    const first = render(<PortfolioAssistant />);
    await openAssistant();
    await askSomething();
    await screen.findByText(GROUNDED.answer);
    await waitFor(() =>
      expect(window.sessionStorage.getItem(ASSISTANT_SESSION_KEY)).not.toBeNull(),
    );
    first.unmount();

    respondWith(GROUNDED);
    render(<PortfolioAssistant />);
    await openAssistant();
    await askSomething("How long did that take?");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(sentBody(1).history).toEqual([
      { question: "What projects has OJ built?", sources: ["About OJ"] },
    ]);
    expect(JSON.stringify(sentBody(1))).not.toContain(GROUNDED.answer);
    expect(JSON.stringify(sentBody(1))).not.toContain(GROUNDED.citations[0]!.quote);
  });

  it("stays usable in memory when session storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("disabled");
    });
    respondWith(GROUNDED);
    render(<PortfolioAssistant />);
    await openAssistant();
    expect(screen.getByText(/staying in memory for now/i, { selector: "p:not(.sr-only)" })).toBeVisible();

    await askSomething();
    await screen.findByText(GROUNDED.answer);
    fireEvent.click(
      screen.getByRole("button", { name: /close e\.v/i }),
    );
    await openAssistant();
    expect(screen.getByText(GROUNDED.answer)).toBeVisible();
  });

  it("can clear an older record after a later storage write fails", async () => {
    saveAssistantSession(
      window.sessionStorage,
      [{ id: 0, question: "Saved earlier", result: GROUNDED }],
      1,
      2,
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });

    render(<PortfolioAssistant />);
    await openAssistant();
    expect(await screen.findByText("Saved earlier")).toBeVisible();
    expect(screen.getByText(/staying in memory for now/i, { selector: "p:not(.sr-only)" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /clear chat/i }));
    expect(window.sessionStorage.getItem(ASSISTANT_SESSION_KEY)).toBeNull();
  });
});

describe("accessibility and lazy presentation", () => {
  it("keeps one stable announcement region and never announces source expansion or restored history", async () => {
    let release!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { release = resolve; }));
    const first = render(<PortfolioAssistant />);
    await openAssistant();
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("");
    await askSomething();
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("Thinking…");
    await act(async () => { release(new Response(JSON.stringify(GROUNDED))); });
    await screen.findByText(GROUNDED.answer);
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent(`E.V: ${GROUNDED.answer}`);
    const observer = new MutationObserver(() => {});
    observer.observe(status, { subtree: true, childList: true, characterData: true });
    fireEvent.click(screen.getByText("1 source"));
    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
    first.unmount();
    render(<PortfolioAssistant />);
    await openAssistant();
    expect(screen.getByText(GROUNDED.answer)).toBeVisible();
    expect(screen.getByRole("status").textContent).toBe("");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("returns focus to the entry control when Escape closes the panel", async () => {
    render(<PortfolioAssistant />);
    const toggle = screen.getByRole("button", {
      name: /open e\.v/i,
    });
    await openAssistant();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it("loads E.V’s portrait only after first open", async () => {
    render(<PortfolioAssistant />);
    expect(screen.queryByAltText(/illustrated avatar of e\.v/i)).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain("ev-avatar-portrait");

    await openAssistant();
    expect(screen.getByAltText(/illustrated avatar of e\.v/i)).toHaveAttribute(
      "src",
      expect.stringContaining("ev-avatar-portrait"),
    );
  });
});
