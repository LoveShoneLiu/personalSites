import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: false,
  },
  images: {
    // 项目是个人站点，对极致图片优化要求不高，
    // 在 Vercel 上关闭 sharp 依赖，避免构建失败
    unoptimized: true,
  },
  // 修复 React 19 Suspense 边界警告
  reactStrictMode: true,
  experimental: {
    // 确保正确的异步处理
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
