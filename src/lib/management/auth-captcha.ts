/** Public widget configuration only. Supabase Auth must independently enforce
 * CAPTCHA before signup activation; this value is not proof of that setting. */
export function authCaptchaSiteKey(): string | null {
  const key = process.env.EV_AUTH_TURNSTILE_SITE_KEY;
  return key && /^[a-zA-Z0-9_-]{10,100}$/.test(key) ? key : null;
}
export function validAuthCaptchaToken(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 2048 && !/\s/.test(value);
}
export function ownerCaptchaConfiguration() {
  return { required: Boolean(process.env.EV_AUTH_TURNSTILE_SITE_KEY), siteKey: authCaptchaSiteKey() };
}
