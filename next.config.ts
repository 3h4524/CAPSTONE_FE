import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  devIndicators: false,
  transpilePackages: ["@apcs/video-composition"],
};

export default nextConfig;
