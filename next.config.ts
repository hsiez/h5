import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/stadia/:path*", destination: "https://tiles.stadiamaps.com/:path*" }];
  },
};

export default withWorkflow(nextConfig);
