"use client";

import { useId } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { themePreference } from "@/lib/theme/preference";

export function ThemeSelect({ label = "Color theme" }: { label?: string }) {
  const { preference, setPreference, notice } = useTheme();
  const id = useId();
  const Icon = preference === "dark" ? Moon : preference === "light" ? Sun : Monitor;
  return <div className="theme-control">
    <label className="theme-select">
      <Icon size={15} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select aria-label={label} aria-describedby={notice ? id : undefined} value={preference} onChange={(event) => setPreference(themePreference(event.target.value))}>
        <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
      </select>
    </label>
    {notice && <span id={id} role="status" className="theme-save-notice">{notice}</span>}
  </div>;
}
