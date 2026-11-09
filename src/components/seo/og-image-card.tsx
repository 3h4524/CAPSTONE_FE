/* eslint-disable @next/next/no-img-element */
import { Logo } from "@/components/commons/icons/logo";
import { SITE_CONFIG } from "@/constants/site";
import { OG_IMAGE_SIZE } from "@/helpers/og-image";

type Props = {
  backgroundSrc: string;
  title?: string;
  subtitle?: string;
};

const SITE_HOST = new URL(SITE_CONFIG.baseUrl).host;

export const OgImageCard = ({ backgroundSrc, title = SITE_CONFIG.tagline, subtitle = SITE_CONFIG.pitch }: Props) => (
  <div
    style={{
      color: "#ffffff",
      display: "flex",
      fontFamily: "Space Grotesk",
      height: "100%",
      position: "relative",
      width: "100%",
    }}
  >
    <img
      alt=""
      height={OG_IMAGE_SIZE.height}
      src={backgroundSrc}
      style={{ left: 0, position: "absolute", top: 0 }}
      width={OG_IMAGE_SIZE.width}
    />
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding: "72px 0 64px 80px",
        position: "relative",
        width: 720,
      }}
    >
      <div style={{ alignItems: "center", display: "flex" }}>
        <Logo height={72} width={72} />
        <div style={{ display: "flex", fontSize: 52, fontWeight: 700, letterSpacing: -1.5, marginLeft: 20 }}>
          {SITE_CONFIG.name}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 58, fontWeight: 700, letterSpacing: -2, lineHeight: 1.08 }}>
          {title}
        </div>
        <div style={{ color: "#C4B5FD", display: "flex", fontSize: 27, fontWeight: 500, lineHeight: 1.4, marginTop: 24 }}>
          {subtitle}
        </div>
      </div>
      <div style={{ alignItems: "center", color: "#DDD6FE", display: "flex", fontSize: 24, fontWeight: 500 }}>
        <div style={{ background: "#8B5CF6", borderRadius: 6, display: "flex", height: 12, marginRight: 14, width: 12 }} />
        {SITE_HOST}
      </div>
    </div>
  </div>
);
