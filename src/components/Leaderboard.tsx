'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

interface LeaderboardEntry {
  address: string;
  total_collected: number;
  total_mines: number;
  last_claim_at: string | null;
}

export default function Leaderboard() {
  const { address } = useAccount();

  // All hooks must be called unconditionally at the top level
  const { data, isLoading, error } = useQuery<{ leaderboard: LeaderboardEntry[] }>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const response = await fetch('/api/leaderboard?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Get current user's stats if connected - MUST be called unconditionally
  const { data: userData } = useQuery({
    queryKey: ['userData', address],
    queryFn: async () => {
      if (!address) return null;
      const response = await fetch(`/api/game/user?address=${address}`);
      if (!response.ok) return null;
      const result = await response.json();
      return result.user;
    },
    enabled: !!address,
    refetchInterval: 5000,
  });

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <div className="bg-black/80 text-white p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black/80 text-white p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
        <p className="text-red-400">Failed to load leaderboard</p>
      </div>
    );
  }

  // Calculate derived values (after all hooks and conditional returns)
  const leaderboard = data?.leaderboard || [];
  const userRank = address
    ? leaderboard.findIndex((entry) => entry.address?.toLowerCase() === address.toLowerCase()) + 1
    : null;
  const userOnLeaderboard = address && userRank && userRank > 0;

  return (
    <div className="bg-black/80 text-white p-4 sm:p-6 rounded-lg max-h-[600px] overflow-y-auto shadow-xl">
      <h2 className="text-xl font-bold mb-4">🏆 Leaderboard</h2>
      
      {/* Show current user's status if connected but not on leaderboard */}
      {address && !userOnLeaderboard && (
        <div className="mb-4 p-3 rounded-lg bg-purple-600/20 border border-purple-500/50">
          <div className="text-sm text-gray-300 mb-1">You're connected!</div>
          <div className="text-xs text-gray-400">
            Collect coins from faucets on the map to appear on the leaderboard.
          </div>
          {userData && userData.score === 0 && (
            <div className="mt-2 text-sm font-semibold text-purple-400">
              Current score: 0 MON
            </div>
          )}
        </div>
      )}
      
      {leaderboard.length === 0 ? (
        <div>
          {address ? (
            <div className="text-gray-400">
              <p className="mb-2">No players have collected coins yet.</p>
              <p className="text-sm text-gray-500">Click on faucet markers (purple circles with "M") on the map to collect coins!</p>
            </div>
          ) : (
            <p className="text-gray-400">No players yet. Connect your wallet and collect coins to get started!</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => {
            const isCurrentUser = address && entry.address?.toLowerCase() === address.toLowerCase();
            const rank = index + 1;
            
            return (
              <div
                key={entry.address}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isCurrentUser
                    ? 'bg-purple-600/30 border-2 border-purple-500'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-2xl font-bold w-8 text-center">
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{formatAddress(entry.address)}</div>
                    <div className="text-xs text-gray-400">
                      {entry.total_mines} claims • Last: {formatDate(entry.last_claim_at)}
                    </div>
                  </div>
                </div>
                <div className="text-xl font-bold text-purple-400">
                  {entry.total_collected} MON
                </div>
              </div>
            );
          })}
        </div>
      )}

      {userRank && userRank > 10 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-sm text-gray-400 mb-2">Your rank:</div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-purple-600/30 border-2 border-purple-500">
            <div className="font-semibold">#{userRank}</div>
            <div className="font-bold text-purple-400">
              {leaderboard[userRank - 1]?.total_collected || 0} MON
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

