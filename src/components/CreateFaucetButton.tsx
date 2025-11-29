'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import CreateFaucetModal from './CreateFaucetModal';

export default function CreateFaucetButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isConnected } = useAccount();

  if (!isConnected) return null;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-green-600/80 hover:bg-green-700/80 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg"
      >
        ➕ Create Faucet
      </button>
      
      <CreateFaucetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

