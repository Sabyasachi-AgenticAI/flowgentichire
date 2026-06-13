/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdf-parse loads test files on import; point directly to the lib
      config.resolve.alias["pdf-parse"] = new URL(
        "./node_modules/pdf-parse/lib/pdf-parse.js",
        import.meta.url
      ).pathname;
    }
    return config;
  },
};
export default nextConfig;
