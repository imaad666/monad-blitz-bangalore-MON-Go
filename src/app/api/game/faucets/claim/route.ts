import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createPublicClient, http, formatEther } from 'viem';
import { defineChain } from 'viem';
import { FAUCET_ABI } from '@/lib/contracts';

// Monad Testnet configuration
const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet-explorer.monad.xyz',
    },
  },
  testnet: true,
});

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

/**
 * POST /api/game/faucets/claim
 * Records a claim from a faucet contract and updates user stats
 * This is called after a successful on-chain claim transaction
 * 
 * Body: {
 *   faucet_id: string
 *   user_address: string
 *   claimed_amount: number (in MON, e.g., 0.01)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { faucet_id, user_address, claimed_amount } = body;

    if (!faucet_id || !user_address || claimed_amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: faucet_id, user_address, claimed_amount' },
        { status: 400 }
      );
    }

    // Ensure user exists
    const { error: ensureError } = await supabaseServer.rpc('ensure_user_exists', {
      p_user_address: user_address.toLowerCase(),
    });

    if (ensureError) {
      console.error('Error ensuring user exists:', ensureError);
      // Continue anyway, might already exist
    }

    // Record the claim - this should update user stats via database triggers/functions
    // For now, we'll manually update the users table
    const { data: userData, error: userError } = await supabaseServer
      .from('users')
      .select('total_collected, total_mines')
      .eq('address', user_address.toLowerCase())
      .single();

    if (userError && userError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: `Failed to fetch user: ${userError.message}` },
        { status: 500 }
      );
    }

    const currentCollected = userData?.total_collected || 0;
    const currentMines = userData?.total_mines || 0;

    // Get faucet info to calculate coins to deduct
    const { data: faucetData, error: faucetError } = await supabaseServer
      .from('faucets')
      .select('remaining_coins, total_coins, contract_address')
      .eq('id', faucet_id)
      .single();

    if (faucetError) {
      return NextResponse.json(
        { error: `Failed to fetch faucet: ${faucetError.message}` },
        { status: 500 }
      );
    }

    // Get MINE_AMOUNT from contract to calculate coins
    let mineAmountMON = 0.001; // Default fallback
    if (faucetData?.contract_address && faucetData.contract_address.match(/^0x[a-fA-F0-9]{40}$/)) {
      try {
        const mineAmountWei = await publicClient.readContract({
          address: faucetData.contract_address as `0x${string}`,
          abi: FAUCET_ABI,
          functionName: 'MINE_AMOUNT',
        }) as bigint;
        mineAmountMON = Number(formatEther(mineAmountWei));
      } catch (error) {
        console.error('Failed to read MINE_AMOUNT from contract, using default:', error);
      }
    }

    // Calculate how many coins were claimed (claimed_amount / mine_amount)
    const coinsClaimed = Math.ceil(claimed_amount / mineAmountMON);
    const newRemainingCoins = Math.max(0, (faucetData?.remaining_coins || 0) - coinsClaimed);

    // Update user stats
    const { error: updateError } = await supabaseServer
      .from('users')
      .update({
        total_collected: currentCollected + claimed_amount,
        total_mines: currentMines + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('address', user_address.toLowerCase());

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update user stats: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Update faucet remaining_coins
    const { error: faucetUpdateError } = await supabaseServer
      .from('faucets')
      .update({
        remaining_coins: newRemainingCoins,
        is_active: newRemainingCoins > 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', faucet_id);

    if (faucetUpdateError) {
      console.error('Failed to update faucet remaining_coins:', faucetUpdateError);
      // Don't fail the whole request, but log the error
    }

    // Also record in claims table if it exists (for history)
    // This is optional - depends on your schema
    try {
      await supabaseServer
        .from('claims')
        .insert({
          faucet_id,
          user_address: user_address.toLowerCase(),
          amount: claimed_amount,
          claimed_at: new Date().toISOString(),
        });
    } catch (error) {
      // Claims table might not exist, that's okay
      console.log('Could not record claim in claims table (might not exist)');
    }

    return NextResponse.json({
      success: true,
      claimed_amount,
      coins_claimed: coinsClaimed,
      remaining_coins: newRemainingCoins,
      user_stats: {
        total_collected: currentCollected + claimed_amount,
        total_mines: currentMines + 1,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

