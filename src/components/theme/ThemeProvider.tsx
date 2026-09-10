"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { isThemePreference, THEME_CHANNEL, THEME_COOKIE, themeColors, type ThemePreference } from "@/lib/theme/preference";

type ThemeState = { preference: ThemePreference; setPreference: (value: ThemePreference) => void; notice: string };
const ThemeContext = createContext<ThemeState>({ preference: "system", setPreference: () => {}, notice: "" });

function applyPreference(value: ThemePreference) {
  const root = document.documentElement;
  root.dataset.themeSwitching = "";
  root.dataset.theme = value;
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", value === "system" ? "light dark" : value);
  document.querySelectorAll('meta[name="theme-color"]').forEach((tag) => {
    const scheme = value === "system" ? (tag.getAttribute("media")?.includes("dark") ? "dark" : "light") : value;
    tag.setAttribute("content", themeColors[scheme]);
  });
  // Commit foreground and background together; interpolated colors can briefly
  // lose contrast when switching between opposite schemes. No inline styles.
  void root.offsetHeight;
  delete root.dataset.themeSwitching;
}
function savePreference(value: ThemePreference): boolean {
  try {
    document.cookie = `${THEME_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    return document.cookie.split(";").some((part) => part.trim() === `${THEME_COOKIE}=${value}`);
  } catch { return false; }
}

/** One explicit display preference across every product surface on this origin.
 * The server renders the cookie before paint; CSS follows the device in System.
 * No identifier, chat text, remote request or inline initialization script.
 */
export function ThemeProvider({ initialPreference, children }: { initialPreference: ThemePreference; children: React.ReactNode }) {
  const [preference, setValue] = useState(initialPreference);
  const [notice, setNotice] = useState("");
  const channel = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof window.BroadcastChannel !== "function") return;
    try {
      const current = new BroadcastChannel(THEME_CHANNEL);
      channel.current = current;
      current.onmessage = (event: MessageEvent<unknown>) => {
        if (!isThemePreference(event.data)) return;
        applyPreference(event.data);
        setValue(event.data);
      };
      return () => { current.close(); channel.current = null; };
    } catch { /* Cross-tab sync is optional; the cookie still persists reloads. */ }
  }, []);
  const setPreference = useCallback((value: ThemePreference) => {
    if (!isThemePreference(value)) return;
    applyPreference(value);
    setValue(value);
    const saved = savePreference(value);
    setNotice(saved ? "" : "Theme changed for this page. Your browser could not save the preference.");
    try { channel.current?.postMessage(value); } catch { /* Local choice still applies. */ }
  }, []);
  return <ThemeContext.Provider value={{ preference, setPreference, notice }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
