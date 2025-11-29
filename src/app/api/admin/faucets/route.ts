import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// GET - List all faucets (for admin/debugging)
export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('faucets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, count: data?.length || 0 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new faucet (for admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, lat, lng, total_coins = 100, remaining_coins, is_active = true } = body;

    // Validate required fields
    if (!name || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, lat, lng' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates. Lat must be between -90 and 90, Lng must be between -180 and 180' },
        { status: 400 }
      );
    }

    // Use remaining_coins if provided, otherwise use total_coins
    const coins = remaining_coins !== undefined ? remaining_coins : total_coins;

    const { data, error } = await supabaseServer
      .from('faucets')
      .insert({
        name,
        lat,
        lng,
        total_coins,
        remaining_coins: coins,
        is_active,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, message: 'Faucet created successfully' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

