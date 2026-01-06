/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker部署使用静态导出模式(安全加固)
  output: process.env.DOCKER_BUILD === 'true' ? 'export' : undefined,

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
