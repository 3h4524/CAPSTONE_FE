import { Logo } from "@/components/commons/icons/logo";
import { SITE_CONFIG } from "@/constants/site";

type Props = {
  title?: string;
};

/**
 * Pure `next/og` `ImageResponse` JSX — no image compositing/`sharp` needed.
 * Used by `src/app/opengraph-image.tsx` and `twitter-image.tsx`. Pass a
 * `title` to differentiate the OG image for a specific route.
 */
export const OgImageCard = ({ title = SITE_CONFIG.description }: Props) => (
  <div
    style={{
      alignItems: "center",
      background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 45%, #dbeafe 100%)",
      color: "#111827",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      justifyContent: "center",
      width: "100%",
    }}
  >
    <Logo height={132} width={132} withCodeAccents={false} />
    <div
      style={{
        display: "flex",
        fontSize: 42,
        fontWeight: 750,
        letterSpacing: -1,
        marginTop: 30,
      }}
    >
      {SITE_CONFIG.name}
    </div>
    <div
      style={{
        color: "#6366f1",
        display: "flex",
        fontSize: 26,
        fontWeight: 600,
        marginTop: 16,
        maxWidth: 720,
        textAlign: "center",
      }}
    >
      {title}
    </div>
  </div>
);
