import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: false,
  },
  images: {
    // 项目是个人站点，对极致图片优化要求不高，
    // 在 Vercel 上关闭 sharp 依赖，避免构建失败
    unoptimized: true,
  },
};

export default nextConfig;
