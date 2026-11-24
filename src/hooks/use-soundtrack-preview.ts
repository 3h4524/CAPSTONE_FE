"use client";

import { useEffect, useMemo, useState } from "react";

import { listMusicTracks, videoWorkflowKeys } from "@/api/video-workflow";
import { loadMusicPreview } from "@/helpers/music-preview";
import type { VideoEditConfig } from "@/types/video-workflow";
import { useQuery } from "@tanstack/react-query";

export type SoundtrackPreview =
  | { status: "none" }
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; url: string };

/**
 * The soundtrack of a video, ready to play in the browser: loaded once from the music library and kept as a local object URL,
 * so playing and seeking in the preview never wait for the network. `none` when the video has no (or muted) music.
 */
export const useSoundtrackPreview = (videoEdit: VideoEditConfig | null | undefined): SoundtrackPreview => {
  const music = videoEdit?.music;
  const expectsMusic = Boolean(music && !music.muted);
  const { data: tracks = [], isPending: catalogPending } = useQuery({
    queryKey: videoWorkflowKeys.music(),
    queryFn: listMusicTracks,
    enabled: expectsMusic,
  });
  const track = useMemo(() => tracks.find((item) => item.id === music?.trackId), [music?.trackId, tracks]);
  const trackId = music?.trackId;
  const previewUrl = track?.previewUrl;
  const [prepared, setPrepared] = useState<{ trackId: string; url: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setPrepared(null);
    setFailed(false);
    if (!expectsMusic || !trackId || !previewUrl) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void loadMusicPreview(previewUrl, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPrepared({ trackId, url: objectUrl });
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [expectsMusic, trackId, previewUrl]);

  if (!expectsMusic) return { status: "none" };
  if (failed || (!catalogPending && !track)) return { status: "failed" };
  if (prepared && prepared.trackId === trackId) return { status: "ready", url: prepared.url };
  return { status: "loading" };
};
