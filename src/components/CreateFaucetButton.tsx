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
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-none text-sm font-semibold transition-colors shadow-lg w-full text-center"
      >
        Create Faucet
      </button>
      
      <CreateFaucetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

