import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sukyoo Operations',
  description: 'Internal operations console',
  // Never let an internal console be indexed.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
