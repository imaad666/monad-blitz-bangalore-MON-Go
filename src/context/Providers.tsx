'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useState, useEffect } from 'react';
import { config } from '@/config/web3';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
          },
        },
      })
  );

  const [googleMapsKey, setGoogleMapsKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Google Maps API key from server-side API route
  useEffect(() => {
    async function fetchMapsKey() {
      try {
        const response = await fetch('/api/maps/key');
        if (response.ok) {
          const data = await response.json();
          setGoogleMapsKey(data.apiKey);
        } else {
          console.error('Failed to fetch Google Maps API key');
        }
      } catch (error) {
        console.error('Error fetching Google Maps API key:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMapsKey();
  }, []);

  // Show loading or error state
  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!googleMapsKey) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Missing Google Maps API Key</h1>
          <p className="text-gray-400">
            Add GOOGLE_MAPS_KEY to your .env.local file (server-side only)
          </p>
        </div>
      </div>
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <APIProvider apiKey={googleMapsKey}>{children}</APIProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
