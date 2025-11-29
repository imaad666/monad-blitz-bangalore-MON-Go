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
 * POST /api/game/faucets/sync
 * Syncs contract balance with database
 * 
 * Body: {
 *   faucet_id: string
 *   contract_address: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { faucet_id, contract_address } = body;

    if (!faucet_id || !contract_address) {
      return NextResponse.json(
        { error: 'Missing required fields: faucet_id, contract_address' },
        { status: 400 }
      );
    }

    // Validate contract address format
    if (!contract_address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid contract address format' },
        { status: 400 }
      );
    }

    // Read contract balance
    let contractBalance: bigint;
    let mineAmount: bigint;
    
    try {
      contractBalance = await publicClient.readContract({
        address: contract_address as `0x${string}`,
        abi: FAUCET_ABI,
        functionName: 'getBalance',
      }) as bigint;

      mineAmount = await publicClient.readContract({
        address: contract_address as `0x${string}`,
        abi: FAUCET_ABI,
        functionName: 'MINE_AMOUNT',
      }) as bigint;
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to read contract: ${error.message}` },
        { status: 500 }
      );
    }

    // Calculate remaining coins based on contract balance
    // remaining_coins = floor(contractBalance / mineAmount)
    const remainingCoins = Number(contractBalance / mineAmount);

    // Update database
    const { data: faucetData, error: fetchError } = await supabaseServer
      .from('faucets')
      .select('total_coins')
      .eq('id', faucet_id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch faucet: ${fetchError.message}` },
        { status: 500 }
      );
    }

    const totalCoins = faucetData?.total_coins || remainingCoins;

    const { data, error } = await supabaseServer
      .from('faucets')
      .update({
        remaining_coins: remainingCoins,
        is_active: remainingCoins > 0, // Deactivate if empty
      })
      .eq('id', faucet_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      faucet: data,
      contract_balance: formatEther(contractBalance),
      remaining_coins: remainingCoins,
      total_coins: totalCoins,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

