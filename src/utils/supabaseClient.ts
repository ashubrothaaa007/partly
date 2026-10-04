import { createClient } from '@supabase/supabase-js';

// Retrieve credentials securely from Vite environment variables (configured via local .env file)
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!projectId || !publicAnonKey) {
  throw new Error("Missing VITE_SUPABASE_PROJECT_ID or VITE_SUPABASE_ANON_KEY in environment variables.");
}

const supabaseUrl = `https://${projectId}.supabase.co`;

// Create a single supabase client instance for the entire app
export const supabase = createClient(supabaseUrl, publicAnonKey);
