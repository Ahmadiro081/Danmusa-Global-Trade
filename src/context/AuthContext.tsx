import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ApiRequestError,
  fetchAuthSession,
  type AuthStaffAccount,
  type AuthUserProfile,
  type VerifiedAuthSession,
} from '../services/apiClient';
import { getSupabaseClient } from '../services/supabaseClient';
import type { RoleSlug } from '../types/domain';
import { canAccessAdminModule } from '../utils/authRouting';

export interface AuthState {
  loading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  user: { id: string; email: string | null } | null;
  profile: AuthUserProfile | null;
  role: RoleSlug | null;
  isStaff: boolean;
  isInactiveStaff: boolean;
  staffAccount: AuthStaffAccount | null;
  authorizedAdminModules: readonly string[];
  passwordRecoveryPending: boolean;
  sessionError: string | null;
}

export interface AuthContextValue extends AuthState {
  signIn: (
    email: string,
    password: string,
  ) => Promise<
    | { ok: true; session: VerifiedAuthSession }
    | { ok: false; error: string }
  >;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<VerifiedAuthSession | null>;
  clearPasswordRecovery: () => void;
  canAccessModule: (moduleSlug: string) => boolean;
}

const UNAUTHENTICATED_STATE: AuthState = {
  loading: false,
  isAuthenticated: false,
  accessToken: null,
  user: null,
  profile: null,
  role: null,
  isStaff: false,
  isInactiveStaff: false,
  staffAccount: null,
  authorizedAdminModules: [],
  passwordRecoveryPending: false,
  sessionError: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ...UNAUTHENTICATED_STATE,
    loading: true,
  });

  // Track the most recent resolution request so out-of-order async calls never overwrite fresh state.
  const requestIdRef = useRef(0);

  const hydrateFromSupabaseSession = useCallback(
    async (
      session: Session | null,
      options?: { preserveRecoveryFlag?: boolean },
    ): Promise<VerifiedAuthSession | null> => {
      const requestId = ++requestIdRef.current;

      if (!session?.access_token) {
        setState((prev) => ({
          ...UNAUTHENTICATED_STATE,
          passwordRecoveryPending: options?.preserveRecoveryFlag
            ? prev.passwordRecoveryPending
            : false,
        }));
        return null;
      }

      try {
        const verified = await fetchAuthSession(session.access_token);
        if (requestId !== requestIdRef.current) {
          return verified;
        }

        setState((prev) => ({
          loading: false,
          isAuthenticated: true,
          accessToken: session.access_token,
          user: verified.user,
          profile: verified.profile,
          role: verified.role,
          isStaff: verified.isStaff,
          isInactiveStaff: verified.isInactiveStaff,
          staffAccount: verified.staffAccount,
          authorizedAdminModules: verified.authorizedAdminModules,
          passwordRecoveryPending: options?.preserveRecoveryFlag
            ? prev.passwordRecoveryPending
            : false,
          sessionError: null,
        }));
        return verified;
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return null;
        }

        // If the backend rejected the JWT as invalid/expired, clear local browser session cleanly.
        if (err instanceof ApiRequestError && err.status === 401) {
          const client = getSupabaseClient();
          if (client) {
            await client.auth.signOut().catch(() => undefined);
          }
          setState({
            ...UNAUTHENTICATED_STATE,
            sessionError: 'Your session has expired. Please sign in again.',
          });
          return null;
        }

        const message =
          err instanceof Error
            ? err.message
            : 'Unable to verify account profile and permissions with the server.';

        // Fail closed: never grant staff or customer session access if server verification fails.
        setState({
          ...UNAUTHENTICATED_STATE,
          sessionError: message,
        });
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setState(UNAUTHENTICATED_STATE);
      return;
    }

    let mounted = true;

    client.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        void hydrateFromSupabaseSession(data.session);
      })
      .catch(() => {
        if (!mounted) return;
        setState(UNAUTHENTICATED_STATE);
      });

    const { data: subscription } = client.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (event === 'PASSWORD_RECOVERY') {
          setState((prev) => ({ ...prev, passwordRecoveryPending: true }));
          void hydrateFromSupabaseSession(session, { preserveRecoveryFlag: true });
          return;
        }
        if (event === 'SIGNED_OUT') {
          requestIdRef.current += 1;
          setState(UNAUTHENTICATED_STATE);
          return;
        }
        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          void hydrateFromSupabaseSession(session, {
            preserveRecoveryFlag: event === 'USER_UPDATED',
          });
        }
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [hydrateFromSupabaseSession]);

  const signIn = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<
      | { ok: true; session: VerifiedAuthSession }
      | { ok: false; error: string }
    > => {
      const client = getSupabaseClient();
      if (!client) {
        return {
          ok: false,
          error:
            'Supabase Auth is not configured in this environment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
        };
      }

      setState((prev) => ({ ...prev, sessionError: null }));

      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        return {
          ok: false,
          error: error?.message ?? 'Unable to authenticate with Supabase Auth.',
        };
      }

      const verified = await hydrateFromSupabaseSession(data.session);
      if (!verified) {
        return {
          ok: false,
          error:
            'Signed in, but the server could not verify your account profile and role. Please try again.',
        };
      }

      return { ok: true, session: verified };
    },
    [hydrateFromSupabaseSession],
  );

  const signOut = useCallback(async () => {
    requestIdRef.current += 1;
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut().catch(() => undefined);
    }
    setState(UNAUTHENTICATED_STATE);
  }, []);

  const refreshSession = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setState(UNAUTHENTICATED_STATE);
      return null;
    }
    const { data } = await client.auth.getSession();
    return hydrateFromSupabaseSession(data.session);
  }, [hydrateFromSupabaseSession]);

  const clearPasswordRecovery = useCallback(() => {
    setState((prev) => ({ ...prev, passwordRecoveryPending: false }));
  }, []);

  const canAccessModule = useCallback(
    (moduleSlug: string) =>
      state.isStaff &&
      canAccessAdminModule(
        state.role,
        moduleSlug,
        state.authorizedAdminModules,
      ),
    [state.isStaff, state.role, state.authorizedAdminModules],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn,
      signOut,
      refreshSession,
      clearPasswordRecovery,
      canAccessModule,
    }),
    [
      state,
      signIn,
      signOut,
      refreshSession,
      clearPasswordRecovery,
      canAccessModule,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
