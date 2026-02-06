/** @type {import('next').NextConfig} */
const nextConfig = {
  // 使用静态导出模式 - 不需要Node.js运行时，更安全
  output: 'export',
  
  // 静态导出时禁用图片优化（或使用unoptimized）
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
