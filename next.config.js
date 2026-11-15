/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    // Required for SSE streaming on Vercel (kept minimal)
    // appRouter: true, // using pages router for now
  },
  // Standalone output is for self-hosting (Docker or `node .next/standalone`).
  // Vercel's Next.js builder produces its own deployment output.
  output: 'standalone',
};

export default nextConfig;