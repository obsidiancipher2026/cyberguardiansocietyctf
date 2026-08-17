/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@cgs-ctf/shared"],
  images: { unoptimized: true },
};

module.exports = nextConfig;
