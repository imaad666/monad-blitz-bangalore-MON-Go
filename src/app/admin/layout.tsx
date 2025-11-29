'use client';

import Providers from '@/context/Providers';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}

