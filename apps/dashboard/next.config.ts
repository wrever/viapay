import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@viapay/shared", "@viapay/prefs", "@viapay/brand"],
};

export default nextConfig;
