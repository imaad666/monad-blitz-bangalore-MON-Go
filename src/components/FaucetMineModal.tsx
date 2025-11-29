'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { formatEther } from 'viem';

interface Faucet {
  id: string;
  name: string;
  lat: number;
  lng: number;
  remaining_coins: number;
  contract_address?: string;
}

interface FaucetMineModalProps {
  isOpen: boolean;
  onClose: () => void;
  faucet: Faucet | null;
  userLat: number | null;
  userLng: number | null;
  onMineSuccess: () => void;
}

// Faucet Contract ABI
const FAUCET_ABI = [
  {
    inputs: [],
    name: 'mine',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'miner', type: 'address' }],
    name: 'canMine',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MINE_AMOUNT',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Mining radius in meters (50 meters = ~0.05km)
const MINING_RADIUS_METERS = 50;

// Distance calculation (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export default function FaucetMineModal({
  isOpen,
  onClose,
  faucet,
  userLat,
  userLng,
  onMineSuccess,
}: FaucetMineModalProps) {
  const { address, isConnected } = useAccount();
  const [distance, setDistance] = useState<number | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState(false);

  // Write contract for mining
  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError,
  } = useWriteContract();

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Read faucet balance
  const { data: faucetBalance } = useReadContract({
    address: faucet?.contract_address as `0x${string}` | undefined,
    abi: FAUCET_ABI,
    functionName: 'getBalance',
    enabled: !!faucet?.contract_address && isOpen,
    query: {
      refetchInterval: 5000,
    },
  });

  // Read if user can mine
  const { data: canMine } = useReadContract({
    address: faucet?.contract_address as `0x${string}` | undefined,
    abi: FAUCET_ABI,
    functionName: 'canMine',
    args: address ? [address] : undefined,
    enabled: !!faucet?.contract_address && !!address && isOpen,
  });

  // Calculate distance when modal opens
  useEffect(() => {
    if (!isOpen || !faucet || userLat === null || userLng === null) {
      return;
    }

    const dist = calculateDistance(userLat, userLng, faucet.lat, faucet.lng);
    setDistance(dist);
    setIsWithinRadius(dist <= MINING_RADIUS_METERS);
  }, [isOpen, faucet, userLat, userLng]);

  // Handle successful mining
  useEffect(() => {
    if (isSuccess) {
      onMineSuccess();
      // Keep modal open for continuous mining
    }
  }, [isSuccess, onMineSuccess]);

  const handleMine = () => {
    if (!faucet?.contract_address || !isWithinRadius || !canMine) {
      return;
    }

    writeContract({
      address: faucet.contract_address as `0x${string}`,
      abi: FAUCET_ABI,
      functionName: 'mine',
    });
  };

  if (!isOpen || !faucet) return null;

  const balanceEth = faucetBalance ? Number(formatEther(faucetBalance as bigint)) : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 bg-gray-900 text-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-purple-400">{faucet.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Distance Info */}
          <div className="mb-4 p-4 bg-black/50 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Distance from Faucet</div>
            {distance !== null ? (
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">
                  {distance.toFixed(1)} meters
                </div>
                {isWithinRadius ? (
                  <div className="text-green-400 text-sm font-semibold">✓ In Range</div>
                ) : (
                  <div className="text-red-400 text-sm font-semibold">
                    ✗ Too Far ({MINING_RADIUS_METERS}m radius required)
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500">Calculating...</div>
            )}
          </div>

          {/* Faucet Info */}
          <div className="mb-4 p-4 bg-purple-600/20 border border-purple-500/50 rounded-lg">
            <div className="text-sm text-gray-400 mb-2">Faucet Balance</div>
            <div className="text-2xl font-bold text-purple-400">
              {balanceEth.toFixed(2)} MON
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {faucet.remaining_coins} coins remaining (database)
            </div>
          </div>

          {/* Mining Info */}
          <div className="mb-6 p-4 bg-black/50 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Mine Amount</div>
            <div className="text-lg font-semibold">0.01 MON per mine</div>
            <div className="text-xs text-gray-500 mt-1">
              Cooldown: 60 seconds between mines
            </div>
          </div>

          {/* Error Messages */}
          {writeError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-sm text-red-200">
              Error: {writeError.message}
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="mb-4 p-3 bg-green-900/50 border border-green-500 rounded-lg text-sm text-green-200">
              ✓ Successfully mined 0.01 MON! Transaction: {hash?.slice(0, 10)}...
            </div>
          )}

          {/* Mine Button */}
          {faucet.contract_address ? (
            <button
              onClick={handleMine}
              disabled={!isWithinRadius || !canMine || isPending || isConfirming}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isPending || isConfirming ? (
                <>
                  <span className="animate-spin">⏳</span>
                  {isPending ? 'Confirming...' : 'Mining...'}
                </>
              ) : (
                <>
                  <span>⛏️</span>
                  Mine 0.01 MON
                </>
              )}
            </button>
          ) : (
            <div className="w-full bg-gray-700 text-gray-400 px-4 py-3 rounded-lg text-center">
              Contract not deployed yet
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

