import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // `next start` refuses to serve the standalone bundle and warns about it, so standalone output
  // is opt-in for container builds (`BUILD_STANDALONE=true`) and off everywhere else.
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  devIndicators: false,
};

export default nextConfig;
