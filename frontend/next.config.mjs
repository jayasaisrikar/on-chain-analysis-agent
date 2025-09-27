/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
    externalDir: true,
    esmExternals: 'loose'
  },
  webpack: (config, { isServer }) => {
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

    return config;
  }
};

export default nextConfig;
