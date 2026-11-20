import type { IntegrationStatusMap, RoleSlug } from '../types/domain';

export interface HealthResponse {
  service: string;
  stage: string;
  status: string;
  timestamp: string;
  integrations: IntegrationStatusMap;
}

export interface ApiErrorPayload {
  error: string;
  code?: string;
  message?: string;
}

export interface AuthUserProfile {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  accountType: string;
  defaultStateId: string | null;
}

export interface AuthStaffAccount {
  id: string;
  department: string | null;
  isActive: boolean;
  roleSlug: RoleSlug | null;
  roleName: string | null;
}

export interface VerifiedAuthSession {
  authenticated: true;
  user: {
    id: string;
    email: string | null;
  };
  profile: AuthUserProfile;
  role: RoleSlug;
  isStaff: boolean;
  isInactiveStaff: boolean;
  staffAccount: AuthStaffAccount | null;
  authorizedAdminModules: string[];
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

function resolveApiUrl(url: string): string {
  const configuredBase = (
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''
  )
    .trim()
    .replace(/\/+$/, '');
  if (!configuredBase || !url.startsWith('/')) {
    return url;
  }
  return `${configuredBase}${url}`;
}

async function parseJsonSafe<T>(response: Response, requestUrl: string): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();
  if (!text) {
    throw new ApiRequestError(
      `Empty response from ${requestUrl} (HTTP ${response.status})`,
      response.status,
      'EMPTY_RESPONSE',
    );
  }

  const looksLikeHtml =
    contentType.includes('text/html') || /^\s*<!doctype\s+html|^\s*<html/i.test(text);

  if (looksLikeHtml) {
    if (response.redirected) {
      throw new ApiRequestError(
        `API request to ${requestUrl} was redirected to an HTML page (${response.url || 'proxy auth check'}, HTTP ${response.status}). Refresh the page or open the preview in a new browser tab so session cookies are attached.`,
        response.status,
        'HTML_REDIRECT_RESPONSE',
      );
    }
    throw new ApiRequestError(
      `API request to ${requestUrl} returned HTML instead of JSON (HTTP ${response.status}). Ensure the Express backend API is running and /api/* requests are routed to the API handler instead of the SPA index.html fallback.`,
      response.status,
      'HTML_FALLBACK_RESPONSE',
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiRequestError(
      `Invalid JSON response from ${requestUrl} (HTTP ${response.status})`,
      response.status,
      'INVALID_JSON',
    );
  }
}

export async function apiFetch<T>(
  url: string,
  options?: {
    accessToken?: string | null;
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
  },
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options?.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }
  if (options?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const targetUrl = resolveApiUrl(url);
  const response = await fetch(targetUrl, {
    method: options?.method ?? 'GET',
    headers,
    credentials: 'include',
    cache: 'no-store',
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await parseJsonSafe<T | ApiErrorPayload>(response, url);

  if (!response.ok) {
    const errPayload = payload as ApiErrorPayload;
    throw new ApiRequestError(
      errPayload.error ||
        errPayload.message ||
        `Request to ${url} failed (HTTP ${response.status})`,
      response.status,
      errPayload.code,
    );
  }

  return payload as T;
}

export async function fetchPlatformHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/api/health');
}

export async function fetchAuthSession(
  accessToken: string,
): Promise<VerifiedAuthSession> {
  return apiFetch<VerifiedAuthSession>('/api/auth/session', {
    accessToken,
  });
}

export interface PasswordResetResponse {
  ok: true;
  message: string;
}

export async function requestPasswordReset(
  email: string,
  redirectTo?: string,
): Promise<PasswordResetResponse> {
  return apiFetch<PasswordResetResponse>('/api/auth/password-reset', {
    method: 'POST',
    body: redirectTo ? { email, redirectTo } : { email },
  });
}

export async function probeAdminAuthStatus(accessToken?: string | null): Promise<{
  ok: boolean;
  status: number;
  payload:
    | ApiErrorPayload
    | { authorized: boolean; role: string; staffAccountId?: string; message?: string };
}> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const response = await fetch(resolveApiUrl('/api/admin/foundation-status'), {
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
  const payload = await parseJsonSafe<
    | ApiErrorPayload
    | { authorized: boolean; role: string; staffAccountId?: string; message?: string }
  >(response, '/api/admin/foundation-status');
  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}
