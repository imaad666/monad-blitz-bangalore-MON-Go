import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to initialize user data when wallet connects
 * Automatically creates/updates user record in database
 */
export function useUserInit() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConnected || !address) {
      return;
    }

    // Initialize user in database when wallet connects
    const initUser = async () => {
      try {
        const response = await fetch('/api/game/user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ address }),
        });

        if (response.ok) {
          const data = await response.json();
          // Invalidate user data query to refresh
          queryClient.invalidateQueries({ queryKey: ['userData', address] });
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        }
      } catch (error) {
        console.error('Failed to initialize user:', error);
      }
    };

    initUser();
  }, [address, isConnected, queryClient]);
}

