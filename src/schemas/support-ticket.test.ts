import { describe, expect, it } from "vitest";
import type { ZodSafeParseResult } from "zod";

import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES } from "@/constants/support";
import {
  createSupportTicketSchema,
  replySupportTicketSchema,
} from "@/schemas/support-ticket";

const validTicket = {
  subject: "Etsy export fails",
  category: "export_publishing",
  priority: "normal",
  description: "The CSV export stalls at 80 percent and never finishes.",
};

const omitKey = <T extends object, K extends keyof T>(source: T, key: K): Omit<T, K> => {
  const { [key]: _omitted, ...rest } = source;
  return rest;
};

const issuesAt = (result: ZodSafeParseResult<unknown>) =>
  result.error?.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) ?? [];

const expectIssue = (result: ZodSafeParseResult<unknown>, path: string, message?: string) => {
  const matched = issuesAt(result).filter((issue) => issue.path === path);
  expect(result.success).toBe(false);
  expect(matched.length).toBeGreaterThan(0);
  if (message !== undefined) expect(matched.map((issue) => issue.message)).toContain(message);
};

describe("createSupportTicketSchema", () => {
  it("accepts a fully populated ticket and returns every field untouched", () => {
    const result = createSupportTicketSchema.safeParse(validTicket);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(validTicket);
  });

  it("trims the subject and the description but not the category or priority", () => {
    const result = createSupportTicketSchema.safeParse({
      ...validTicket,
      subject: "  Etsy export fails  ",
      description: "  The CSV export stalls.  ",
      category: " other ",
      priority: " low ",
    });

    expect(result.success).toBe(false);
    expectIssue(result, "category", "Select a category.");
    expectIssue(result, "priority", "Select a priority.");
  });

  it("trims the subject and the description", () => {
    const result = createSupportTicketSchema.safeParse({
      ...validTicket,
      subject: "  Etsy export fails  ",
      description: "  The CSV export stalls.  ",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.subject).toBe("Etsy export fails");
    expect(result.success && result.data.description).toBe("The CSV export stalls.");
  });

  it("drops keys the schema does not declare", () => {
    const result = createSupportTicketSchema.safeParse({ ...validTicket, attachments: ["a.png"] });

    expect(result.success).toBe(true);
    expect(result.success && Object.keys(result.data).sort()).toEqual([
      "category",
      "description",
      "priority",
      "subject",
    ]);
  });

  it.each(["subject", "category", "priority", "description"] as const)(
    "rejects a ticket without %s",
    (field) => {
      const result = createSupportTicketSchema.safeParse(omitKey(validTicket, field));

      expectIssue(result, field);
    }
  );

  it.each([
    { field: "subject", message: "Enter a short subject (at least 3 characters)." },
    { field: "description", message: "Add a little more detail (at least 10 characters)." },
  ] as const)("rejects a $field of only whitespace", ({ field, message }) => {
    const result = createSupportTicketSchema.safeParse({ ...validTicket, [field]: "   " });

    expectIssue(result, field, message);
  });

  it("accepts a three-character subject and rejects two", () => {
    const atLimit = createSupportTicketSchema.safeParse({ ...validTicket, subject: "abc" });
    const underLimit = createSupportTicketSchema.safeParse({ ...validTicket, subject: "ab" });

    expect(atLimit.success).toBe(true);
    expectIssue(underLimit, "subject", "Enter a short subject (at least 3 characters).");
  });

  it("accepts a ten-character description and rejects nine", () => {
    const atLimit = createSupportTicketSchema.safeParse({ ...validTicket, description: "0123456789" });
    const underLimit = createSupportTicketSchema.safeParse({ ...validTicket, description: "012345678" });

    expect(atLimit.success).toBe(true);
    expectIssue(underLimit, "description", "Add a little more detail (at least 10 characters).");
  });

  it.each([
    { field: "subject", max: 200 },
    { field: "description", max: 5000 },
  ] as const)("accepts $field at $max characters and rejects $max + 1", ({ field, max }) => {
    const atLimit = createSupportTicketSchema.safeParse({ ...validTicket, [field]: "x".repeat(max) });
    const overLimit = createSupportTicketSchema.safeParse({ ...validTicket, [field]: "x".repeat(max + 1) });

    expect(atLimit.success).toBe(true);
    expectIssue(overLimit, field);
  });

  it.each(SUPPORT_CATEGORIES.map(({ value, label }) => ({ value, label })))(
    "accepts the category $value",
    ({ value }) => {
      const result = createSupportTicketSchema.safeParse({ ...validTicket, category: value });

      expect(result.success).toBe(true);
      expect(result.success && result.data.category).toBe(value);
    }
  );

  it.each(["", "unknown", "Integration", "export", "export-publishing", " other "])(
    "rejects %j as a category",
    (category) => {
      const result = createSupportTicketSchema.safeParse({ ...validTicket, category });

      expectIssue(result, "category", "Select a category.");
    }
  );

  it.each(SUPPORT_PRIORITIES.map(({ value, label }) => ({ value, label })))(
    "accepts the priority $value",
    ({ value }) => {
      const result = createSupportTicketSchema.safeParse({ ...validTicket, priority: value });

      expect(result.success).toBe(true);
      expect(result.success && result.data.priority).toBe(value);
    }
  );

  it.each(["", "critical", "Low", "medium", " low "])("rejects %j as a priority", (priority) => {
    const result = createSupportTicketSchema.safeParse({ ...validTicket, priority });

    expectIssue(result, "priority", "Select a priority.");
  });

  it.each([
    { field: "subject", value: 12 },
    { field: "category", value: 12 },
    { field: "priority", value: null },
    { field: "description", value: true },
  ] as const)("rejects a $field of the wrong type", ({ field, value }) => {
    const result = createSupportTicketSchema.safeParse({ ...validTicket, [field]: value });

    expectIssue(result, field);
  });
});

describe("replySupportTicketSchema", () => {
  it("accepts a reply and returns it trimmed", () => {
    const result = replySupportTicketSchema.safeParse({ replyText: "  Restarting fixed it.  " });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ replyText: "Restarting fixed it." });
  });

  it("accepts an empty reply because only the length is constrained", () => {
    const result = replySupportTicketSchema.safeParse({ replyText: "" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.replyText).toBe("");
  });

  it("rejects a payload without replyText", () => {
    const result = replySupportTicketSchema.safeParse({});

    expectIssue(result, "replyText");
  });

  it("accepts a 5,000-character reply and rejects 5,001", () => {
    const atLimit = replySupportTicketSchema.safeParse({ replyText: "x".repeat(5000) });
    const overLimit = replySupportTicketSchema.safeParse({ replyText: "x".repeat(5001) });

    expect(atLimit.success).toBe(true);
    expectIssue(overLimit, "replyText");
  });

  it("rejects a reply of the wrong type", () => {
    const result = replySupportTicketSchema.safeParse({ replyText: 12 });

    expectIssue(result, "replyText");
  });
});