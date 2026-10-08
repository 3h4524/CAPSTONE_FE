import { describe, expect, it } from "vitest";

import type { PromptComponents } from "@/helpers/build-effective-prompt";
import { buildEffectivePrompt } from "@/helpers/build-effective-prompt";

const components = (overrides: Partial<PromptComponents> = {}): PromptComponents => ({
  basePrompt: "",
  subject: "",
  artStyle: "",
  moodTone: "",
  negativeTerms: "",
  instructions: "",
  niche: "",
  styleModifiers: "",
  ...overrides,
});

describe("buildEffectivePrompt", () => {
  it("returns the resolved base prompt when nothing else is set", () => {
    expect(buildEffectivePrompt(components({ basePrompt: "A clean product illustration." }))).toBe(
      "A clean product illustration."
    );
  });

  it("substitutes every supported placeholder", () => {
    const prompt = buildEffectivePrompt(
      components({
        basePrompt: "A {subject} in a {style} style for the {niche} niche.",
        subject: "ceramic mug",
        artStyle: "watercolour",
        niche: "botanical",
      })
    );

    expect(prompt).toBe("A ceramic mug in a watercolour style for the botanical niche.");
  });

  it("replaces placeholders regardless of case", () => {
    const prompt = buildEffectivePrompt(
      components({
        basePrompt: "A {SUBJECT} in a {Style} style.",
        subject: "ceramic mug",
        artStyle: "watercolour",
      })
    );

    expect(prompt).toBe("A ceramic mug in a watercolour style.");
  });

  it("replaces every occurrence of a repeated placeholder", () => {
    expect(
      buildEffectivePrompt(components({ basePrompt: "{subject} and {subject}", subject: "mug" }))
    ).toBe("mug and mug");
  });

  it("replaces a placeholder with an empty value and keeps no leftover braces", () => {
    expect(buildEffectivePrompt(components({ basePrompt: "A {subject}." }))).toBe("A .");
  });

  it.each([
    ["a subject placeholder", "{subject} in {style}", "mug", "line art", "mug in line art"],
    ["a style placeholder", "{subject} in {style}", "mug", "line art", "mug in line art"],
  ] as Array<[string, string, string, string, string]>)(
    "does not repeat the %s as an extra part",
    (_label, basePrompt, subject, artStyle, expected) => {
      expect(buildEffectivePrompt(components({ basePrompt, subject, artStyle }))).toBe(expected);
    }
  );

  it("appends the subject and art style when the base prompt has no placeholders", () => {
    expect(
      buildEffectivePrompt(
        components({
          basePrompt: "A product photo.",
          subject: "ceramic mug",
          artStyle: "watercolour",
        })
      )
    ).toBe("A product photo., ceramic mug, watercolour");
  });

  it("appends only the subject when the base prompt already carries a style", () => {
    expect(
      buildEffectivePrompt(
        components({ basePrompt: "A product photo in {style}.", artStyle: "watercolour" })
      )
    ).toBe("A product photo in watercolour.");
  });

  it("skips the subject and art style when they are only whitespace", () => {
    expect(
      buildEffectivePrompt(
        components({ basePrompt: "A product photo.", subject: "  ", artStyle: " " })
      )
    ).toBe("A product photo.");
  });

  it("appends the mood tone and the instructions after the base prompt", () => {
    expect(
      buildEffectivePrompt(
        components({
          basePrompt: "A product photo.",
          moodTone: "warm",
          instructions: "keep it centred",
        })
      )
    ).toBe("A product photo., warm, keep it centred");
  });

  it("omits the mood tone and instructions that are empty", () => {
    expect(
      buildEffectivePrompt(
        components({
          basePrompt: "A product photo.",
          moodTone: "",
          instructions: "keep it centred",
        })
      )
    ).toBe("A product photo., keep it centred");
  });

  it("trims every component before joining it", () => {
    expect(
      buildEffectivePrompt(
        components({
          basePrompt: "  A product photo.  ",
          moodTone: "  warm  ",
          instructions: "  keep it centred  ",
        })
      )
    ).toBe("A product photo., warm, keep it centred");
  });

  it("joins the parts with a comma and a space", () => {
    expect(
      buildEffectivePrompt(
        components({ basePrompt: "A", subject: "B", artStyle: "C", moodTone: "D" })
      )
    ).toBe("A, B, C, D");
  });

  it("appends the style modifiers last", () => {
    expect(
      buildEffectivePrompt(
        components({
          basePrompt: "A product photo.",
          styleModifiers: "high contrast, muted palette",
        })
      )
    ).toBe("A product photo., high contrast, muted palette");
  });

  it("returns only the style modifiers when everything else is empty", () => {
    expect(buildEffectivePrompt(components({ styleModifiers: "muted palette" }))).toBe(
      "muted palette"
    );
  });

  it("appends the negative terms on their own trailing line", () => {
    expect(
      buildEffectivePrompt(
        components({ basePrompt: "A product photo.", negativeTerms: "blur, watermark" })
      )
    ).toBe("A product photo.\nNegative prompt: blur, watermark");
  });

  it("places the negative terms after the style modifiers", () => {
    expect(
      buildEffectivePrompt(
        components({
          basePrompt: "A product photo.",
          styleModifiers: "muted palette",
          negativeTerms: "blur",
        })
      )
    ).toBe("A product photo., muted palette\nNegative prompt: blur");
  });

  it("trims the negative terms before writing the label", () => {
    expect(
      buildEffectivePrompt(components({ basePrompt: "A photo.", negativeTerms: "   blur   " }))
    ).toBe("A photo.\nNegative prompt: blur");
  });

  it("keeps a leading newline when only the negative terms are set", () => {
    expect(buildEffectivePrompt(components({ negativeTerms: "blur" }))).toBe(
      "\nNegative prompt: blur"
    );
  });

  it("keeps a leading newline when only the style modifiers and negative terms are set", () => {
    expect(
      buildEffectivePrompt(components({ styleModifiers: "muted", negativeTerms: "blur" }))
    ).toBe("muted\nNegative prompt: blur");
  });

  it("skips the negative terms that are only whitespace", () => {
    expect(
      buildEffectivePrompt(components({ basePrompt: "A product photo.", negativeTerms: "   " }))
    ).toBe("A product photo.");
  });

  it.each([
    ["every component empty", {}],
    [
      "only whitespace components",
      {
        basePrompt: "   ",
        subject: "  ",
        artStyle: "\t",
        moodTone: "\n",
        instructions: " ",
        niche: " ",
        styleModifiers: " ",
        negativeTerms: " ",
      },
    ],
  ])("returns an empty string when %s", (_label, overrides) => {
    expect(buildEffectivePrompt(components(overrides))).toBe("");
  });

  it("drops a placeholder-only base prompt that resolves to nothing", () => {
    expect(
      buildEffectivePrompt(
        components({ basePrompt: "{subject} {style} {niche}", artStyle: "watercolour" })
      )
    ).toBe("watercolour");
  });

  it("substitutes the niche placeholder without adding a separate part", () => {
    expect(
      buildEffectivePrompt(components({ basePrompt: "A {niche} product.", niche: "botanical" }))
    ).toBe("A botanical product.");
  });

  it("leaves an unknown placeholder untouched", () => {
    expect(buildEffectivePrompt(components({ basePrompt: "A {unknown} product." }))).toBe(
      "A {unknown} product."
    );
  });
});
