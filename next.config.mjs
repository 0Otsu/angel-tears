/** @type {import("next").NextConfig} */
const nextConfig = { images: {
  // Locales: optimizador Next. Producto remoto: loader Cloudinary, sin doble proxy.
  deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
  imageSizes: [64, 96, 128, 256, 384],
  qualities: [75],
  remotePatterns: [],
} }
export default nextConfig
