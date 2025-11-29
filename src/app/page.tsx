'use client';

import Providers from '@/context/Providers';
import GameMap from '@/components/GameMap';
import LoginScreen from '@/components/LoginScreen';
import WalletButton from '@/components/WalletButton';
import CoordinatesDisplay from '@/components/CoordinatesDisplay';
import LeaderboardToggle from '@/components/LeaderboardToggle';
import CreateFaucetButton from '@/components/CreateFaucetButton';
import ShopButton from '@/components/ShopButton';
import ToastHost from '@/components/ToastHost';
import { useAccount, useChainId } from 'wagmi';
import { useEffect, useState } from 'react';
import { useUserInit } from '@/hooks/useUserInit';

const MONAD_TESTNET_CHAIN_ID = 10143;

function GameContent() {
  const [mounted, setMounted] = useState(false);
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const isOnMonadTestnet = chainId === MONAD_TESTNET_CHAIN_ID;
  const showLogin = !isConnected || !isOnMonadTestnet;

  // Initialize user data when wallet connects
  useUserInit();

  // Only render conditional content after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative w-screen h-screen">
      <ToastHost />
      {/* Map always visible in background */}
      <GameMap />
      
      {/* Purple overlay when login is required */}
      {mounted && showLogin && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-purple-800/30 to-gray-900/40 z-20 backdrop-blur-[2px] pointer-events-none">
          <div className="pointer-events-auto">
            <LoginScreen />
          </div>
        </div>
      )}

      {/* Left side controls - stacked vertically, mobile optimized */}
      {mounted && !showLogin && (
        <>
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 w-auto max-w-[calc(100vw-2rem)] sm:max-w-xs">
            {/* Wallet stats */}
          <WalletButton />
            
            {/* Coordinates display */}
            <CoordinatesDisplay />
            
            {/* Shop */}
            <ShopButton />
            
            {/* Create Faucet button */}
            <CreateFaucetButton />
            
            {/* Admin link */}
            <a
              href="/admin/faucets"
              className="bg-black/80 hover:bg-black/90 text-white px-3 py-2 rounded-lg text-sm font-semibold text-center"
            >
              🔧 Admin Panel
            </a>
          </div>
          
          {/* Right side - Leaderboard toggle */}
          <div className="absolute top-4 right-4 z-10">
            <LeaderboardToggle />
        </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Providers>
      <GameContent />
    </Providers>
  );
}
