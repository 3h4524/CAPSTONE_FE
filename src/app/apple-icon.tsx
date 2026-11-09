import { ImageResponse } from "next/og";

import { StaticLogo } from "@/components/commons/icons/logo";
import { SITE_CONFIG } from "@/constants/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// eslint-disable-next-line import/no-default-export
export default function Icon() {
  return new ImageResponse(
    <StaticLogo bgColor={SITE_CONFIG.logoBackground} height={180} width={180} withCodeAccents={false} />,
    size
  );
}
