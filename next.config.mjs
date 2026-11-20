/** @type {import("next").NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    const privadas = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ]
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ] },
      { source: "/admin/:path*", headers: privadas },
      { source: "/api/:path*", headers: privadas },
    ]
  },
  images: {
    // Locales: optimizador Next. Producto remoto: loader Cloudinary, sin doble proxy.
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    qualities: [75],
    remotePatterns: [],
  },
}
export default nextConfig
