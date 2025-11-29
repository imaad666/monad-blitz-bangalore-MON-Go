'use client';

import { ConnectWallet } from './ConnectWallet';
import { useAccount, useBalance } from 'wagmi';
import { useState } from 'react';
import UserProfile from './UserProfile';

const MONAD_TESTNET_CHAIN_ID = 10143;

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { data: balanceData, isLoading: isBalanceLoading } = useBalance({
    address,
    chainId: MONAD_TESTNET_CHAIN_ID,
    query: {
      enabled: Boolean(address) && isConnected,
      refetchInterval: 5000,
    },
    watch: true,
  });

  const formattedBalance =
    balanceData?.formatted !== undefined
      ? Number(balanceData.formatted).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })
      : '0.00';

  if (!isConnected) {
    return <ConnectWallet />;
  }

  return (
    <>
      <div className="bg-black/80 text-white px-3 py-2 rounded-lg w-full flex items-center justify-between gap-2">
        <div className="flex-1">
          <div className="text-xs text-gray-400">Wallet Balance (MON Test)</div>
          <div className="text-lg sm:text-xl font-bold text-purple-400">
            {isBalanceLoading ? 'Loading...' : `${formattedBalance} MON`}
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
