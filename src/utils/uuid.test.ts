import { describe, expect, it } from "vitest";

import { uuid } from "@/utils/uuid";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuid", () => {
  it("returns a canonical v4 uuid", () => {
    expect(uuid()).toMatch(UUID_V4_PATTERN);
  });

  it("returns a lowercase hexadecimal uuid", () => {
    expect(uuid()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns a different value on every call", () => {
    const values = Array.from({ length: 1000 }, () => uuid());

    expect(new Set(values).size).toBe(1000);
    values.forEach((value) => expect(value).toMatch(UUID_V4_PATTERN));
  });

  it("keeps every uuid parseable by the URL constructor", () => {
    const parsed = new URL(`https://apcs.test/workflows/${uuid()}`);

    expect(parsed.pathname.split("/").pop()).toHaveLength(36);
  });
});
