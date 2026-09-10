import { test, expect } from "@playwright/test";

test("management preview is absent from production even with the preview flag set", async ({ request }) => {
  const response = await request.get("/manage");
  expect(response.status()).toBe(404);
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  expect(await response.text()).not.toContain("Synthetic chats ending");
});
test("production management APIs cannot read or mutate local preview state", async ({ request }) => {
  expect((await request.get("/manage/live")).status()).toBe(404);
  expect((await request.get("/api/management/owner")).status()).toBe(404);
  expect((await request.get("/api/management/operations?view=report")).status()).toBe(404);
  expect((await request.get("/api/management/gaps")).status()).toBe(404);
  expect((await request.post("/api/management/gaps",{data:{note:"forged"}})).status()).toBe(404);
  expect((await request.post("/api/management/operations",{data:{id:"forged"}})).status()).toBe(404);
  expect((await request.post("/api/management/owner",{data:{action:"sign_in"}})).status()).toBe(404);
  expect((await request.get("/api/management/workspace")).status()).toBe(404);
  expect((await request.post("/api/management/workspace", { data: { action:"save_draft" } })).status()).toBe(404);
});

test("live conversation collection is absent from the production candidate", async ({ request }) => {
  expect((await request.get("/api/conversations")).status()).toBe(404);
  expect((await request.get("/api/conversation-session")).status()).toBe(404);
  expect((await request.post("/api/conversation-session",{data:{action:"connect",consent:"30-day-storage-v1"}})).status()).toBe(404);
  expect((await request.post("/api/conversations/ask",{data:{action:"ask"}})).status()).toBe(404);
  expect((await request.post("/api/conversations", { data: {action:"append_assistant"} })).status()).toBe(404);
});
