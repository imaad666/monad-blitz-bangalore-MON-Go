import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import dbConnect from '@/lib/db';

export async function GET() {
  const status = {
    supabase: {
      configured: false,
      connected: false,
      error: null as string | null,
    },
    mongodb: {
      configured: false,
      connected: false,
      error: null as string | null,
    },
  };

  // Test Supabase connection
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    status.supabase.configured = true;
    try {
      // Try a simple query to test connection
      const { error } = await supabaseServer
        .from('faucets')
        .select('*')
        .limit(1);
      
      if (error) {
        const message = error.message || '';
        if (message.includes('relation') || message.includes('does not exist')) {
          status.supabase.connected = true;
          status.supabase.error = 'Connected, but "faucets" table does not exist';
        } else {
          status.supabase.error = message;
        }
      } else {
        status.supabase.connected = true;
      }
    } catch (error: any) {
      status.supabase.error = error.message || 'Connection failed';
    }
  } else {
    status.supabase.error = 'SUPABASE_URL or SUPABASE_ANON_KEY not configured';
  }

  // Test MongoDB connection
  const mongoUri = process.env.MONGODB_URI;
  
  if (mongoUri) {
    status.mongodb.configured = true;
    try {
      const db = await dbConnect();
      if (db) {
        status.mongodb.connected = true;
      } else {
        status.mongodb.error = 'Connection returned null';
      }
    } catch (error: any) {
      status.mongodb.error = error.message || 'Connection failed';
    }
  } else {
    status.mongodb.error = 'MONGODB_URI not configured';
  }

  return NextResponse.json(status);
}

