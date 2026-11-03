import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    localPatterns: [
      // The media route validates catalog pathnames before reading private Blob.
      { pathname: '/api/catalog/media' },
      { pathname: '/**', search: '' },
    ],
  },
  experimental: { viewTransition: true },
  // Allow this Mac's LAN address to serve dev assets to an iPhone on the same Wi-Fi.
  allowedDevOrigins: ["10.0.125.216", "192.168.0.72"],
};

export default withWorkflow(nextConfig);
