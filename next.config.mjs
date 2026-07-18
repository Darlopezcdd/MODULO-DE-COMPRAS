/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // PDFKit usa 'canvas' de forma opcional — lo excluimos para evitar errores de build
      config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    }
    return config;
  },
};

export default nextConfig;
// Force restart to pick up new Prisma Client
