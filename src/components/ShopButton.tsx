'use client';

import { useState } from 'react';
import ShopModal from './ShopModal';
import { useAccount } from 'wagmi';

export default function ShopButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { isConnected } = useAccount();

  if (!isConnected) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-purple-600/80 hover:bg-purple-700/80 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg"
      >
        🛒 Shop
      </button>

      <ShopModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}


