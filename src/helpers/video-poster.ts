import type { PromoVideo } from "@/types/video-workflow";

/**
 * The picture that stands for a video in a list or on a node: its thumbnail once the file is made, and until then the first scene's
 * mock-up, which is what the video starts from. Null when neither is known.
 */
export const videoPosterUrl = (video: PromoVideo | undefined | null): string | null => {
  if (!video) return null;
  if (video.thumbnailUrl) return video.thumbnailUrl;
  const first = video.preview?.storyboard.scenes[0];
  return (first && video.preview?.sources[first.mockupId]?.url) || null;
};
