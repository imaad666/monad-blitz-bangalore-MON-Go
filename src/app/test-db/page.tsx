'use client';

import DatabaseStatus from '@/components/DatabaseStatus';

export default function TestDBPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <DatabaseStatus />
    </div>
  );
}

