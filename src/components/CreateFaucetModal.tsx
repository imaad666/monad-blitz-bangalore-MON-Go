'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { MANAGER_CONTRACT_ADDRESS } from '@/config/contracts';

const MONAD_TESTNET_CHAIN_ID = 10143;

// MonadGoManager Contract ABI
const MANAGER_ABI = [
  {
    inputs: [
      { name: 'faucetId', type: 'string' },
      { name: 'rewardPerMine', type: 'uint256' },
    ],
    name: 'createFaucet',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'faucetId', type: 'string' },
      { indexed: false, name: 'creator', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'FaucetCreated',
    type: 'event',
  },
] as const;

interface CreateFaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateFaucetModal({ isOpen, onClose }: CreateFaucetModalProps) {
  const { coordinates: userLocation, error: locationError } = useCurrentLocation();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const queryClient = useQueryClient();
  const [faucetName, setFaucetName] = useState('');
  const [fundingAmount, setFundingAmount] = useState('0.1'); // MON amount to fund
  const [rewardPerMine, setRewardPerMine] = useState('0.01'); // MON per mine
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOnMonadTestnet = chainId === MONAD_TESTNET_CHAIN_ID;
  const contractAddressValid = MANAGER_CONTRACT_ADDRESS && MANAGER_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';
  const [createdFaucetId, setCreatedFaucetId] = useState<string | null>(null);

  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Generate a unique faucet ID (UUID-like)
  const generateFaucetId = () => {
    return `faucet-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  };

  const handleCreateFaucet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!isOnMonadTestnet) {
      alert('Please switch to Monad Testnet to create a faucet. Current network: ' + chainId);
      return;
    }

    if (!contractAddressValid) {
      alert('MonadGoManager contract address is not configured. Please set NEXT_PUBLIC_MANAGER_CONTRACT_ADDRESS in .env.local');
      return;
    }

    if (!userLocation) {
      alert('Location not available. Please allow location access.');
      return;
    }

    if (!faucetName.trim()) {
      alert('Please enter a faucet name');
      return;
    }

    setIsSubmitting(true);

    try {
      const faucetId = generateFaucetId();
      setCreatedFaucetId(faucetId); // Store for later use
      const fundingWei = parseEther(fundingAmount);
      const rewardWei = parseEther(rewardPerMine);

      // Step 1: Create faucet on-chain
      // The funds go to the contract, not a user address - the contract holds them securely
      writeContract({
        address: MANAGER_CONTRACT_ADDRESS as `0x${string}`,
        abi: MANAGER_ABI,
        functionName: 'createFaucet',
        args: [faucetId, rewardWei],
        value: fundingWei,
        chainId: MONAD_TESTNET_CHAIN_ID, // Explicitly specify Monad Testnet
      });
    } catch (error: any) {
      console.error('Error creating faucet:', error);
      alert('Error: ' + (error.message || 'Failed to create faucet'));
      setIsSubmitting(false);
    }
  };

  // When transaction succeeds, add to database
  useEffect(() => {
    if (isSuccess && hash && userLocation && faucetName && createdFaucetId) {
      // Add to database
      fetch('/api/admin/faucets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: faucetName,
          lat: userLocation.lat,
          lng: userLocation.lng,
          total_coins: Math.floor(parseFloat(fundingAmount) / parseFloat(rewardPerMine)),
          remaining_coins: Math.floor(parseFloat(fundingAmount) / parseFloat(rewardPerMine)),
          is_active: true,
          contract_address: MANAGER_CONTRACT_ADDRESS,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            throw new Error(data.error);
          }
          // Refresh faucets list
          queryClient.invalidateQueries({ queryKey: ['faucets'] });
          queryClient.invalidateQueries({ queryKey: ['admin-faucets'] });
          
          // Reset form
          setFaucetName('');
          setFundingAmount('0.1');
          setRewardPerMine('0.01');
          setCreatedFaucetId(null);
          setIsSubmitting(false);
          onClose();
          alert('Faucet created successfully!');
        })
        .catch((error) => {
          console.error('Error adding faucet to database:', error);
          alert('Faucet created on-chain, but failed to add to database: ' + error.message);
          setIsSubmitting(false);
          setCreatedFaucetId(null);
        });
    }
  }, [isSuccess, hash, userLocation, faucetName, fundingAmount, rewardPerMine, createdFaucetId, queryClient, onClose]);

  if (!isOpen) return null;

  const isLoading = isPending || isConfirming || isSubmitting;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 text-white p-6 rounded-lg shadow-xl z-50 w-[calc(100vw-2rem)] max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-purple-400">Create New Faucet</h2>

        {locationError && (
          <div className="bg-yellow-600/20 border border-yellow-600 text-yellow-400 p-3 rounded mb-4">
            ⚠️ {locationError}
          </div>
        )}

        {!userLocation && !locationError && (
          <div className="bg-blue-600/20 border border-blue-600 text-blue-400 p-3 rounded mb-4">
            📍 Getting your location...
          </div>
        )}

        {userLocation && (
          <div className="bg-blue-600/20 border border-blue-600 text-blue-400 p-3 rounded mb-4 text-sm">
            📍 Location: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
          </div>
        )}

        {!isOnMonadTestnet && isConnected && (
          <div className="bg-red-600/20 border border-red-600 text-red-400 p-3 rounded mb-4">
            ⚠️ Please switch to Monad Testnet (Chain ID: {MONAD_TESTNET_CHAIN_ID}). Current: {chainId}
          </div>
        )}

        {!contractAddressValid && (
          <div className="bg-red-600/20 border border-red-600 text-red-400 p-3 rounded mb-4">
            ⚠️ Contract address not configured. Please set NEXT_PUBLIC_MANAGER_CONTRACT_ADDRESS in .env.local
          </div>
        )}

        <form onSubmit={handleCreateFaucet} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Faucet Name
            </label>
            <input
              type="text"
              required
              value={faucetName}
              onChange={(e) => setFaucetName(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
              placeholder="e.g., Central Park Fountain"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Funding Amount (MON)
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              required
              value={fundingAmount}
              onChange={(e) => setFundingAmount(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
              placeholder="0.1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Total MON you want to fund this faucet with
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Reward Per Mine (MON)
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              required
              value={rewardPerMine}
              onChange={(e) => setRewardPerMine(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
              placeholder="0.01"
            />
            <p className="text-xs text-gray-500 mt-1">
              How much MON each player gets per mine
            </p>
            <p className="text-xs text-purple-400 mt-1">
              Estimated mines: {Math.floor(parseFloat(fundingAmount || '0') / parseFloat(rewardPerMine || '1'))}
            </p>
          </div>

          {writeError && (
            <div className="bg-red-600/20 border border-red-600 text-red-400 p-3 rounded text-sm">
              Error: {writeError.message}
            </div>
          )}

          {isLoading && (
            <div className="bg-blue-600/20 border border-blue-600 text-blue-400 p-3 rounded text-sm">
              {isPending && 'Please confirm the transaction in your wallet...'}
              {isConfirming && 'Waiting for transaction confirmation...'}
              {isSubmitting && 'Adding faucet to database...'}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isConnected || !userLocation || !isOnMonadTestnet || !contractAddressValid}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Faucet'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

