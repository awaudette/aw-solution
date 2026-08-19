import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  transpilePackages: ["chart.js", "react-chartjs-2"],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // firebase-admin et ses dépendances ESM ne peuvent pas être bundlés par Webpack.
  // Next.js 16 (Webpack) : serverExternalPackages (stable, anciennement experimental.serverComponentsExternalPackages)
  serverExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
};

export default nextConfig;
