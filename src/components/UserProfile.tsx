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
            <div className="w-12 h-12 bg-purple-600 text-white flex items-center justify-center rounded-full shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
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
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-lg font-semibold rounded-none px-3 py-1 border border-white/20"
              aria-label="Close"
            >
              Close
            </button>
          </div>

          {/* Wallet Address */}
          <div className="mb-6 p-4 bg-black/50 rounded-none border border-white/10">
            <div className="text-xs text-gray-400 mb-1">Wallet Address</div>
            <div className="text-sm font-mono break-all">
              {address}
            </div>
          </div>

          {/* Stats removed */}

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

