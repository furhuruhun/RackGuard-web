import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RackGuard — Admin Dashboard',
  description: 'Smart bookshelf management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className="bg-surface font-sans antialiased">{children}</body>
    </html>
  )
}
