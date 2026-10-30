import { describe, expect, it } from "vitest";
import { isSameOriginJson } from "./same-origin-json";

const post = (headers: Record<string, string>) =>
  new Request("https://ojfr.me/api/contact", { method: "POST", headers, body: "{}" });

describe("isSameOriginJson", () => {
  it("accepts a JSON request from the site's own page", () => {
    expect(isSameOriginJson(post({ "content-type": "application/json", "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(isSameOriginJson(post({ "content-type": "application/json; charset=utf-8" }))).toBe(true);
  });

  it("refuses the simple-request content types a foreign page can send without a preflight", () => {
    for (const type of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data", ""]) {
      expect(isSameOriginJson(post({ "content-type": type }))).toBe(false);
    }
  });

  it("refuses a JSON request the browser marks as cross-site", () => {
    for (const site of ["cross-site", "same-site", "none"]) {
      expect(isSameOriginJson(post({ "content-type": "application/json", "sec-fetch-site": site }))).toBe(false);
    }
  });
});
