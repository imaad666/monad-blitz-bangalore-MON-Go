import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// GET - Get all active faucets
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius'); // in km, optional

    let query = supabaseServer
      .from('faucets')
      .select('*')
      .eq('is_active', true)
      .gt('remaining_coins', 0)
      .order('created_at', { ascending: false });

    // If coordinates provided, we can filter by bounding box
    // For more precise distance filtering, you'd need PostGIS
    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      
      // Simple bounding box (approximately 10km radius)
      const radiusDeg = radius ? parseFloat(radius) / 111 : 0.09; // ~10km default
      
      query = query
        .gte('lat', latNum - radiusDeg)
        .lte('lat', latNum + radiusDeg)
        .gte('lng', lngNum - radiusDeg)
        .lte('lng', lngNum + radiusDeg);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Ensure data is an array
    const faucets = Array.isArray(data) ? data : [];

    return NextResponse.json({
      faucets,
      count: faucets.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

