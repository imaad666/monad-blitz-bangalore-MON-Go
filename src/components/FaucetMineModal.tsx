'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { formatEther, parseEther, decodeEventLog } from 'viem';
import { FAUCET_ABI } from '@/lib/contracts';
import { useQueryClient } from '@tanstack/react-query';

interface Faucet {
  id: string;
  name: string;
  lat: number;
  lng: number;
  remaining_coins: number;
  total_coins?: number;
  is_active?: boolean;
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
  const queryClient = useQueryClient();
  const publicClient = usePublicClient();
  const [distance, setDistance] = useState<number | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number>(0); // Pending claim amount in MON
  const [isMining, setIsMining] = useState(false); // For mine button loading state

  // Write contract for claiming
  const {
    data: claimHash,
    writeContract: claimContract,
    isPending: isClaiming,
    error: claimError,
  } = useWriteContract();

  // Wait for claim transaction
  const { isLoading: isConfirmingClaim, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  // Read faucet balance
  const {
    data: faucetBalance,
    error: balanceError,
    isLoading: isLoadingBalance
  } = useReadContract({
    address: (faucet?.contract_address && faucet.contract_address.startsWith('0x') && faucet.contract_address.length === 42)
      ? (faucet.contract_address as `0x${string}`)
      : undefined,
    abi: FAUCET_ABI,
    functionName: 'getBalance',
    query: {
      enabled: !!faucet?.contract_address &&
        !!faucet.contract_address.startsWith('0x') &&
        faucet.contract_address.length === 42 &&
        isOpen,
      refetchInterval: 5000,
      retry: 3,
    },
  });

  // Read mine amount
  const { data: mineAmount } = useReadContract({
    address: (faucet?.contract_address && faucet.contract_address.startsWith('0x') && faucet.contract_address.length === 42)
      ? (faucet.contract_address as `0x${string}`)
      : undefined,
    abi: FAUCET_ABI,
    functionName: 'MINE_AMOUNT',
    query: {
      enabled: !!faucet?.contract_address &&
        !!faucet.contract_address.startsWith('0x') &&
        faucet.contract_address.length === 42 &&
        isOpen,
    },
  });

  // Fetch pending amount from database when modal opens
  useEffect(() => {
    if (isOpen && faucet?.id && address) {
      fetch(`/api/game/faucets/pending?faucet_id=${faucet.id}&user_address=${address}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.pending_amount) {
            setPendingAmount(data.pending_amount);
          }
        })
        .catch((error) => {
          console.error('Error fetching pending amount:', error);
        });
    } else {
      setPendingAmount(0);
    }
  }, [isOpen, faucet?.id, address]);

  // Calculate distance when modal opens
  useEffect(() => {
    if (!isOpen || !faucet || userLat === null || userLng === null) {
      return;
    }

    const dist = calculateDistance(userLat, userLng, faucet.lat, faucet.lng);
    setDistance(dist);
    setIsWithinRadius(dist <= MINING_RADIUS_METERS);
  }, [isOpen, faucet, userLat, userLng]);

  // Handle successful claim - sync with database and update user stats
  useEffect(() => {
    if (isClaimSuccess && claimHash && faucet?.id && address && publicClient) {
      // Fetch the actual claimed amount from the transaction receipt
      const processClaim = async () => {
        try {
          // Read the transaction receipt to get the actual claimed amount from the Claimed event
          let actualClaimedAmount = 0;
          try {
            const receipt = await publicClient.getTransactionReceipt({ hash: claimHash });
            // Find the Claimed event in the logs
            for (const log of receipt.logs) {
              try {
                const decoded = decodeEventLog({
                  abi: FAUCET_ABI,
                  data: log.data,
                  topics: log.topics,
                });
                if (decoded.eventName === 'Claimed') {
                  actualClaimedAmount = Number(formatEther(decoded.args.amount as bigint));
                  console.log('Found Claimed event:', { amount: actualClaimedAmount, claimer: decoded.args.claimer });
                  break;
                }
              } catch (e) {
                // Not the Claimed event, continue
              }
            }
          } catch (error) {
            console.error('Error reading transaction receipt:', error);
          }

          // Fallback to pending amount from DB if we couldn't read from receipt
          // IMPORTANT: If event shows 0, use the pending amount from DB (the amount we tried to claim)
          if (actualClaimedAmount === 0) {
            console.warn('⚠️ Claimed event shows 0, fetching pending amount from DB as fallback');
            const pendingResponse = await fetch(`/api/game/faucets/pending?faucet_id=${faucet.id}&user_address=${address}`);
            const pendingData = await pendingResponse.json();
            if (pendingData.success && pendingData.pending_amount) {
              actualClaimedAmount = Number(pendingData.pending_amount);
              console.log('✅ Using pending amount from DB:', actualClaimedAmount);
            } else {
              // Last resort: use state value
              actualClaimedAmount = pendingAmount;
              console.warn('⚠️ Using pending amount from state:', actualClaimedAmount);
            }
          }

          console.log('Processing claim:', {
            actualClaimedAmount,
            pendingAmount,
            claimHash,
            fromReceipt: actualClaimedAmount > 0
          });

          if (actualClaimedAmount <= 0) {
            console.warn('Claim succeeded but no amount found in receipt or DB');
            alert('⚠️ Claim transaction succeeded but no amount was found. Please check your wallet balance.');
            // Still sync and refresh
            queryClient.invalidateQueries({ queryKey: ['faucets'] });
            queryClient.invalidateQueries({ queryKey: ['userData', address] });
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
            setPendingAmount(0);
            return;
          }

          // Clear pending amount in state
          setPendingAmount(0);

          // Step 1: Record the claim in database (updates user stats, faucet remaining_coins, and leaderboard)
          const claimResponse = await fetch('/api/game/faucets/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              faucet_id: faucet.id,
              user_address: address,
              claimed_amount: actualClaimedAmount,
            }),
          });

          const claimData = await claimResponse.json();

          if (claimData.error) {
            console.error('Error recording claim:', claimData.error);
            alert('Claim succeeded on-chain but failed to update database: ' + claimData.error);
          } else {
            console.log('Claim recorded successfully:', claimData);
          }

          // Step 2: Clear pending claim from DB
          try {
            await fetch('/api/game/faucets/mine', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                faucet_id: faucet.id,
                user_address: address,
              }),
            });
          } catch (error) {
            console.error('Error clearing pending claim:', error);
          }

          // Step 3: Sync contract balance with database (updates remaining_coins based on actual contract balance)
          try {
            const syncResponse = await fetch('/api/game/faucets/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                faucet_id: faucet.id,
                contract_address: faucet.contract_address,
              }),
            });

            const syncData = await syncResponse.json();
            if (syncData.error) {
              console.error('Error syncing faucet:', syncData.error);
            } else {
              console.log('Faucet synced successfully:', syncData);
            }
          } catch (error) {
            console.error('Error syncing faucet:', error);
          }

          // Refresh all queries
          queryClient.invalidateQueries({ queryKey: ['faucets'] });
          queryClient.invalidateQueries({ queryKey: ['userData', address] });
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
          queryClient.invalidateQueries({ queryKey: ['pending', faucet.id, address] });

          onMineSuccess();

          // Show success message
          alert(`✅ Successfully claimed ${actualClaimedAmount.toFixed(4)} MON!`);
        } catch (error) {
          console.error('Error processing claim:', error);
          alert('Claim succeeded on-chain but error processing: ' + (error as Error).message);
          // Still refresh queries
          queryClient.invalidateQueries({ queryKey: ['faucets'] });
          queryClient.invalidateQueries({ queryKey: ['userData', address] });
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
          setPendingAmount(0);
        }
      };

      processClaim();
    }
  }, [isClaimSuccess, claimHash, faucet?.id, faucet?.contract_address, address, queryClient, onMineSuccess, publicClient]);

  // Handle mine button click - increments pending amount and updates DB immediately
  const handleMine = async () => {
    if (!faucet?.id || !address || !isWithinRadius) {
      if (!isWithinRadius) {
        alert(`You're too far from this faucet. You need to be within ${MINING_RADIUS_METERS} meters.`);
      }
      return;
    }

    if (!faucet.contract_address) {
      alert('Contract not deployed yet');
      return;
    }

    // Get contract balance (from blockchain) - for display only
    // formatEther works with any 18-decimal token (MON has 18 decimals)
    const balanceMON = faucetBalance ? Number(formatEther(faucetBalance as bigint)) : 0;
    const mineAmountMON = mineAmount ? Number(formatEther(mineAmount as bigint)) : 0.001;

    // Calculate DB balance: remaining_coins * mine_amount = total MON available
    // DB is the source of truth for available mines
    const dbBalanceMON = (faucet.remaining_coins || 0) * mineAmountMON;

    // ALWAYS use DB balance for mining checks - DB is the source of truth
    // Contract balance will be checked when claiming (on-chain transaction)
    const effectiveBalance = dbBalanceMON;

    // Log for debugging
    console.log('Mining check:', {
      contractBalanceMON: balanceMON,
      dbBalanceMON: dbBalanceMON,
      effectiveBalance,
      mineAmountMON: mineAmountMON,
      balanceError: balanceError?.message,
      isLoadingBalance,
      remaining_coins: faucet.remaining_coins,
      contractAddress: faucet.contract_address,
      usingDbBalance: true, // Always using DB for mining
    });

    // Check if faucet has enough balance (based on DB)
    if (effectiveBalance < mineAmountMON || !faucet.remaining_coins || faucet.remaining_coins <= 0) {
      alert(
        `❌ Faucet has insufficient balance.\n\n` +
        `Database shows: ${faucet.remaining_coins || 0} coins remaining (${dbBalanceMON.toFixed(4)} MON)\n` +
        `Required: ${mineAmountMON.toFixed(4)} MON per mine\n\n` +
        `Contract balance: ${balanceMON.toFixed(4)} MON (for reference)\n\n` +
        `Please sync the balance or fund the contract if needed.`
      );
      return;
    }

    // Warn user if contract balance is 0 but DB shows coins (contract needs funding for claiming)
    if (balanceMON === 0 && dbBalanceMON > 0) {
      console.warn(
        `⚠️ Contract balance is 0 MON but DB shows ${faucet.remaining_coins} coins. ` +
        `Mining will work, but claiming will fail until contract is funded at: ${faucet.contract_address}`
      );
    }

    // Check if adding this mine would exceed faucet balance
    if (pendingAmount + mineAmountMON > effectiveBalance) {
      alert(
        `Cannot mine. Pending amount (${pendingAmount.toFixed(4)} MON) + mine amount (${mineAmountMON.toFixed(4)} MON) exceeds faucet balance (${effectiveBalance.toFixed(4)} MON)`
      );
      return;
    }

    setIsMining(true);

    try {
      // Update pending amount in database immediately
      const response = await fetch('/api/game/faucets/mine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faucet_id: faucet.id,
          user_address: address,
          mine_amount: mineAmountMON,
        }),
      });

      const data = await response.json();

      if (data.error) {
        alert('Error: ' + data.error);
        setIsMining(false);
        return;
      }

      // Update local state
      setPendingAmount(data.pending_amount);

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['faucets'] });
      queryClient.invalidateQueries({ queryKey: ['userData', address] });

    } catch (error: any) {
      console.error('Error mining:', error);
      alert('Error: ' + (error.message || 'Failed to mine'));
    } finally {
      setIsMining(false);
    }
  };

  // Handle claim button click - claims accumulated amount from contract
  const handleClaim = async () => {
    if (!faucet?.contract_address || !address) {
      return;
    }

    // Fetch latest pending amount from database to ensure we have the correct value
    // CRITICAL: Always fetch from DB, don't rely on state
    let latestPendingAmount = 0;
    try {
      const response = await fetch(`/api/game/faucets/pending?faucet_id=${faucet.id}&user_address=${address}`);
      const data = await response.json();
      console.log('🔍 Fetched pending amount from DB:', data);

      if (data.success) {
        const dbAmount = data.pending_amount;
        if (dbAmount !== undefined && dbAmount !== null && dbAmount !== '') {
          latestPendingAmount = Number(dbAmount);
          console.log('✅ Using pending amount from DB:', latestPendingAmount);
          setPendingAmount(latestPendingAmount); // Update state with latest value
        } else {
          console.warn('⚠️ DB returned null/undefined/empty pending_amount:', dbAmount);
          latestPendingAmount = 0;
        }
      } else {
        console.error('❌ DB fetch failed:', data.error || 'Unknown error');
        latestPendingAmount = 0;
      }
    } catch (error) {
      console.error('❌ Error fetching pending amount:', error);
      latestPendingAmount = 0;
    }

    console.log('📊 Pending amount summary:', {
      fromState: pendingAmount,
      fromDB: latestPendingAmount,
      final: latestPendingAmount,
      willProceed: latestPendingAmount > 0,
    });

    // Validate pending amount - CRITICAL: Don't allow claiming 0
    if (latestPendingAmount <= 0) {
      alert(
        `❌ No pending amount to claim!\n\n` +
        `Pending amount from DB: ${latestPendingAmount}\n` +
        `Pending amount from state: ${pendingAmount}\n\n` +
        `Please mine first to accumulate tokens before claiming.`
      );
      console.error('Claim blocked: pending amount is 0', {
        latestPendingAmount,
        pendingAmount,
        faucetId: faucet.id,
        userAddress: address,
      });
      return;
    }

    // Double-check: if amount is still 0 after validation, block
    if (latestPendingAmount <= 0 || isNaN(latestPendingAmount)) {
      alert('Invalid pending amount. Please refresh and try again.');
      return;
    }

    // Get contract balance (for display/warning only)
    // formatEther works with any 18-decimal token (MON has 18 decimals)
    const balanceMON = faucetBalance ? Number(formatEther(faucetBalance as bigint)) : 0;

    // Calculate DB balance: remaining_coins * mine_amount = total MON available
    // DB is the source of truth for available mines
    const mineAmountMON = mineAmount ? Number(formatEther(mineAmount as bigint)) : 0.001;
    const dbBalanceMON = (faucet.remaining_coins || 0) * mineAmountMON;

    console.log('Claim check:', {
      contractBalanceMON: balanceMON,
      dbBalanceMON: dbBalanceMON,
      pendingAmount: latestPendingAmount,
      remaining_coins: faucet.remaining_coins,
      contractAddress: faucet.contract_address,
      canProceed: dbBalanceMON >= latestPendingAmount,
    });

    // ALWAYS use DB balance as source of truth for claim checks
    // Only block if DB shows insufficient balance
    if (dbBalanceMON < latestPendingAmount) {
      alert(
        `❌ Insufficient balance to claim.\n\n` +
        `Pending: ${latestPendingAmount.toFixed(4)} MON\n` +
        `Available (DB): ${dbBalanceMON.toFixed(4)} MON (${faucet.remaining_coins} coins)\n` +
        `Contract balance: ${balanceMON.toFixed(4)} MON (for reference)\n\n` +
        `Please mine more or wait for the faucet to be funded.`
      );
      return;
    }

    // Warn if contract balance is 0 but DB shows coins available
    // Still allow claim - blockchain will reject if contract truly has no funds
    if (balanceMON === 0 && dbBalanceMON > 0) {
      const proceed = confirm(
        `⚠️ Warning: Contract balance reads 0 MON on Monad Testnet blockchain, but database shows ${faucet.remaining_coins} coins (${dbBalanceMON.toFixed(4)} MON) available.\n\n` +
        `Possible reasons:\n` +
        `- Contract was not funded yet\n` +
        `- Funding transaction failed\n` +
        `- RPC/network issue\n\n` +
        `Do you want to proceed with the claim?\n\n` +
        `⚠️ The transaction will FAIL on-chain if the contract has no balance.\n\n` +
        `Contract: ${faucet.contract_address}\n\n` +
        `To fund the contract, send MON to the address above on Monad Testnet.`
      );

      if (!proceed) {
        return;
      }
    }

    // Validate contract address before calling
    if (!faucet.contract_address ||
      !faucet.contract_address.startsWith('0x') ||
      faucet.contract_address.length !== 42) {
      alert('Invalid contract address');
      return;
    }

    // Claim the accumulated amount
    if (!claimContract) {
      alert('Contract write function not available. Please try again.');
      return;
    }

    // Convert to wei and validate - CRITICAL: Must be > 0
    // Ensure latestPendingAmount is a valid positive number
    const numericPendingAmount = Number(latestPendingAmount);
    if (isNaN(numericPendingAmount) || numericPendingAmount <= 0) {
      alert(
        `❌ Invalid pending amount: ${latestPendingAmount}\n\n` +
        `Please mine some tokens first, then try claiming again.\n\n` +
        `Check the browser console for more details.`
      );
      console.error('Claim blocked: Invalid pending amount', {
        latestPendingAmount,
        numericPendingAmount,
        isNaN: isNaN(numericPendingAmount),
        faucetId: faucet.id,
        userAddress: address,
      });
      return;
    }

    const claimAmountWei = parseEther(numericPendingAmount.toString());

    // Final validation: ensure wei amount is > 0
    if (claimAmountWei === BigInt(0) || claimAmountWei < BigInt(0)) {
      alert('❌ Error: Claim amount is 0 or negative. Cannot proceed with claim.');
      console.error('Claim blocked: claimAmountWei is invalid', {
        latestPendingAmount: numericPendingAmount,
        claimAmountWei: claimAmountWei.toString(),
      });
      return;
    }

    console.log('✅ Claiming with amount:', {
      pendingAmountMON: numericPendingAmount,
      claimAmountWei: claimAmountWei.toString(),
      claimAmountMON: (Number(claimAmountWei) / 1e18).toFixed(6),
      faucetId: faucet.id,
      userAddress: address,
    });

    // Proceed with claim - blockchain will reject if contract has no funds
    claimContract({
      address: faucet.contract_address as `0x${string}`,
      abi: FAUCET_ABI,
      functionName: 'claim',
      args: [claimAmountWei],
    });
  };

  if (!isOpen || !faucet) return null;

  // formatEther works with any 18-decimal token (MON has 18 decimals)
  const balanceMON = faucetBalance ? Number(formatEther(faucetBalance as bigint)) : 0;
  const mineAmountMON = mineAmount ? Number(formatEther(mineAmount as bigint)) : 0.001;

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
            {balanceError ? (
              <>
                <div className="text-lg font-bold text-yellow-400">
                  ⚠️ Cannot read contract balance
                </div>
                <div className="text-xs text-yellow-300 mt-1">
                  Error: {balanceError.message}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Using DB value: {faucet.remaining_coins} coins remaining
                </div>
              </>
            ) : isLoadingBalance ? (
              <div className="text-lg font-semibold text-gray-400">
                Loading balance...
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-purple-400">
                  {balanceMON.toFixed(4)} MON
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Contract balance (from Monad Testnet blockchain)
                </div>
                <div className="text-xs text-blue-400 mt-2 font-semibold">
                  📊 DB: {faucet.remaining_coins} coins ({(faucet.remaining_coins * mineAmountMON).toFixed(4)} MON)
                </div>
                {balanceMON === 0 && faucet.remaining_coins > 0 && (
                  <div className="text-xs text-yellow-400 mt-2 p-2 bg-yellow-900/20 rounded">
                    ⚠️ Contract reads 0 MON but DB shows {faucet.remaining_coins} coins available.
                    <br />
                    This might be an RPC issue. You can still mine/claim based on DB value.
                    <br />
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/game/faucets/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              faucet_id: faucet.id,
                              contract_address: faucet.contract_address,
                            }),
                          });
                          const data = await res.json();
                          if (data.error) {
                            alert('Sync error: ' + data.error);
                          } else {
                            alert(`Synced! Contract balance: ${data.contract_balance} MON, Remaining coins: ${data.remaining_coins}`);
                            queryClient.invalidateQueries({ queryKey: ['faucets'] });
                            // Force refetch of balance
                            window.location.reload();
                          }
                        } catch (error: any) {
                          alert('Error syncing: ' + error.message);
                        }
                      }}
                      className="mt-1 text-xs underline text-blue-400 hover:text-blue-300"
                    >
                      🔄 Sync Contract Balance
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mining Info */}
          <div className="mb-4 p-4 bg-black/50 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Mine Amount</div>
            <div className="text-lg font-semibold">{mineAmountMON.toFixed(4)} MON per mine</div>
            <div className="text-xs text-gray-500 mt-1">
              Click "Mine" to accumulate, then "Claim" to receive tokens
            </div>
          </div>

          {/* Pending Claim Amount */}
          {pendingAmount > 0 && (
            <div className="mb-4 p-4 bg-yellow-600/20 border border-yellow-500/50 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Pending Claim</div>
              <div className="text-2xl font-bold text-yellow-400">
                {pendingAmount.toFixed(4)} MON
              </div>
              <div className="text-xs text-yellow-300 mt-1">
                Ready to claim! Click "Claim" to receive tokens.
              </div>
            </div>
          )}

          {/* Error Messages */}
          {claimError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-sm text-red-200">
              Error: {claimError.message}
            </div>
          )}

          {/* Success Message */}
          {isClaimSuccess && (
            <div className="mb-4 p-3 bg-green-900/50 border border-green-500 rounded-lg text-sm text-green-200">
              ✓ Successfully claimed {pendingAmount.toFixed(4)} MON! Transaction: {claimHash?.slice(0, 10)}...
            </div>
          )}

          {/* Mine Button */}
          {faucet.contract_address ? (
            <>
              <button
                onClick={handleMine}
                disabled={!isWithinRadius || isMining || !address}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isMining ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Mining...
                  </>
                ) : (
                  <>
                    <span>⛏️</span>
                    Mine {mineAmountMON.toFixed(4)} MON
                  </>
                )}
              </button>

              {/* Claim Button */}
              {pendingAmount > 0 && (
                <button
                  onClick={handleClaim}
                  disabled={isClaiming || isConfirmingClaim || !address}
                  className="w-full mt-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {isClaiming || isConfirmingClaim ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      {isClaiming ? 'Confirming...' : 'Claiming...'}
                    </>
                  ) : (
                    <>
                      <span>💰</span>
                      Claim {pendingAmount.toFixed(4)} MON
                    </>
                  )}
                </button>
              )}
            </>
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

