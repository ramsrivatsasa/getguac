/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent webpack from bundling these — they rely on workers/WASM that must run as native Node.js
  serverExternalPackages: ['tesseract.js', 'pdf-parse'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
}

export default nextConfig
