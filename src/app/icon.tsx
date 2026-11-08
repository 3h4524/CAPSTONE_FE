import { ImageResponse } from "next/og";

import { Logo } from "@/components/commons/icons/logo";
import { SITE_CONFIG } from "@/constants/site";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// eslint-disable-next-line import/no-default-export
export default function Icon() {
  return new ImageResponse(
    <Logo bgColor={SITE_CONFIG.logoBackground} height={64} width={64} withCodeAccents={false} />,
    size
  );
}
