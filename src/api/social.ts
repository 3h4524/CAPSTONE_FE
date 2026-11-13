import { api } from "@/api/client";

export type SocialPlatform = "pinterest" | "tiktok";

/** A file of a post, sized for its platform: shown from previewUrl, saved from downloadUrl. */
export type SocialMedia = {
  type: "image" | "video";
  previewUrl: string;
  downloadUrl: string;
  width: number;
  height: number;
  fileName: string;
};

/** One post to publish by hand. Title, link and alt text are Pinterest's; TikTok has none of them. */
export type SocialPost = {
  platform: SocialPlatform;
  kind: "image" | "video" | "carousel";
  media: SocialMedia[];
  title: string | null;
  caption: string;
  hashtags: string[];
  link: string | null;
  altText: string | null;
};

export type SocialShareKit = {
  productId: string;
  productName: string;
  listingUrl: string | null;
  posts: SocialPost[];
  warnings: string[];
};

export const getSocialShareKit = async (productId: string) => (await api.get<SocialShareKit>(`/api/social/kits/${productId}`)).data;
