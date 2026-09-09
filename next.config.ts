import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Default Server Actions body limit is 1MB — floor plan uploads
    // (PDF/image, sent as base64) routinely exceed that. See
    // src/app/projects/actions-floorplans.ts (uploadFloorPlan).
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;
