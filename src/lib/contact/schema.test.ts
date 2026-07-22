import { describe, it, expect } from "vitest";
import { validateContact, LIMITS, ENQUIRY_TYPES } from "./schema";

const valid = {
  name: "  Jane Recruiter ",
  email: "  Jane@Example.COM ",
  company: " Acme ",
  enquiryType: "job",
  subject: "Frontend role",
  message: "We have an opening that fits your profile nicely.",
  consent: true,
};

describe("validateContact", () => {
  it("accepts and normalises a valid submission (trim + lowercase email)", () => {
    const result = validateContact(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Jane Recruiter");
      expect(result.data.email).toBe("jane@example.com");
      expect(result.data.company).toBe("Acme");
      expect(result.data.consent).toBe(true);
    }
  });

  it("rejects missing / too-short required fields", () => {
    const result = validateContact({
      ...valid,
      name: "",
      subject: "",
      message: "short",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.name).toBeDefined();
      expect(result.errors.subject).toBeDefined();
      expect(result.errors.message).toBeDefined();
    }
  });

  it("rejects an invalid email address", () => {
    const result = validateContact({ ...valid, email: "not-an-email" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toBeDefined();
  });

  it("rejects an unknown enquiry type", () => {
    const result = validateContact({ ...valid, enquiryType: "spam" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.enquiryType).toBeDefined();
  });

  it("requires consent to be true", () => {
    const result = validateContact({ ...valid, consent: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.consent).toBeDefined();
  });

  it("enforces the message length limit", () => {
    const result = validateContact({
      ...valid,
      message: "x".repeat(LIMITS.message + 1),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.message).toBeDefined();
  });

  it("treats company as optional", () => {
    const result = validateContact({ ...valid, company: "" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.company).toBeUndefined();
  });

  it("exposes the six documented enquiry types", () => {
    expect(ENQUIRY_TYPES.map((t) => t.value)).toEqual([
      "job",
      "freelance",
      "collaboration",
      "partnership",
      "speaking",
      "other",
    ]);
  });
});
