import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'YAAD - AI Voice Memory Assistant',
  description: 'Jo Kabhi Nahi Bhoolta - AI Voice Memory Assistant for Indian Students',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'YAAD',
  },
  openGraph: {
    title: 'YAAD - AI Voice Memory Assistant',
    description: 'Jo Kabhi Nahi Bhoolta',
  },
};

export const viewport = {
  themeColor: '#020A2A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: '#020A2A' }}>
        {children}
      </body>
    </html>
  );
}
