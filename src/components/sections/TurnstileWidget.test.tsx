import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TurnstileWidget } from "./TurnstileWidget";
afterEach(()=>{vi.useRealTimers();delete window.turnstile;document.getElementById("cf-turnstile-script")?.remove();});
it("bounds a stalled script, carries the nonce, and reports failure on later attempts too",async()=>{
  vi.useFakeTimers();const token=vi.fn(),unavailable=vi.fn();
  const first=render(<TurnstileWidget siteKey="0xTEST_AUTH_KEY" nonce="synthetic-nonce" onToken={token} onUnavailable={unavailable} failureMessage="Synthetic verification unavailable"/>);
  const script=document.getElementById("cf-turnstile-script") as HTMLScriptElement;
  expect(script.nonce).toBe("synthetic-nonce");expect(script.src).toBe("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit");
  await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});expect(screen.getByRole("alert")).toHaveTextContent("Synthetic verification unavailable");expect(unavailable).toHaveBeenCalledTimes(1);expect(token).not.toHaveBeenCalled();
  first.unmount();render(<TurnstileWidget siteKey="0xTEST_AUTH_KEY" onToken={token} onUnavailable={unavailable} failureMessage="Synthetic verification unavailable"/>);
  await act(async()=>{});expect(unavailable).toHaveBeenCalledTimes(2);expect(document.querySelectorAll("#cf-turnstile-script")).toHaveLength(1);
});
it("invalidates expired/error tokens, resets after submission, and removes the widget on unmount",async()=>{
  const token=vi.fn(),reset=vi.fn(),remove=vi.fn();let options:Parameters<NonNullable<Window["turnstile"]>["render"]>[1]|undefined;
  window.turnstile={render:vi.fn((_container,value)=>{options=value;return "synthetic-widget";}),reset,remove};
  const view=render(<TurnstileWidget siteKey="0xTEST_AUTH_KEY" onToken={token} theme="auto"/>);await act(async()=>{});
  expect(options?.theme).toBe("auto");act(()=>options?.callback("synthetic-fresh-token"));expect(token).toHaveBeenLastCalledWith("synthetic-fresh-token");
  act(()=>options?.["expired-callback"]());expect(token).toHaveBeenLastCalledWith("");act(()=>options?.["error-callback"]());expect(token).toHaveBeenLastCalledWith("");
  view.rerender(<TurnstileWidget siteKey="0xTEST_AUTH_KEY" onToken={token} theme="auto" resetSignal={1}/>);expect(reset).toHaveBeenCalledWith("synthetic-widget");view.unmount();expect(remove).toHaveBeenCalledWith("synthetic-widget");token.mockClear();act(()=>options?.callback("synthetic-late-token"));expect(token).not.toHaveBeenCalled();
});
