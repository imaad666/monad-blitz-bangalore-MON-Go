'use client';

import { useAccount, useChainId } from 'wagmi';
import { ConnectWallet } from './ConnectWallet';

const MONAD_TESTNET_CHAIN_ID = 10143;

export default function LoginScreen() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const isOnMonadTestnet = chainId === MONAD_TESTNET_CHAIN_ID;

  // Show wrong network message
  if (isConnected && address && !isOnMonadTestnet) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-black/90 rounded-2xl border border-red-500/30 max-w-md backdrop-blur-md shadow-2xl">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Wrong Network</h1>
          <p className="text-gray-300 mb-2">Please switch to Monad Testnet</p>
          <p className="text-sm text-gray-400 mb-6">
            Current network: Chain ID {chainId}
            <br />
            Required: Monad Testnet (Chain ID {MONAD_TESTNET_CHAIN_ID})
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Open your wallet and switch to Monad Testnet, then refresh this page.
          </p>
        </div>
      </div>
    );
  }

  // Show connect wallet screen
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <div className="text-center p-8 bg-black/90 rounded-2xl border border-purple-500/30 max-w-md backdrop-blur-md shadow-2xl">
        <h1 className="text-4xl font-bold text-purple-400 mb-2 drop-shadow-[0_0_8px_rgba(131,110,249,0.8)]">
          Monad Go
        </h1>
        <p className="text-gray-300 mb-8 text-lg">
          Connect your wallet to start hunting for loot
        </p>
        <p className="text-sm text-gray-400 mb-6">
          Make sure you're connected to <strong className="text-purple-400">Monad Testnet</strong>
        </p>
        <div className="flex justify-center">
          <ConnectWallet />
        </div>
      </div>
    </div>
  );
}

