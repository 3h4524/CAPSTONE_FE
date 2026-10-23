import assert from "node:assert/strict";
import { test } from "node:test";

import { buildEffectivePrompt, customBasePrompt } from "@/helpers/build-effective-prompt";
import {
  customPromptWarnings,
  missingDesignTextWarning,
  printsExactPhrase,
  thinInputWarning,
} from "@/helpers/design-text";

test("products with next to nothing to design from are pointed out, with what happens to them", () => {
  const products = [
    { name: "Game Day", keywords: ["gift"], productDescription: null },
    { name: "Coffee Then Code", keywords: ["coffee", "coding"], productDescription: null },
    {
      name: "Wildflowers",
      keywords: [],
      productDescription: "Poppies and daisies in a loose bouquet.",
    },
  ];

  assert.equal(
    thinInputWarning(products, "ideogram"),
    "1 product has very little detail (Game Day), so Ideogram will fill in the details itself. Add keywords or a description for more control."
  );
  assert.match(thinInputWarning(products, "gemini") ?? "", /may come out generic/);
  assert.equal(thinInputWarning(products.slice(1), "gemini"), null);
});

const phraseTemplate = 'Create a {style} composition using the exact phrase "{subject}".';

test("a template prints an exact phrase only when it quotes the subject", () => {
  assert.equal(printsExactPhrase(phraseTemplate), true);
  assert.equal(printsExactPhrase('Use the phrase "{{ subject }}".'), true);
  assert.equal(printsExactPhrase("A watercolor of {subject}."), false);
  assert.equal(printsExactPhrase(null), false);
});

test("a lettering template warns about the products without design text", () => {
  const warning = missingDesignTextWarning(phraseTemplate, [
    { name: "Coffee Then Code", designText: null },
    { name: "Vintage Fishing Club", designText: "  " },
    { name: "Game Day", designText: "GAME DAY VIBES" },
  ]);

  assert.equal(
    warning,
    "2 products have no design text for this lettering template (Coffee Then Code, Vintage Fishing Club), so the product name will be printed instead."
  );
});

test("a long list of products without design text is cut short", () => {
  const products = ["A", "B", "C", "D", "E"].map((name) => ({ name, designText: undefined }));

  assert.match(missingDesignTextWarning(phraseTemplate, products) ?? "", /\(A, B, C and 2 more\)/);
});

test("no warning when every product has design text or the template prints no phrase", () => {
  assert.equal(
    missingDesignTextWarning(phraseTemplate, [{ name: "Game Day", designText: "GO TEAM" }]),
    null
  );
  assert.equal(
    missingDesignTextWarning("A watercolor of {subject}.", [
      { name: "Wildflowers", designText: null },
    ]),
    null
  );
});

test("a product with its own image prompt prints no product name, and is thin only when its prompt is short", () => {
  const products = [
    {
      name: "Fox",
      keywords: [],
      productDescription: null,
      designText: null,
      customPrompt: "A red fox curled up asleep under a snowy pine tree.",
    },
    {
      name: "Owl",
      keywords: [],
      productDescription: null,
      designText: null,
      customPrompt: "An owl.",
    },
  ];

  assert.equal(missingDesignTextWarning(phraseTemplate, products), null);
  assert.match(
    thinInputWarning(products, "ideogram") ?? "",
    /^1 product has very little detail \(Owl\)/
  );
});

test("the preview of a product's own prompt adds the words to print as the server does", () => {
  const preview = (subject: string) =>
    buildEffectivePrompt({
      basePrompt: customBasePrompt("A bold mountain badge at sunrise.", subject),
      subject,
      artStyle: "",
      moodTone: "",
      negativeTerms: "",
      instructions: "",
      niche: "",
      styleModifiers: "",
    });

  assert.equal(
    preview("GO HIGHER"),
    'A bold mountain badge at sunrise. The design prints the exact phrase "GO HIGHER".'
  );
  assert.equal(preview(""), "A bold mountain badge at sunrise.");
});

test("an image prompt that asks for words other than the design text, or a background on a garment, is pointed out", () => {
  assert.deepEqual(customPromptWarnings('A surf van with the words "Beach Vibes".', "", "mug"), [
    "Words in quotes are not printed. Put the words to print in Design text.",
  ]);
  assert.deepEqual(
    customPromptWarnings("A surf van with “Salt Life” and “1985”.", "Salt Life", "mug"),
    ["Only the Design text is printed; other words in quotes are left out."]
  );
  assert.deepEqual(customPromptWarnings("A surf van on a beach background.", "", "tshirt"), [
    "T-shirt, hoodie and tote bag prints have no background: a background you describe may be drawn into the artwork itself. Describe it as part of the scene instead.",
  ]);
  assert.deepEqual(
    customPromptWarnings(
      'A surf van with "Salt Life" on a beach background.',
      "salt life",
      "poster"
    ),
    []
  );
  assert.deepEqual(customPromptWarnings("", "Salt Life", "tshirt"), []);
});
