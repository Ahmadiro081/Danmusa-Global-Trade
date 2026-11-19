import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

let cachedClient: SupabaseClient | null = null;

function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('MY_')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isSupabaseClientConfigured(): boolean {
  return (
    isValidHttpUrl(supabaseUrl) &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseAnonKey.trim().startsWith('MY_')
  );
}

/**
 * Returns a browser Supabase client only when valid VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are configured. Never uses hardcoded keys.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseClientConfigured()) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl.trim(), supabaseAnonKey.trim());
  }

  return cachedClient;
}
