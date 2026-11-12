export type IconProps = {
  width?: string | number;
  height?: string | number;
  otherProps?: { [key: string]: unknown };
  className?: string;
  color?: string;
  style?: { [key: string]: string };
};

/** One picture of a gallery that opens larger on the page instead of in a new tab. */
export interface LightboxImage {
  id: string;
  url: string;
  alt: string;
  caption: string;
  width?: number;
  height?: number;
  /** Fills the space beside the picture, so it reads as the photo's own backdrop. */
  backdrop?: string;
  /** A garment color laid over the photo through the garment mask, as the gallery thumbnail shows it. */
  tint?: { color: string; maskUrl: string };
}
