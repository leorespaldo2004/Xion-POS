/** @type {import('next').NextConfig} */
const nextConfig = {
  // Obliga a Next.js a generar una exportación estática en `out/`
  output: 'export',

  // Para que Electron pueda servir archivos desde disco (`file://`)
  assetPrefix: './',

  typescript: {
    ignoreBuildErrors: true,
  },

  // Desactivamos el optimizador de imágenes (no hay servidor)
  images: {
    unoptimized: true,
  },
}

export default nextConfig
