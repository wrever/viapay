import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@viapay/sdk", "@viapay/shared", "@viapay/brand"],
};

export default nextConfig;
