'use client';

import { useEffect, useState } from 'react';

export default function SupabaseTest() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        // Use server-side API route instead of client-side Supabase client
        const response = await fetch('/api/supabase/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table: 'faucets',
            select: '*',
            limit: 1,
          }),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          throw new Error(result.error || 'Failed to query Supabase');
        }

        // Success - connection works
        setStatus('success');
      } catch (error: any) {
        // Connection failed or table doesn't exist
        setStatus('error');
        setErrorMessage(
          error?.message || 
          'Failed to connect to Supabase. Please check your configuration.'
        );
        console.error('Supabase connection error:', error);
      }
    }

    testConnection();
  }, []);

  if (status === 'loading') {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Testing Supabase connection...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-800 font-semibold">✓ Supabase Connected</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-800 font-semibold">✗ Supabase Connection Failed</p>
      {errorMessage && (
        <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
      )}
    </div>
  );
}

