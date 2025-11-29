'use client';

import { useState, useEffect } from 'react';
import { useAccount, useDeployContract, useWaitForTransactionReceipt, useChainId, useWriteContract, useSwitchChain } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { getFaucetDeploymentBytecode } from '@/lib/deployFaucet';
import { FAUCET_ABI } from '@/lib/contracts';

const MONAD_TESTNET_CHAIN_ID = 10143;

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
  const [rewardPerMine, setRewardPerMine] = useState('0.001'); // MON per mine (0.001 default)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deployedContractAddress, setDeployedContractAddress] = useState<`0x${string}` | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [showContractInfo, setShowContractInfo] = useState(false);

  const isOnMonadTestnet = chainId === MONAD_TESTNET_CHAIN_ID;

  // Switch chain hook
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  // Deploy contract hook
  const {
    data: deployHash,
    deployContract,
    isPending: isDeploying,
    error: deployError,
  } = useDeployContract();

  // Wait for deployment transaction
  const { isLoading: isConfirmingDeploy, isSuccess: isDeploySuccess, data: deployReceipt } = useWaitForTransactionReceipt({
    hash: deployHash,
  });

  // Write contract hook for funding the deployed contract
  const {
    data: fundHash,
    writeContract: fundContract,
    isPending: isFunding,
    error: fundError,
  } = useWriteContract();

  // Wait for funding transaction
  const { isLoading: isConfirmingFund, isSuccess: isFundSuccess } = useWaitForTransactionReceipt({
    hash: fundHash,
  });

  const handleCreateFaucet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
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

    // CRITICAL: Block deployment if not on Monad Testnet
    if (!isOnMonadTestnet) {
      alert(
        '⚠️ You must be on Monad Testnet to create a faucet!\n\n' +
        'Current network: ' + (chainId === 1 ? 'Ethereum Mainnet' : `Chain ${chainId}`) + '\n' +
        'Required: Monad Testnet (Chain ID: 10143)\n\n' +
        'Please switch to Monad Testnet in your wallet first, then try again.\n\n' +
        'If Monad Testnet is not in your wallet, add it:\n' +
        '• Network Name: Monad Testnet\n' +
        '• RPC URL: https://testnet-rpc.monad.xyz\n' +
        '• Chain ID: 10143\n' +
        '• Currency Symbol: MON'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const rewardWei = parseEther(rewardPerMine);
      
      // Step 1: Deploy the Faucet contract
      let deploymentBytecode: `0x${string}`;
      try {
        deploymentBytecode = getFaucetDeploymentBytecode(rewardWei);
      } catch (error: any) {
        alert('Error: ' + error.message + '\n\nPlease compile the contract first:\n1. Install Foundry: curl -L https://foundry.paradigm.xyz | bash\n2. Run: forge build\n3. Set NEXT_PUBLIC_FAUCET_BYTECODE in .env.local');
        setIsSubmitting(false);
        return;
      }

      // Double-check we're on the right network before deploying
      if (chainId !== MONAD_TESTNET_CHAIN_ID) {
        alert('Network changed! Please ensure you are on Monad Testnet (Chain ID: 10143) and try again.');
        setIsSubmitting(false);
        return;
      }

      // Validate deployContract function exists
      if (!deployContract) {
        alert('Contract deployment function not available. Please refresh the page and try again.');
        setIsSubmitting(false);
        return;
      }

      // Deploy contract - wagmi will use the current chain from the wallet
      deployContract({
        bytecode: deploymentBytecode,
      });
    } catch (error: any) {
      console.error('Error deploying faucet:', error);
      if (error?.message?.includes('chain') || error?.message?.includes('network')) {
        alert('Network error: Please ensure you are connected to Monad Testnet (Chain ID: 10143) in your wallet.');
      } else {
        alert('Error: ' + (error.message || 'Failed to deploy faucet'));
      }
      setIsSubmitting(false);
    }
  };

  // When deployment succeeds, fund the contract
  useEffect(() => {
    if (isDeploySuccess && deployReceipt && deployReceipt.contractAddress) {
      const contractAddress = deployReceipt.contractAddress;
      setDeployedContractAddress(contractAddress);
      setShowContractInfo(true); // Show contract info
      
      // Step 2: Fund the deployed contract
      const fundingWei = parseEther(fundingAmount);
      
      // Send funds to the contract (it will accept via receive() function)
      fundContract({
        to: contractAddress,
        value: fundingWei,
      });
    }
  }, [isDeploySuccess, deployReceipt, fundingAmount, fundContract]);

  // When funding succeeds, add to database
  useEffect(() => {
    if (isFundSuccess && deployedContractAddress && userLocation && faucetName) {
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
          contract_address: deployedContractAddress,
        }),
      })
        .then(async (res) => {
          let data;
          try {
            data = await res.json();
          } catch (parseError) {
            throw new Error(`Failed to parse response: ${parseError}`);
          }
          
          if (!res.ok) {
            throw new Error(data?.error || `HTTP ${res.status}: ${res.statusText}`);
          }
          
          if (data?.error) {
            throw new Error(data.error);
          }
          
          if (!data) {
            throw new Error('Empty response from server');
          }
          
          return data;
        })
        .then((data) => {
          console.log('Faucet added to database:', data);
          
          // Validate response data
          if (!data || !data.data) {
            throw new Error('Invalid response from server: missing data');
          }
          
          // Refresh faucets list (with error handling)
          try {
            queryClient.invalidateQueries({ queryKey: ['faucets'] });
            queryClient.invalidateQueries({ queryKey: ['admin-faucets'] });
          } catch (queryError) {
            console.error('Error invalidating queries:', queryError);
            // Continue anyway
          }
          
          // Reset form
          setFaucetName('');
          setFundingAmount('0.1');
          setRewardPerMine('0.001');
          setDeployedContractAddress(null);
          setShowContractInfo(false);
          setIsSubmitting(false);
          onClose();
          alert('Faucet created and funded successfully!');
        })
        .catch((error) => {
          console.error('Error adding faucet to database:', error);
          console.error('Error stack:', error.stack);
          console.error('Error details:', {
            message: error.message,
            name: error.name,
            cause: error.cause,
          });
          
          const errorMessage = error.message || 'Unknown error';
          alert(
            `Faucet deployed and funded, but failed to add to database:\n\n${errorMessage}\n\n` +
            `Contract Address: ${deployedContractAddress}\n\n` +
            `You can manually add this faucet to the database with the contract address above.\n\n` +
            `Check the browser console for more details.`
          );
          setIsSubmitting(false);
          // Keep contract info visible so user can manually add
          setShowContractInfo(true);
        });
    }
  }, [isFundSuccess, deployedContractAddress, userLocation, faucetName, fundingAmount, rewardPerMine, queryClient, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={!(isDeploying || isConfirmingDeploy || isFunding || isConfirmingFund || isSubmitting) ? onClose : undefined}
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
          <div className="bg-red-600/20 border border-red-600 text-red-400 p-3 rounded mb-4 text-sm">
            <div className="font-bold mb-2">⚠️ Wrong Network!</div>
            <div className="mb-2">
              You must be on <strong>Monad Testnet</strong> to create a faucet.
            </div>
            <div className="text-xs text-red-300 mb-2">
              Current: {chainId === 1 ? 'Ethereum Mainnet' : `Chain ${chainId}`} | Required: Monad Testnet (10143)
            </div>
            <button
              onClick={async () => {
                try {
                  await switchChain({ chainId: MONAD_TESTNET_CHAIN_ID });
                } catch (error: any) {
                  if (error?.code === 4902 || error?.message?.includes('Unrecognized chain') || error?.message?.includes('unrecognized chain')) {
                    alert(
                      'Monad Testnet is not added to your wallet.\n\n' +
                      'Please add it manually:\n' +
                      'Network Name: Monad Testnet\n' +
                      'RPC URL: https://testnet-rpc.monad.xyz\n' +
                      'Chain ID: 10143\n' +
                      'Currency Symbol: MON\n\n' +
                      'Then switch to it and try again.'
                    );
                  } else if (error?.code === 4001) {
                    alert('Network switch was cancelled. Please switch to Monad Testnet manually.');
                  } else {
                    alert('Failed to switch network: ' + (error?.message || 'Unknown error') + '\n\nPlease switch manually in your wallet.');
                  }
                }
              }}
              disabled={isSwitchingChain}
              className="w-full mt-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {isSwitchingChain ? 'Switching Network...' : 'Switch to Monad Testnet'}
            </button>
            <div className="text-xs text-red-300 mt-2">
              💡 After switching, wait for the network indicator to update, then try creating the faucet again.
            </div>
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
              disabled={isDeploying || isConfirmingDeploy || isFunding || isConfirmingFund || isSubmitting}
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
              disabled={isDeploying || isConfirmingDeploy || isFunding || isConfirmingFund || isSubmitting}
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
              disabled={isDeploying || isConfirmingDeploy || isFunding || isConfirmingFund || isSubmitting}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
              placeholder="0.001"
            />
            <p className="text-xs text-gray-500 mt-1">
              How much MON each player gets per mine
            </p>
            <p className="text-xs text-purple-400 mt-1">
              Estimated mines: {Math.floor(parseFloat(fundingAmount || '0') / parseFloat(rewardPerMine || '1'))}
            </p>
          </div>

          {(deployError || fundError) && (
            <div className="bg-red-600/20 border border-red-600 text-red-400 p-3 rounded text-sm">
              Error: {(deployError || fundError)?.message}
            </div>
          )}

          {showContractInfo && deployedContractAddress && (
            <div className="bg-green-600/20 border border-green-600 text-green-400 p-4 rounded text-sm space-y-2">
              <div className="font-bold">✓ Contract Deployed Successfully</div>
              <div className="break-all font-mono text-xs bg-black/30 p-2 rounded">
                <div className="mb-1">Contract Address:</div>
                <div className="text-green-300">{deployedContractAddress}</div>
              </div>
              <div>
                <a
                  href={`https://testnet-explorer.monad.xyz/address/${deployedContractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline text-xs"
                >
                  🔗 View on Monad Explorer
                </a>
              </div>
              <div className="text-xs text-yellow-300 mt-2">
                💡 If database insertion failed, you can manually add this faucet using the contract address above.
              </div>
            </div>
          )}

          {(isDeploying || isConfirmingDeploy || isFunding || isConfirmingFund || isSubmitting) && (
            <div className="bg-blue-600/20 border border-blue-600 text-blue-400 p-3 rounded text-sm">
              {isDeploying && 'Please confirm contract deployment in your wallet...'}
              {isConfirmingDeploy && 'Deploying contract...'}
              {isFunding && 'Please confirm funding transaction in your wallet...'}
              {isConfirmingFund && 'Funding contract...'}
              {isSubmitting && 'Adding faucet to database...'}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeploying || isConfirmingDeploy || isFunding || isConfirmingFund || isSubmitting}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeploying || isConfirmingDeploy || isFunding || isConfirmingFund || isSubmitting || isSwitchingChain || isSwitchingNetwork || !isConnected || !userLocation || !isOnMonadTestnet}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(isDeploying || isConfirmingDeploy || isFunding || isConfirmingFund || isSubmitting || isSwitchingChain || isSwitchingNetwork) ? 'Processing...' : 'Create Faucet'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

