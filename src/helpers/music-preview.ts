const MUSIC_PREVIEW_CACHE = "apcs-music-preview-v1";

export async function loadMusicPreview(url: string, signal: AbortSignal) {
  const cache = "caches" in window ? await caches.open(MUSIC_PREVIEW_CACHE).catch(() => null) : null;
  let response = cache ? await cache.match(url) : undefined;
  if (!response) {
    response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Music preview request failed (${response.status})`);
    void cache?.put(url, response.clone()).catch(() => undefined);
  }
  const audio = await response.blob();
  if (!audio.size) throw new Error("Music preview is empty");
  return audio;
}
