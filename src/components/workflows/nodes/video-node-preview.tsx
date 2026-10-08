"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Film } from "lucide-react";

import { useRunVideos } from "@/hooks/queries/use-run-videos";

export const VideoNodePreview = () => {
  const runId = useSearchParams().get("run");
  const { data: videos } = useRunVideos(runId);
  const video = videos?.[0];
  return <div className="relative flex aspect-video flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-slate-100 text-slate-400">
    {video?.thumbnailUrl ? <><Image src={video.thumbnailUrl} alt={`Latest video, version ${video.version}`} fill unoptimized className="object-contain" /><span className="absolute right-2 bottom-2 rounded bg-black/75 px-2 py-1 text-[11px] text-white">v{video.version} · {video.status}</span></> : <><Film className="size-7" aria-hidden="true" /><p className="text-[11px] font-medium">Preview appears after render</p></>}
  </div>;
};
