import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// GET - Get user stats by address
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Missing address parameter' },
        { status: 400 }
      );
    }

    // Get user stats using the function
    const { data: userStats, error } = await supabaseServer.rpc('get_user_stats', {
      p_user_address: address,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Get user data including faucets_visited
    const { data: userData } = await supabaseServer
      .from('users')
      .select('faucets_visited, first_connected_at, last_seen_at')
      .eq('address', address)
      .single();

    return NextResponse.json({
      user: {
        address: address,
        score: userStats?.total_score || 0,
        total_claims: userStats?.total_claims || 0,
        last_claim_at: userStats?.last_claim_at || null,
        faucets_visited: userData?.faucets_visited || 0,
        first_connected_at: userData?.first_connected_at || null,
        last_seen_at: userData?.last_seen_at || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Initialize/update user (called when wallet connects)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address) {
      return NextResponse.json(
        { error: 'Missing address parameter' },
        { status: 400 }
      );
    }

    // Ensure user exists in users table (create if doesn't exist)
    const { data: ensureResult, error: ensureError } = await supabaseServer.rpc('ensure_user_exists', {
      p_user_address: address,
    });

    if (ensureError) {
      return NextResponse.json(
        { error: ensureError.message },
        { status: 500 }
      );
    }

    // Get user info and stats
    const { data: userData, error: userError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('address', address)
      .single();

    if (userError && userError.code !== 'PGRST116') { // PGRST116 = no rows returned
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    // Get user stats from claims
    const { data: userStats, error: statsError } = await supabaseServer.rpc('get_user_stats', {
      p_user_address: address,
    });

    return NextResponse.json({
      user: {
        address: address,
        score: userStats?.total_score || 0,
        total_claims: userStats?.total_claims || 0,
        last_claim_at: userStats?.last_claim_at || null,
        first_connected_at: userData?.first_connected_at || null,
        last_seen_at: userData?.last_seen_at || null,
        faucets_visited: userData?.faucets_visited || 0,
      },
      message: 'User initialized',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

