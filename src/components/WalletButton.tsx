'use client';

import { ConnectWallet } from './ConnectWallet';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import UserProfile from './UserProfile';

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { data: userData } = useQuery({
    queryKey: ['userData', address],
    queryFn: async () => {
      if (!address) return null;
      const response = await fetch(`/api/game/user?address=${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      const result = await response.json();
      return result.user;
    },
    enabled: !!address && isConnected,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (isConnected && address) {
    return (
      <>
        <div className="bg-black/80 text-white px-3 py-2 rounded-lg w-full flex items-center justify-between gap-2">
          <div className="flex-1">
          <div className="text-xs text-gray-400">Collected MON</div>
            <div className="text-lg sm:text-xl font-bold text-purple-400">
            {userData?.score || 0}
            </div>
          </div>
          <button
            onClick={() => setIsProfileOpen(true)}
            className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Open user profile"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </button>
        </div>
        <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      </>
    );
  }

  return null;
}
