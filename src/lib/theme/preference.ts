export const THEME_COOKIE = "oj-color-theme";
export const THEME_CHANNEL = "oj-color-theme";
export type ThemePreference = "system" | "light" | "dark";
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}
export function themePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : "system";
}
export const themeColors = { light: "#f5f2e9", dark: "#141916" } as const;
