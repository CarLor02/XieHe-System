/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker部署使用standalone模式(支持动态路由)
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,

  images: {
    unoptimized: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  // 生产环境配置
  swcMinify: true,
  
  // 禁用遥测
  productionBrowserSourceMaps: false,
  
  // 优化配置
  compress: true,
};

module.exports = nextConfig;
