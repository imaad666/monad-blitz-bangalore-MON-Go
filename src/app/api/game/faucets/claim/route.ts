import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

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

