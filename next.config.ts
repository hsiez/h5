import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/loadout', destination: '/things', permanent: true }];
  },
  async rewrites() {
    return [{ source: "/stadia/:path*", destination: "https://tiles.stadiamaps.com/:path*" }];
  },
};

export default withWorkflow(nextConfig);
