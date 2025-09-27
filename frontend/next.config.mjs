/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    serverActions: true,
    externalDir: true,
    esmExternals: 'loose'
  },
  // Optimize for Vercel deployment
  output: 'standalone',
  images: {
    domains: [],
    unoptimized: false
  },
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      // Handle ESM externals for server-side rendering
      config.externals = [...(config.externals || []), {
        chalk: 'chalk',
      }];
    }

    // Add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      assert: false,
      http: false,
      https: false,
      url: false,
      zlib: false,
    };

    // Optimize bundle splitting for production
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              chunks: 'all',
            },
          },
        },
      };
    }

    return config;
  }
};

export default nextConfig;
