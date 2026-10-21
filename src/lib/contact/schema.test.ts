import { describe, it, expect } from "vitest";
import {
  validateContact,
  LIMITS,
  BUDGET_RANGES,
  COMPANY_SIZES,
  ENQUIRY_TYPES,
  IMPROVEMENT_AREAS,
} from "./schema";

const valid = {
  name: "  Jane Baker ",
  email: "  Jane@Example.COM ",
  role: " Owner ",
  company: " Acme ",
  companyUrl: " acme.co.uk ",
  companySize: "2-10",
  enquiryType: "automation",
  areas: ["admin", "enquiries"],
  budget: "1000-2500",
  message: "We answer the same booking questions by email every day.",
  consent: true,
};

const minimal = {
  name: "Jane Baker",
  email: "jane@example.com",
  enquiryType: "agent",
  message: "An agent that drafts replies to our customers.",
  consent: true,
};

describe("validateContact", () => {
  it("accepts and normalises a full submission (trim + lowercase email)", () => {
    const result = validateContact(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        name: "Jane Baker",
        email: "jane@example.com",
        role: "Owner",
        company: "Acme",
        companyUrl: "acme.co.uk",
        companySize: "2-10",
        enquiryType: "automation",
        areas: ["admin", "enquiries"],
        budget: "1000-2500",
        message: "We answer the same booking questions by email every day.",
        consent: true,
      });
    }
  });

  it("needs only the essentials: name, email, need, message and consent", () => {
    const result = validateContact(minimal);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.role).toBeUndefined();
      expect(result.data.company).toBeUndefined();
      expect(result.data.companyUrl).toBeUndefined();
      expect(result.data.companySize).toBeUndefined();
      expect(result.data.budget).toBeUndefined();
      expect(result.data.areas).toEqual([]);
    }
  });

  it("treats empty optional fields as not answered", () => {
    const result = validateContact({
      ...minimal,
      role: " ",
      company: "",
      companyUrl: "",
      companySize: "",
      budget: "",
      areas: [],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing / too-short required fields", () => {
    const result = validateContact({
      ...valid,
      name: "",
      enquiryType: "",
      message: "short",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.name).toBeDefined();
      expect(result.errors.enquiryType).toBeDefined();
      expect(result.errors.message).toBeDefined();
    }
  });

  it("rejects an invalid email address", () => {
    const result = validateContact({ ...valid, email: "not-an-email" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toBeDefined();
  });

  it("refuses every enquiry value the old form sent (ADR-0033)", () => {
    for (const retired of [
      "freelance",
      "collaboration",
      "speaking",
      "partnership",
      "job",
    ]) {
      const result = validateContact({ ...valid, enquiryType: retired });
      expect(result.ok, retired).toBe(false);
      if (!result.ok) expect(result.errors.enquiryType).toBeDefined();
    }
  });

  it("refuses unlisted company sizes and budgets", () => {
    const result = validateContact({
      ...valid,
      companySize: "huge",
      budget: "£1m",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.companySize).toBeDefined();
      expect(result.errors.budget).toBeDefined();
    }
  });

  it("refuses areas that are unlisted or not a list", () => {
    for (const areas of [["admin", "crypto"], "admin", [1], { admin: true }]) {
      const result = validateContact({ ...valid, areas });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.areas).toBeDefined();
    }
  });

  it("removes repeated areas", () => {
    const result = validateContact({ ...valid, areas: ["admin", "admin", "leads"] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.areas).toEqual(["admin", "leads"]);
  });

  it("accepts ordinary web addresses for the company website", () => {
    for (const url of [
      "example.com",
      "www.example.co.uk",
      "https://example.com",
      "http://shop.example.com/about?x=1",
    ]) {
      expect(validateContact({ ...valid, companyUrl: url }).ok, url).toBe(true);
    }
  });

  it("refuses anything that is not a web address", () => {
    for (const url of [
      "javascript:alert(1)",
      "ftp://example.com",
      "not a website",
      "example",
      "mailto:a@example.com",
    ]) {
      const result = validateContact({ ...valid, companyUrl: url });
      expect(result.ok, url).toBe(false);
      if (!result.ok) expect(result.errors.companyUrl).toBeDefined();
    }
  });

  it("keeps single-line fields on one line, because they reach the subject", () => {
    const result = validateContact({
      ...valid,
      name: "Jane\r\nBcc: x@example.com",
      company: "Acme\nLtd",
      role: "Owner\t\tand founder",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Jane Bcc: x@example.com");
      expect(result.data.company).toBe("Acme Ltd");
      expect(result.data.role).toBe("Owner and founder");
    }
  });

  it("requires consent to be true", () => {
    const result = validateContact({ ...valid, consent: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.consent).toBeDefined();
  });

  it("enforces every length limit", () => {
    const result = validateContact({
      ...valid,
      name: "x".repeat(LIMITS.name + 1),
      role: "x".repeat(LIMITS.role + 1),
      company: "x".repeat(LIMITS.company + 1),
      companyUrl: `${"x".repeat(LIMITS.companyUrl)}.com`,
      message: "x".repeat(LIMITS.message + 1),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.name).toBeDefined();
      expect(result.errors.role).toBeDefined();
      expect(result.errors.company).toBeDefined();
      expect(result.errors.companyUrl).toBeDefined();
      expect(result.errors.message).toBeDefined();
    }
  });

  it("exposes the four documented needs, in the services' order", () => {
    // The SET is the server contract; the order follows the home page services.
    expect(ENQUIRY_TYPES.map((t) => t.value)).toEqual([
      "automation",
      "agent",
      "website",
      "other",
    ]);
  });

  it("exposes the approved sizes, areas and budget bands (ADR-0033)", () => {
    expect(COMPANY_SIZES.map((s) => s.value)).toEqual([
      "solo",
      "2-10",
      "11-50",
      "51-200",
      "200-plus",
    ]);
    expect(IMPROVEMENT_AREAS.map((a) => a.value)).toEqual([
      "leads",
      "enquiries",
      "admin",
      "content",
      "reports",
      "other",
    ]);
    expect(BUDGET_RANGES.map((b) => b.label)).toEqual([
      "Under £1,000",
      "£1,000–£2,500",
      "£2,500–£5,000",
      "£5,000–£10,000",
      "£10,000 or more",
      "Not sure yet",
    ]);
  });

  it("no longer asks for a subject (ADR-0033)", () => {
    const result = validateContact({ ...minimal, subject: "" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).not.toHaveProperty("subject");
  });
});
