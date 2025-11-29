'use client';

import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';

import chog from '../../assets/chog.png';
import moyaki from '../../assets/moyaki.png';
import molandak from '../../assets/molandak.png';
import mouch from '../../assets/mouch.png';
import salmonad from '../../assets/salmonad.png';
import defaultAvatar from '../../assets/default_avatar.png';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AvatarId = 'default' | 'chog' | 'moyaki' | 'molandak' | 'mouch' | 'salmonad';

const AVATARS: Array<{ id: AvatarId; name: string; price: number; src: string }> = [
  { id: 'chog', name: 'Chog', price: 100, src: (chog as unknown as { src: string }).src },
  { id: 'moyaki', name: 'Moyaki', price: 120, src: (moyaki as unknown as { src: string }).src },
  { id: 'molandak', name: 'Molandak', price: 150, src: (molandak as unknown as { src: string }).src },
  { id: 'mouch', name: 'Mouch', price: 90, src: (mouch as unknown as { src: string }).src },
  { id: 'salmonad', name: 'Salmonad', price: 110, src: (salmonad as unknown as { src: string }).src },
];

const DEFAULT_AVATAR_SRC = (defaultAvatar as unknown as { src: string }).src;

function getPurchased(): AvatarId[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('monShop.purchases');
    return raw ? (JSON.parse(raw) as AvatarId[]) : [];
  } catch {
    return [];
  }
}

function setPurchased(ids: AvatarId[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('monShop.purchases', JSON.stringify(ids));
}

function getSelected(): AvatarId {
  if (typeof window === 'undefined') return 'default';
  return (localStorage.getItem('monShop.selected') as AvatarId) || 'default';
}

function setSelected(id: AvatarId) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('monShop.selected', id);
  // Notify listeners (e.g., GameMap) to update marker immediately
  window.dispatchEvent(new StorageEvent('storage', { key: 'monShop.selected', newValue: id }));
}

export default function ShopModal({ isOpen, onClose }: ShopModalProps) {
  const { address, isConnected } = useAccount();
  const [purchased, setPurchasedState] = useState<AvatarId[]>(getPurchased());
  const [selected, setSelectedState] = useState<AvatarId>(getSelected());

  const { data: userData } = useQuery({
    queryKey: ['userData', address],
    queryFn: async () => {
      if (!address) return null;
      const response = await fetch(`/api/game/user?address=${address}`);
      if (!response.ok) return null;
      const result = await response.json();
      return result.user as { score: number };
    },
    enabled: !!address && isConnected && isOpen,
    refetchInterval: 5000,
  });

  const balance = userData?.score ?? 0;

  const canAfford = useMemo(() => {
    const map: Record<AvatarId, boolean> = { default: true, chog: false, moyaki: false, molandak: false, mouch: false, salmonad: false };
    AVATARS.forEach((a) => (map[a.id] = balance >= a.price));
    return map;
  }, [balance]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 text-white p-6 rounded-lg shadow-xl z-50 w-[calc(100vw-2rem)] max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-purple-400">Avatar Shop</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white">✕</button>
        </div>

        <div className="mb-4 text-sm">
          <div className="text-gray-400">Balance</div>
          <div className="font-semibold">{balance} MON</div>
          <div className="text-xs text-gray-500 mt-1">
            Purchases are saved on this device for now.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {AVATARS.map((item) => {
            const owned = purchased.includes(item.id);
            return (
              <div key={item.id} className="bg-white/5 rounded-lg p-3 flex flex-col items-center gap-2">
                <img src={item.src} alt={item.name} className="w-20 h-20 object-contain rounded-md" />
                <div className="text-sm font-semibold">{item.name}</div>
                <div className="text-xs text-gray-400">{item.price} MON</div>
                {!owned ? (
                  <button
                    className={`w-full px-2 py-1 rounded text-sm font-semibold ${canAfford[item.id] ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                    disabled={!canAfford[item.id]}
                    onClick={() => {
                      if (!canAfford[item.id]) return;
                      const next = Array.from(new Set([...purchased, item.id]));
                      setPurchased(next);
                      setPurchasedState(next);
                      // Optionally select immediately
                      setSelected(item.id);
                      setSelectedState(item.id);
                    }}
                  >
                    Buy
                  </button>
                ) : (
                  <button
                    className={`w-full px-2 py-1 rounded text-sm font-semibold ${selected === item.id ? 'bg-green-600 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                    onClick={() => {
                      setSelected(item.id);
                      setSelectedState(item.id);
                    }}
                  >
                    {selected === item.id ? 'Using' : 'Use'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="text-xs text-gray-400 mb-2">Current avatar</div>
          <div className="flex items-center gap-3">
            <img
              src={
                selected === 'default'
                  ? DEFAULT_AVATAR_SRC
                  : (AVATARS.find((a) => a.id === selected)?.src || DEFAULT_AVATAR_SRC)
              }
              alt="Current avatar"
              className="w-10 h-10 object-contain rounded-full bg-white/10"
            />
            <button
              className="ml-auto bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1 rounded"
              onClick={() => {
                setSelected('default');
                setSelectedState('default');
              }}
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


