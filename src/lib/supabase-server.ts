import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Optional, for admin operations

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('SUPABASE_ANON_KEY');
  
  console.error(
    `❌ Missing required Supabase environment variables: ${missingVars.join(', ')}\n` +
    `Please add them to your .env.local file.\n` +
    `You can find these values in your Supabase project settings: https://app.supabase.com/project/_/settings/api`
  );
  
  throw new Error(`Missing Supabase environment variables: ${missingVars.join(', ')}`);
}

// Create server-side Supabase client (for use in API routes and server components)
// Uses service role key if available (bypasses RLS), otherwise uses anon key
export const supabaseServer = createClient(
  supabaseUrl, 
  supabaseServiceKey || supabaseAnonKey, 
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

