"use client";

import { useMemo, useState, useEffect } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { parseEther } from 'viem';

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

const AVATARS: Array<{ id: AvatarId; name: string; priceMon: number; src: string }> = [
  { id: 'chog', name: 'Chog', priceMon: 1, src: (chog as unknown as { src: string }).src },
  { id: 'moyaki', name: 'Moyaki', priceMon: 2, src: (moyaki as unknown as { src: string }).src },
  { id: 'molandak', name: 'Molandak', priceMon: 3, src: (molandak as unknown as { src: string }).src },
  { id: 'mouch', name: 'Mouch', priceMon: 7, src: (mouch as unknown as { src: string }).src },
  { id: 'salmonad', name: 'Salmonad', priceMon: 5, src: (salmonad as unknown as { src: string }).src },
];

const DEFAULT_AVATAR_SRC = (defaultAvatar as unknown as { src: string }).src;
const SHOP_OWNER_ADDRESS = process.env.NEXT_PUBLIC_SHOP_OWNER_ADDRESS as `0x${string}` | undefined;

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
  const [pendingAvatar, setPendingAvatar] = useState<AvatarId | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const {
    data: txHash,
    sendTransaction,
    isPending: isSending,
    error: sendError,
    reset: resetSendTransaction,
  } = useSendTransaction();

  const {
    isLoading: isConfirming,
    isSuccess: isTxSuccess,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: Boolean(txHash),
    },
  });

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

  useEffect(() => {
    if (sendError) {
      setTxError(sendError?.shortMessage || sendError?.message || 'Transaction failed');
      setPendingAvatar(null);
    }
  }, [sendError]);

  useEffect(() => {
    if (isTxSuccess && pendingAvatar) {
      const next = Array.from(new Set([...purchased, pendingAvatar]));
      setPurchased(next);
      setPurchasedState(next);
      setSelected(pendingAvatar);
      setSelectedState(pendingAvatar);
      setPendingAvatar(null);
      setTxError(null);
      resetSendTransaction?.();
    }
  }, [isTxSuccess, pendingAvatar, purchased, resetSendTransaction]);

  const isProcessing = useMemo(() => {
    if (!pendingAvatar) return null;
    return {
      avatar: pendingAvatar,
      label: isConfirming ? 'Waiting for confirmation...' : 'Confirm in wallet...',
    };
  }, [pendingAvatar, isConfirming]);

  const handleBuy = (avatarId: AvatarId, priceMon: number) => {
    if (!isConnected || !address) {
      alert('Please connect your wallet before buying.');
      return;
    }

    if (!SHOP_OWNER_ADDRESS) {
      alert('Shop owner address is not configured.');
      return;
    }

    try {
      setTxError(null);
      setPendingAvatar(avatarId);
      sendTransaction({
        to: SHOP_OWNER_ADDRESS,
        value: parseEther(priceMon.toString()),
      });
    } catch (error: any) {
      console.error('Error initiating purchase:', error);
      setTxError(error?.message || 'Failed to initiate transaction');
      setPendingAvatar(null);
    }
  };

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
          <div className="text-gray-400">Collected MON (in-game)</div>
          <div className="font-semibold">{balance} MON</div>
          <div className="text-xs text-gray-500 mt-1 space-y-1">
            <p>Purchases require an on-chain MON Testnet payment. Funds go to the shop owner.</p>
            {SHOP_OWNER_ADDRESS && (
              <p className="text-[11px] text-gray-400">
                Owner: {SHOP_OWNER_ADDRESS.slice(0, 6)}...{SHOP_OWNER_ADDRESS.slice(-4)}
              </p>
            )}
          </div>
        </div>

        {isProcessing && (
          <div className="mb-4 text-sm bg-blue-500/10 border border-blue-500/40 text-blue-200 px-3 py-2 rounded">
            {isProcessing.label}
          </div>
        )}

        {txError && (
          <div className="mb-4 text-sm bg-red-600/10 border border-red-600/30 text-red-200 px-3 py-2 rounded">
            {txError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {AVATARS.map((item) => {
            const owned = purchased.includes(item.id);
            return (
              <div key={item.id} className="bg-white/5 rounded-lg p-3 flex flex-col items-center gap-2">
                <img src={item.src} alt={item.name} className="w-20 h-20 object-contain rounded-md" />
                <div className="text-sm font-semibold">{item.name}</div>
                <div className="text-xs text-gray-400">{item.priceMon} MON Test</div>
                {!owned ? (
                  <button
                    className={`w-full px-2 py-1 rounded text-sm font-semibold ${
                      pendingAvatar === item.id && (isSending || isConfirming)
                        ? 'bg-gray-700 text-gray-400 cursor-wait'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                    disabled={pendingAvatar !== null}
                    onClick={() => handleBuy(item.id, item.priceMon)}
                  >
                    {pendingAvatar === item.id && (isSending || isConfirming) ? 'Processing...' : 'Buy'}
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



