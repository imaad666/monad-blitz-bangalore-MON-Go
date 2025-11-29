/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Ignore optional dependencies that might not be installed
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Ignore porto module if not found + alias shims
    config.resolve.alias = {
      ...config.resolve.alias,
      porto: false,
      '@react-native-async-storage/async-storage': require('path').resolve(__dirname, 'src/shims/asyncStorage.ts'),
    };

    return config;
  },
};

module.exports = nextConfig;

