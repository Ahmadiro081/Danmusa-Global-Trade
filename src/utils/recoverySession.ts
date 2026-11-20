import { ApiRequestError } from '../services/apiClient';

export interface RecoveryUrlSignals {
  pkceCode: string | null;
  tokenHash: string | null;
  isTokenHashRecovery: boolean;
  hasImplicitRecoveryHash: boolean;
  hasSensitiveUrlParams: boolean;
  errorMessage: string | null;
}

/**
 * Parses Supabase Auth recovery parameters from query string and URL hash.
 * Detects expired/invalid link errors and identifies whether sensitive recovery
 * credentials must be scrubbed from browser history after verification.
 */
export function parseRecoveryUrlSignals(
  search: string,
  hash: string,
): RecoveryUrlSignals {
  const searchParams = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));

  const errorDesc =
    hashParams.get('error_description') ||
    searchParams.get('error_description') ||
    hashParams.get('error') ||
    searchParams.get('error');

  let errorMessage: string | null = null;
  if (errorDesc) {
    const decoded = errorDesc.replace(/\+/g, ' ');
    const lower = decoded.toLowerCase();
    if (lower.includes('expired') || lower.includes('otp_expired')) {
      errorMessage =
        'This password reset link has expired. Please request a fresh recovery link below.';
    } else if (lower.includes('invalid') || lower.includes('access_denied')) {
      errorMessage =
        'This password reset link is invalid or has already been used. Request a new link to continue.';
    } else {
      errorMessage =
        'Unable to verify this password reset link. Please request a fresh recovery link.';
    }
  }

  const pkceCode = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const queryType = searchParams.get('type');
  const isTokenHashRecovery = Boolean(tokenHash && queryType === 'recovery');

  const hashType = hashParams.get('type');
  const hasHashAccessToken = Boolean(hashParams.get('access_token'));
  const hasImplicitRecoveryHash =
    hashType === 'recovery' && hasHashAccessToken;

  const hasSensitiveUrlParams = Boolean(
    pkceCode ||
      tokenHash ||
      hasHashAccessToken ||
      hashParams.get('refresh_token') ||
      errorDesc,
  );

  return {
    pkceCode,
    tokenHash,
    isTokenHashRecovery,
    hasImplicitRecoveryHash,
    hasSensitiveUrlParams,
    errorMessage,
  };
}

/**
 * Enforces that ordinary authenticated sessions CANNOT bypass password-recovery
 * validation on /reset-password. Access to the password recovery form is only
 * granted when Supabase explicitly established a recovery session via
 * PASSWORD_RECOVERY event or verified URL recovery token exchange.
 */
export function canGrantRecoveryFormAccess(params: {
  passwordRecoveryPending: boolean;
  verifiedByUrlRecoveryFlow: boolean;
  hasActiveSession: boolean;
}): boolean {
  if (!params.hasActiveSession) {
    return false;
  }
  return (
    params.passwordRecoveryPending || params.verifiedByUrlRecoveryFlow
  );
}

/**
 * Strictly restricts browser-side fallback to Supabase's native
 * resetPasswordForEmail() ONLY when the server explicitly reported
 * RESEND_NOT_CONFIGURED (before calling admin.generateLink).
 * Prevents duplicate recovery link generation or duplicate emails on transient
 * 503 gateway timeouts or delivery errors.
 */
export function shouldTriggerNativeSupabaseFallback(err: unknown): boolean {
  return (
    err instanceof ApiRequestError && err.code === 'RESEND_NOT_CONFIGURED'
  );
}
