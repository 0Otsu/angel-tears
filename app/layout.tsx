import React from "react"
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600']
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700']
});

export const metadata: Metadata = {
  title: { default: 'Angel Tears — Bijouterie en Concordia', template: '%s | Angel Tears' },
  description: 'Bijouterie y accesorios en Concordia, Entre Ríos. Conocé nuestros accesorios y la información del local.',
}

export const viewport: Viewport = {
  themeColor: '#F7F4EF',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${dmSans.variable} ${playfairDisplay.variable} font-sans antialiased`}>
        {process.env.ANGEL_TEARS_PREVIEW === "1" && <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">Vista previa local · Datos de demostración · No son registros reales de Sofi</div>}
        {children}
      </body>
    </html>
  )
}
