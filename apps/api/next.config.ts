import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@viapay/shared", "@viapay/stellar"],
  serverExternalPackages: ["better-sqlite3"],
  async headers() {
    return [
      {
        source: "/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Authorization, Content-Type, Idempotency-Key",
          },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
        ],
      },
    ];
  },
};

export default nextConfig;
