import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// POST - Create multiple faucets at once (for seeding)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { faucets } = body;

    if (!Array.isArray(faucets) || faucets.length === 0) {
      return NextResponse.json(
        { error: 'Expected an array of faucets' },
        { status: 400 }
      );
    }

    // Validate each faucet
    for (const faucet of faucets) {
      if (!faucet.name || faucet.lat === undefined || faucet.lng === undefined) {
        return NextResponse.json(
          { error: `Invalid faucet: missing name, lat, or lng. Received: ${JSON.stringify(faucet)}` },
          { status: 400 }
        );
      }
    }

    // Prepare faucets with defaults
    const faucetsToInsert = faucets.map((faucet) => ({
      name: faucet.name,
      lat: faucet.lat,
      lng: faucet.lng,
      total_coins: faucet.total_coins || 100,
      remaining_coins: faucet.remaining_coins !== undefined ? faucet.remaining_coins : (faucet.total_coins || 100),
      is_active: faucet.is_active !== undefined ? faucet.is_active : true,
    }));

    const { data, error } = await supabaseServer
      .from('faucets')
      .insert(faucetsToInsert)
      .select();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      message: `Successfully created ${data.length} faucets`,
      count: data.length,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

