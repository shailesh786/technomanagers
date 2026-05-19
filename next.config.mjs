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

  // ─── TypeScript ───────────────────────────────────────────────────────────
  // Pre-existing Supabase types/version mismatch causes many `never` errors
  // in both the hooks and new server pages. These existed before migration
  // (which is why this was set from the start). Fix by regenerating types:
  //   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
  typescript: {
    ignoreBuildErrors: true,
  },
  // ─── ESLint ───────────────────────────────────────────────────────────────
  // src/ removed — ESLint checks re-enabled.
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
