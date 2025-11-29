'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MON_TOKEN_ADDRESS } from '@/config/contracts';

interface DeployContractButtonProps {
  faucetId: string;
  faucetName: string;
  onDeployed: (contractAddress: string) => void;
}

// Faucet Factory ABI - this contract deploys new faucet contracts
// You'll need to create a factory contract or deploy directly
const FACTORY_ABI = [
  {
    inputs: [
      { name: '_monToken', type: 'address' },
      { name: '_owner', type: 'address' },
    ],
    name: 'deployFaucet',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export default function DeployContractButton({
  faucetId,
  faucetName,
  onDeployed,
}: DeployContractButtonProps) {
  const { address } = useAccount();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);

  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // For now, we'll use a manual contract address input
  // In production, you'd deploy via a factory or use CREATE2
  const handleManualInput = () => {
    const address = prompt('Enter the deployed faucet contract address:');
    if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
      onDeployed(address);
    } else if (address) {
      alert('Invalid contract address format');
    }
  };

  // TODO: Implement actual deployment via factory contract
  // For now, show manual input option
  return (
    <button
      onClick={handleManualInput}
      className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
    >
      Set Contract Address
    </button>
  );
}

