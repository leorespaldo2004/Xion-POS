import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AutoUpdaterToast } from '@/components/pos/auto-updater-toast';

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const _jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: 'POS System - Punto de Venta',
  description: 'Sistema de Punto de Venta moderno e intuitivo',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${_inter.variable} ${_jetbrains.variable} font-sans antialiased`}>
        {children}
        {/* listener integrado para notificaciones de actualizador en Electron */}
        <AutoUpdaterToast />
        <Analytics />
      </body>
    </html>
  )
}
