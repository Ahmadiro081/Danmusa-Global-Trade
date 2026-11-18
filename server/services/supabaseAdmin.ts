import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from '../config/env.ts';

let cachedAdminClient: SupabaseClient | null = null;

/**
 * Returns a server-only Supabase admin client if SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are configured. Returns null otherwise.
 * NEVER import this module in frontend code.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!serverEnv.supabaseUrl || !serverEnv.supabaseServiceRoleKey) {
    return null;
  }

  if (!cachedAdminClient) {
    cachedAdminClient = createClient(
      serverEnv.supabaseUrl,
      serverEnv.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return cachedAdminClient;
}
