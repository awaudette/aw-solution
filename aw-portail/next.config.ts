import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  transpilePackages: ["chart.js", "react-chartjs-2"],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // firebase-admin et ses dépendances (jose, jwks-rsa) sont des modules ESM
  // que le bundler Next.js ne peut pas inliner — on les charge à l'exécution.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
