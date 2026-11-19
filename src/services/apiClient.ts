import type { IntegrationStatusMap } from '../types/domain';

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

async function parseJsonSafe<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new Error(`Empty response (HTTP ${response.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response (HTTP ${response.status})`);
  }
}

export async function fetchPlatformHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health');
  if (!response.ok) {
    throw new Error(`Platform health check failed with status ${response.status}`);
  }
  return parseJsonSafe<HealthResponse>(response);
}

export async function probeAdminAuthStatus(): Promise<{
  ok: boolean;
  status: number;
  payload: ApiErrorPayload | { authorized: boolean; role: string };
}> {
  const response = await fetch('/api/admin/foundation-status');
  const payload = await parseJsonSafe<ApiErrorPayload | { authorized: boolean; role: string }>(
    response,
  );
  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}
