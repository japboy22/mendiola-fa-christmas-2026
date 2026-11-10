import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["mendiola.japs.dev", "*.japs.dev"],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "mendiola.japs.dev",
        "*.japs.dev",
        "localhost:3050",
        "127.0.0.1:3050",
      ],
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
