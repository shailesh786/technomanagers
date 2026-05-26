/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Match Tailwind's default breakpoints so Next.js serves the right srcset size
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
        // Google icon SVG used on Sign-in buttons
        protocol: 'https',
        hostname: 'www.gstatic.com',
      },
    ],
  },

  compress: true,

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
