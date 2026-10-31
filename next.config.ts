import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { viewTransition: true },
  // Allow this Mac's LAN address to serve dev assets to an iPhone on the same Wi-Fi.
  allowedDevOrigins: ["10.0.125.216"],
};

export default withWorkflow(nextConfig);
