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
  /** The mock-up an image is made from. */
  sourceId?: string | null;
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

export type PinterestConnectionStatus = "not_connected" | "connected" | "reconnect_required";

/** The seller's Pinterest account; `configured` is false when the server has no Pinterest app. */
export type PinterestConnection = {
  configured: boolean;
  status: PinterestConnectionStatus;
  username: string | null;
  connectedAtUtc: string | null;
  reconnectByUtc: string | null;
};

export type PinterestBoard = { id: string; name: string; privacy: string | null };

export type PinterestConnectionOutcome = "connected" | "denied" | "expired" | "failed";

export const getPinterestConnection = async () => (await api.get<PinterestConnection>("/api/social/pinterest")).data;

export const startPinterestConnection = async () =>
  (await api.post<{ authorizationUrl: string }>("/api/social/pinterest/connect")).data;

export const getPinterestBoards = async () => (await api.get<PinterestBoard[]>("/api/social/pinterest/boards")).data;

export const disconnectPinterest = async () => {
  await api.delete("/api/social/pinterest");
};
