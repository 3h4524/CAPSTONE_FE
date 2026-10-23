"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type LoadState = "loading" | "ready" | "streaming";

export const PreloadedVideo = ({ src, poster, label }: { src: string; poster?: string; label: string }) => {
  // Keep the first signed URL for this mounted video. Query refreshes can return a newly signed URL
  // for the same asset and must not restart a download that is already in progress.
  const [sourceUrl] = useState(src);
  const [playbackUrl, setPlaybackUrl] = useState<string>();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [progress, setProgress] = useState<number>();

  useEffect(() => {
    const request = new XMLHttpRequest();
    let objectUrl: string | undefined;

    const streamInstead = () => {
      setPlaybackUrl(sourceUrl);
      setLoadState("streaming");
      setProgress(undefined);
    };

    request.open("GET", sourceUrl);
    request.responseType = "blob";
    request.onprogress = event => {
      if (event.lengthComputable && event.total > 0) {
        setProgress(Math.min(100, Math.round(event.loaded / event.total * 100)));
      }
    };
    request.onload = () => {
      if (request.status < 200 || request.status >= 300 || !(request.response instanceof Blob) || request.response.size === 0) {
        streamInstead();
        return;
      }
      objectUrl = URL.createObjectURL(request.response);
      setPlaybackUrl(objectUrl);
      setProgress(100);
      setLoadState("ready");
    };
    request.onerror = streamInstead;
    request.ontimeout = streamInstead;
    request.timeout = 2 * 60_000;
    request.send();

    return () => {
      request.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceUrl]);

  return <div className="relative size-full bg-black">
    <video
      aria-label={label}
      className="size-full bg-black"
      controls={loadState !== "loading"}
      playsInline
      poster={poster}
      preload={playbackUrl ? "auto" : "none"}
      src={playbackUrl}
    >
      <track kind="captions" />
    </video>
    {loadState === "loading" && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 px-6 text-center text-white" role="status" aria-live="polite">
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium">Preparing smooth playback</p>
        <p className="text-xs text-white/75">{progress === undefined ? "Loading video…" : `${progress}% loaded`}</p>
      </div>
      <div className="h-1.5 w-full max-w-52 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
        <div className="h-full rounded-full bg-white transition-[width] duration-200" style={{ width: `${progress ?? 12}%` }} />
      </div>
    </div>}
  </div>;
};
