/** @type {import('next').NextConfig} */
const nextConfig = {
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
