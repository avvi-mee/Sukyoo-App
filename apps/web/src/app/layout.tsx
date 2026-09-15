import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sukyoo',
  description: 'Sukyoo — for families, from anywhere',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
