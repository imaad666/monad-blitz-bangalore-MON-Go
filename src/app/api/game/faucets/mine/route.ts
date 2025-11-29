import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * POST /api/game/faucets/mine
 * Increments pending claim amount for a user at a faucet
 * This is called immediately when user clicks "Mine" button (no blockchain transaction)
 * 
 * Body: {
 *   faucet_id: string
 *   user_address: string
 *   mine_amount: number (in MON, e.g., 0.001)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { faucet_id, user_address, mine_amount } = body;

    if (!faucet_id || !user_address || mine_amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: faucet_id, user_address, mine_amount' },
        { status: 400 }
      );
    }

    // Get current pending claim amount for this user at this faucet
    const { data: existingClaim, error: fetchError } = await supabaseServer
      .from('pending_claims')
      .select('*')
      .eq('faucet_id', faucet_id)
      .eq('user_address', user_address.toLowerCase())
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      return NextResponse.json(
        { error: `Failed to fetch pending claim: ${fetchError.message}` },
        { status: 500 }
      );
    }

    const currentPending = existingClaim?.pending_amount || 0;
    const newPending = currentPending + mine_amount;

    // Update or insert pending claim
    const { data, error } = await supabaseServer
      .from('pending_claims')
      .upsert({
        faucet_id,
        user_address: user_address.toLowerCase(),
        pending_amount: newPending,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'faucet_id,user_address',
      })
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
      pending_amount: newPending,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/game/faucets/mine
 * Clears pending claim amount after successful claim
 * 
 * Body: {
 *   faucet_id: string
 *   user_address: string
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { faucet_id, user_address } = body;

    if (!faucet_id || !user_address) {
      return NextResponse.json(
        { error: 'Missing required fields: faucet_id, user_address' },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from('pending_claims')
      .delete()
      .eq('faucet_id', faucet_id)
      .eq('user_address', user_address.toLowerCase());

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pending claim cleared',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

