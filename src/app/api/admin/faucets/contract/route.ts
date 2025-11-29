import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// PUT - Update faucet contract address
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { faucet_id, contract_address } = body;

    // Validate required fields
    if (!faucet_id || !contract_address) {
      return NextResponse.json(
        { error: 'Missing required fields: faucet_id, contract_address' },
        { status: 400 }
      );
    }

    // Validate contract address format
    if (!contract_address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid contract address format. Must be a valid Ethereum address (0x followed by 40 hex characters)' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from('faucets')
      .update({ contract_address })
      .eq('id', faucet_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, message: 'Contract address updated successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
