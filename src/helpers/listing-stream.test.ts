import { describe, expect, it } from "vitest";

import { createListingStreamParser, parsePartialListing, toListingPreview } from "@/helpers/listing-stream";

const FULL =
  '{"title":"Watercolor Cat Mug","description":"A sleepy tabby.\\nDishwasher safe.","tags":[{"value":"cat mug","type":"primary"},{"value":"gift","type":"long_tail"}]}';

describe("parsePartialListing", () => {
  it("reads every field of a complete answer", () => {
    expect(parsePartialListing(FULL)).toEqual({
      title: "Watercolor Cat Mug",
      titleDone: true,
      description: "A sleepy tabby.\nDishwasher safe.",
      descriptionDone: true,
      tags: ["cat mug", "gift"],
    });
  });

  it("shows the title while it is still being written", () => {
    expect(parsePartialListing('{"title":"Watercolor C')).toMatchObject({
      title: "Watercolor C",
      titleDone: false,
      description: "",
      tags: [],
    });
  });

  it("keeps only the tags whose value is complete", () => {
    const partial = FULL.slice(0, FULL.indexOf('"gift"') + 3);
    expect(parsePartialListing(partial).tags).toEqual(["cat mug"]);
  });

  it("stops before an unfinished escape", () => {
    expect(parsePartialListing('{"title":"Cat \\u00').title).toBe("Cat ");
    expect(parsePartialListing('{"title":"Cat \\u00e9"}').title).toBe("Cat é");
  });

  it("caps the tags at the listing's 13", () => {
    const tags = Array.from({ length: 15 }, (_, index) => `{"value":"tag ${index}","type":"x"}`).join(",");
    expect(parsePartialListing(`{"tags":[${tags}]}`).tags).toHaveLength(13);
  });
});

describe("toListingPreview", () => {
  it("prefers the saved listing once it is done", () => {
    const preview = toListingPreview({
      productId: "p1",
      text: '{"title":"Draft',
      status: "done",
      message: null,
      listing: {
        productId: "p1",
        listingContentId: "l1",
        title: "Saved title",
        description: "Saved description",
        tags: [{ value: "saved", type: null, position: 1 }],
        versionNumber: 1,
        model: "gemini",
        createdAt: null,
      },
    });
    expect(preview).toMatchObject({ title: "Saved title", titleDone: true, tags: ["saved"] });
  });
});

describe("createListingStreamParser", () => {
  it("emits events split across chunks and keeps their ids", () => {
    const parser = createListingStreamParser();
    expect(parser.push('id: 1-0\nevent: delta\ndata: {"productId":"p1",')).toEqual([]);
    expect(parser.push('"text":"{\\"ti"}\n\nevent: end\ndata: {}\n\n')).toEqual([
      { id: "1-0", type: "delta", data: { productId: "p1", text: '{"ti' } },
      { type: "end", data: {} },
    ]);
  });

  it("drops events it does not know", () => {
    const parser = createListingStreamParser();
    expect(parser.push('event: unknown\ndata: {}\n\n')).toEqual([]);
  });
});
