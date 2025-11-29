import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * GET /api/game/faucets/pending
 * Get pending claim amount for a user at a faucet
 * 
 * Query params: faucet_id, user_address
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const faucet_id = searchParams.get('faucet_id');
    const user_address = searchParams.get('user_address');

    if (!faucet_id || !user_address) {
      return NextResponse.json(
        { error: 'Missing required fields: faucet_id, user_address' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from('pending_claims')
      .select('*')
      .eq('faucet_id', faucet_id)
      .eq('user_address', user_address.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pending_amount: data?.pending_amount || 0,
      data: data || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

