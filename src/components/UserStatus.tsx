'use client';

import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';

export default function UserStatus() {
  const { address, isConnected } = useAccount();

  const { data: userData } = useQuery({
    queryKey: ['userData', address],
    queryFn: async () => {
      if (!address) return null;
      const response = await fetch(`/api/game/user?address=${address}`);
      if (!response.ok) return null;
      const result = await response.json();
      return result.user;
    },
    enabled: !!address && isConnected,
    refetchInterval: 5000,
  });

  if (!isConnected || !address) {
    return null;
  }

  return (
    <div className="bg-black/80 text-white px-4 py-2 rounded-lg">
      <div className="text-xs text-gray-400">Your Status</div>
      <div className="text-sm font-semibold mt-1">
        {userData?.score || 0} MON collected
      </div>
      {userData && userData.total_claims > 0 ? (
        <div className="text-xs text-gray-500 mt-1">
          {userData.total_claims} claim{userData.total_claims !== 1 ? 's' : ''}
        </div>
      ) : (
        <div className="text-xs text-purple-400 mt-1">
          Click faucets on map to collect!
        </div>
      )}
    </div>
  );
}

