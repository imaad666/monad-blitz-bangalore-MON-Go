import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { function: functionName, params } = body;

    if (!functionName) {
      return NextResponse.json(
        { error: 'Function name is required' },
        { status: 400 }
      );
    }

    // Call the RPC function
    const { data, error } = await supabaseServer.rpc(functionName, params || {});

    if (error) {
      return NextResponse.json(
        { error: error.message, data: null },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error', data: null },
      { status: 500 }
    );
  }
}

