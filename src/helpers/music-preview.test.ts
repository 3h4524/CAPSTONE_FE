import { afterEach, describe, expect, it, vi } from "vitest";

import { loadMusicPreview } from "@/helpers/music-preview";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadMusicPreview", () => {
  it("returns a cached audio blob without making a network request", async () => {
    const cache = {
      match: vi.fn().mockResolvedValue(new Response("cached audio", { headers: { "content-type": "audio/mpeg" } })),
      put: vi.fn(),
    };
    const fetchMock = vi.fn();
    vi.stubGlobal("caches", { open: vi.fn().mockResolvedValue(cache) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadMusicPreview("https://cdn.example.test/track.mp3", new AbortController().signal);

    expect(result.size).toBe(12);
    expect(result.type).toBe("audio/mpeg");
    expect(cache.match).toHaveBeenCalledWith("https://cdn.example.test/track.mp3");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches a cache miss with the caller signal and stores a clone for the next preview", async () => {
    const cache = { match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) };
    const fetchMock = vi.fn().mockResolvedValue(new Response("network audio", { headers: { "content-type": "audio/ogg" } }));
    const controller = new AbortController();
    vi.stubGlobal("caches", { open: vi.fn().mockResolvedValue(cache) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadMusicPreview("https://cdn.example.test/track.ogg", controller.signal);

    expect(result.size).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith("https://cdn.example.test/track.ogg", { signal: controller.signal });
    await vi.waitFor(() => expect(cache.put).toHaveBeenCalledWith("https://cdn.example.test/track.ogg", expect.any(Response)));
  });

  it("falls back to the network when Cache Storage cannot be opened", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("network audio", { headers: { "content-type": "audio/mpeg" } }));
    vi.stubGlobal("caches", { open: vi.fn().mockRejectedValue(new Error("storage disabled")) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadMusicPreview("https://cdn.example.test/fallback.mp3", new AbortController().signal);

    expect(result.size).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects unsuccessful responses and empty audio blobs", async () => {
    vi.stubGlobal("caches", { open: vi.fn().mockResolvedValue({ match: vi.fn().mockResolvedValue(undefined), put: vi.fn() }) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));

    await expect(loadMusicPreview("https://cdn.example.test/missing.mp3", new AbortController().signal))
      .rejects.toThrow("Music preview request failed (503)");

    vi.stubGlobal("caches", { open: vi.fn().mockResolvedValue({ match: vi.fn().mockResolvedValue(new Response(null)), put: vi.fn() }) });

    await expect(loadMusicPreview("https://cdn.example.test/empty.mp3", new AbortController().signal))
      .rejects.toThrow("Music preview is empty");
  });
});
