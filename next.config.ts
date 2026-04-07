import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.acong.chat",
          },
        ],
        destination: "https://acong.chat/:path*",
        permanent: true,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
