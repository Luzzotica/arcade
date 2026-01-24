/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Phaser needs to be handled as a client-side only library
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
