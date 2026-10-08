import { describe, expect, it } from "vitest";

import { capitalize } from "@/helpers/text";

describe("capitalize", () => {
  const cases: Array<[string, string, string]> = [
    ["a lowercase word", "hello", "Hello"],
    ["a single lowercase letter", "a", "A"],
    ["a two-letter word", "ab", "Ab"],
    ["an already capitalized word", "Hello", "Hello"],
    ["an uppercase word", "HELLO", "HELLO"],
    ["a mixed-case word", "hELLO", "HELLO"],
    ["a multi-word phrase", "hello world", "Hello world"],
    ["a leading space", " hello", " hello"],
    ["a trailing space", "hello ", "Hello "],
    ["a leading digit", "1st place", "1st place"],
    ["a leading symbol", "-draft", "-draft"],
    ["an empty string", "", ""],
    ["a single space", " ", " "],
    ["a numeric string", "42", "42"],
    ["a lowercase unicode letter", "écoute", "Écoute"],
    ["an uppercase unicode letter", "ÉCOLE", "ÉCOLE"],
    ["a vietnamese string", "tiếng việt", "Tiếng việt"],
    ["a leading combining-mark-free emoji", "🙂 smile", "🙂 smile"],
    ["a trailing newline", "hello\n", "Hello\n"],
  ];

  it.each(cases)("capitalizes %s", (_label, value, expected) => {
    expect(capitalize(value)).toBe(expected);
  });

  it("only ever touches the first character", () => {
    expect(capitalize("do not change the rest")).toBe("Do not change the rest");
  });

  it("does not mutate the input string", () => {
    const value = "hello";

    capitalize(value);

    expect(value).toBe("hello");
  });

  it("is stable when applied twice", () => {
    expect(capitalize(capitalize("hello world"))).toBe("Hello world");
  });
});
