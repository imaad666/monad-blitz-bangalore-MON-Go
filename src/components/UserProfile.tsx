'use client';

import { useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useQuery } from '@tanstack/react-query';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

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

  const handleDisconnect = () => {
    disconnect();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Splash Modal */}
      <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 bg-gray-900 text-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-purple-400">User Profile</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Wallet Address */}
          <div className="mb-6 p-4 bg-black/50 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Wallet Address</div>
            <div className="text-sm font-mono break-all">
              {address}
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-purple-600/20 border border-purple-500/50 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Total MON Collected</div>
              <div className="text-3xl font-bold text-purple-400">
                {userData?.score || 0}
              </div>
            </div>

            <div className="p-4 bg-purple-600/20 border border-purple-500/50 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Faucets Visited</div>
              <div className="text-3xl font-bold text-purple-400">
                {userData?.faucets_visited || 0}
              </div>
            </div>

            <div className="p-4 bg-black/50 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Total Claims</div>
              <div className="text-xl font-semibold">
                {userData?.total_claims || 0}
              </div>
            </div>
          </div>

          {/* Disconnect Button */}
          <button
            onClick={handleDisconnect}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    </>
  );
}

