import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@viapay/shared", "@viapay/prefs", "@viapay/brand"],
  async headers() {
    return [
      {
        // SEP-0001: wallets/anchors must fetch stellar.toml cross-origin
        source: "/.well-known/stellar.toml",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=60" },
        ],
      },
    ];
  },
};

export default nextConfig;
