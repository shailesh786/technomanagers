/** @type {import('next').NextConfig} */
const nextConfig = {
  //
  // ─── Images ────────────────────────────────────────────────────────────────
  // Allow next/image to optimise images served from Supabase storage.
  // Add any additional hostnames used by thumbnails / avatars here.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Google profile pictures used by OAuth avatars
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        // Google icon SVG used on Sign-in buttons (Navbar, SignInGateModal)
        protocol: 'https',
        hostname: 'www.gstatic.com',
      },
    ],
  },

  // ─── Performance ───────────────────────────────────────────────────────────
  // Compress HTML/JS responses with gzip (enabled by default on Vercel, but
  // explicit here for self-hosted fallback)
  compress: true,

  // ─── TypeScript & ESLint ───────────────────────────────────────────────────
  // Don't fail the build on type errors during the migration while src/ still
  // contains legacy Vite code. Re-enable once Phase 6 (src/ removal) is done.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
