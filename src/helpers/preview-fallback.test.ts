import { describe, expect, it } from "vitest";

import { previewFallbackFor } from "@/helpers/preview-fallback";

const PALETTE = [
  "from-amber-200 via-orange-100 to-rose-200",
  "from-slate-200 via-slate-100 to-zinc-200",
  "from-sky-200 via-cyan-100 to-teal-100",
  "from-violet-200 via-purple-100 to-fuchsia-100",
  "from-emerald-200 via-green-100 to-lime-100",
  "from-indigo-200 via-blue-100 to-sky-100",
];

const charCodeSum = (value: string) =>
  [...value].reduce((total, char) => total + char.charCodeAt(0), 0);

describe("previewFallbackFor", () => {
  it.each([
    ["abc", "from-amber-200 via-orange-100 to-rose-200"],
    ["abcd", "from-emerald-200 via-green-100 to-lime-100"],
    ["a", "from-slate-200 via-slate-100 to-zinc-200"],
    ["b", "from-sky-200 via-cyan-100 to-teal-100"],
    ["c", "from-violet-200 via-purple-100 to-fuchsia-100"],
    ["d", "from-emerald-200 via-green-100 to-lime-100"],
    ["e", "from-indigo-200 via-blue-100 to-sky-100"],
    ["f", "from-amber-200 via-orange-100 to-rose-200"],
  ])("returns a stable gradient for %s", (id, expected) => {
    expect(previewFallbackFor(id)).toBe(expected);
  });

  it("returns the first gradient for an empty id", () => {
    expect(previewFallbackFor("")).toBe(PALETTE[0]);
  });

  it("returns only gradients from the fixed palette", () => {
    const ids = Array.from({ length: 200 }, (_unused, index) => `design-${index}`);

    ids.forEach((id) => expect(PALETTE).toContain(previewFallbackFor(id)));
  });

  it("is deterministic for the same id", () => {
    expect(previewFallbackFor("design-template-42")).toBe(previewFallbackFor("design-template-42"));
  });

  it("uses a character sum, so the order of the characters does not matter", () => {
    expect(previewFallbackFor("ab")).toBe(previewFallbackFor("ba"));
  });

  it("picks the palette entry at the sum modulo the palette size", () => {
    const ids = ["template-1", "mockup-9", "a longer identifier with spaces"];

    ids.forEach((id) =>
      expect(previewFallbackFor(id)).toBe(PALETTE[charCodeSum(id) % PALETTE.length])
    );
  });

  it("spreads ids across more than one gradient", () => {
    const ids = Array.from({ length: 50 }, (_unused, index) => `id-${index}`);

    expect(new Set(ids.map(previewFallbackFor)).size).toBeGreaterThan(1);
  });

  it("handles a unicode id", () => {
    const id = "mẫu-đơn-hàng";

    expect(previewFallbackFor(id)).toBe(PALETTE[charCodeSum(id) % PALETTE.length]);
  });

  it("distinguishes ids that only differ by case", () => {
    expect(previewFallbackFor("Design")).not.toBe(previewFallbackFor("design"));
  });
});
