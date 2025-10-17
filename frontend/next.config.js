/** @type {import('next').NextConfig} */
const nextConfig = {
  // 只在生产环境使用静态导出
  ...(process.env.NODE_ENV === 'production' && { output: 'export' }),

  images: {
    unoptimized: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  // 开发环境API代理配置（备用，当前客户端直接访问后端）
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      return [
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
      ];
    }
    return [];
  },

  // 允许跨域请求
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
