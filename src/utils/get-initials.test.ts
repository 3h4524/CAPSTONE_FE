import { describe, expect, it } from "vitest";

import { getInitials } from "@/utils/get-initials";

const cases: Array<[string, string, string]> = [
  ["a first name and a last name", "Nhat Nguyen", "NN"],
  ["a lowercase first name and a last name", "nhat nguyen", "NN"],
  ["a middle name", "Ada Byron King Lovelace", "AL"],
  ["a single first name", "Nhat", "NH"],
  ["a single lowercase name", "nhat", "NH"],
  ["a single letter", "N", "N"],
  ["a single long word", "NhatNguyen", "NH"],
  ["a padded name", "   Nhat Nguyen   ", "NN"],
  ["a name with repeated inner spaces", "Nhat     Nguyen", "NN"],
  ["a name with inner newlines and tabs", "Nhat\n\tNguyen", "NN"],
  ["an empty string", "", "?"],
  ["a whitespace-only string", "   ", "?"],
  ["a newline-only string", "\n\t ", "?"],
  ["a vietnamese name", "Nguyễn Văn An", "NA"],
  ["a name with an accented first name", "Élodie Durand", "ÉD"],
  ["a name with digits", "Agent 007", "A0"],
  ["a name with a trailing hyphen", "Jean-Luc Picard", "JP"],
];

describe("getInitials", () => {
  it.each(cases)("returns the initials for %s", (_label, value, expected) => {
    expect(getInitials(value)).toBe(expected);
  });

  it("uses the first character of the first and last name", () => {
    expect(getInitials("Nhat Nguyen")).toHaveLength(2);
  });

  it("never returns a lowercase letter", () => {
    expect(getInitials("nhat nguyen")).toBe(getInitials("Nhat Nguyen").toUpperCase());
  });

  it("does not mutate the input string", () => {
    const value = "Nhat Nguyen";

    getInitials(value);

    expect(value).toBe("Nhat Nguyen");
  });
});
