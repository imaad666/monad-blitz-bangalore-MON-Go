import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { faucet_id, user_address } = body;

    if (!faucet_id || !user_address) {
      return NextResponse.json(
        { error: 'Missing required fields: faucet_id, user_address' },
        { status: 400 }
      );
    }

    // Call the atomic claim_coins function
    const { data, error } = await supabaseServer.rpc('claim_coins', {
      p_faucet_id: faucet_id,
      p_user_wallet: user_address,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { error: data.error || 'Failed to claim coins', success: false },
        { status: 400 }
      );
    }

    // Get updated user stats
    const { data: userStats, error: statsError } = await supabaseServer.rpc('get_user_stats', {
      p_user_address: user_address,
    });

    return NextResponse.json({
      success: true,
      remaining_coins: data.remaining_coins,
      amount_claimed: data.amount_claimed,
      user_stats: userStats || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

