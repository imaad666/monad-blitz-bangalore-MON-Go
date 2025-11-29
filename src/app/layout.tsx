import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Monad Go',
  description: 'Pokemon Go style game on Monad',
  icons: {
    icon: '/favicon.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

