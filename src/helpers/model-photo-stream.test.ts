import { describe, expect, it, vi } from "vitest";

import { readModelPhotoStream } from "@/helpers/model-photo-stream";

const streamOf = (...chunks: string[]) => {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start: (controller) => {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
};

const event = (type: string, data: unknown) => `id: 1-0\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`;

describe("readModelPhotoStream", () => {
  it("hands over the drawn photo first and returns the saved one", async () => {
    const steps: string[] = [];

    const photo = await readModelPhotoStream(
      streamOf(event("started", {}), event("preview", { url: "https://ideogram.ai/photo.png" }), event("saved", { id: "p1" })),
      (url) => steps.push(url)
    );

    expect(steps).toEqual(["https://ideogram.ai/photo.png"]);
    expect(photo).toEqual({ id: "p1" });
  });

  it("reads an event split across chunks", async () => {
    const whole = event("saved", { id: "p2" });

    const photo = await readModelPhotoStream(streamOf(whole.slice(0, 12), whole.slice(12)));

    expect(photo).toEqual({ id: "p2" });
  });

  it("ignores a preview link that is not https", async () => {
    const onPreview = vi.fn();

    await readModelPhotoStream(
      streamOf(event("preview", { url: "javascript:alert(1)" }), event("saved", { id: "p3" })),
      onPreview
    );

    expect(onPreview).not.toHaveBeenCalled();
  });

  it("rejects with the reason the server gave", async () => {
    await expect(
      readModelPhotoStream(streamOf(event("failed", { code: "MissingApiKey", message: "Connect an Ideogram key." })))
    ).rejects.toThrow("Connect an Ideogram key.");
  });

  it("rejects when the stream ends without a photo", async () => {
    await expect(readModelPhotoStream(streamOf(event("started", {})))).rejects.toThrow(/could not be made/i);
  });
});
