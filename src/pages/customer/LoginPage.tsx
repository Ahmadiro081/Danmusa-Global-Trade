import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextField } from '../../components/ui/FormField';
import {
  AlertBanner,
  ErrorBanner,
  IntegrationNotice,
} from '../../components/ui/StateViews';
import { useAuth } from '../../context/AuthContext';
import { requestPasswordReset } from '../../services/apiClient';
import {
  getSupabaseClient,
  isSupabaseClientConfigured,
} from '../../services/supabaseClient';
import { resolvePostLoginDestination } from '../../utils/authRouting';
import { shouldTriggerNativeSupabaseFallback } from '../../utils/recoverySession';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const resetEmailSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
});

const newPasswordSchema = z
  .object({
    password: z.string().min(8, 'New password must be at least 8 characters.'),
    confirmPassword: z.string().min(8, 'Confirm your new password.'),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type LoginViewMode = 'signin' | 'forgot' | 'recovery';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get('next');
  const isStaffEntry =
    searchParams.get('portal') === 'staff' ||
    Boolean(nextParam && nextParam.startsWith('/admin'));

  const supabaseConfigured = isSupabaseClientConfigured();
  const {
    loading: authLoading,
    isAuthenticated,
    role,
    isStaff,
    isInactiveStaff,
    authorizedAdminModules,
    passwordRecoveryPending,
    sessionError,
    signIn,
    signOut,
    clearPasswordRecovery,
  } = useAuth();

  const [mode, setMode] = useState<LoginViewMode>(() =>
    searchParams.get('mode') === 'recovery' ? 'recovery' : 'signin',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (passwordRecoveryPending) {
      setMode('recovery');
    }
  }, [passwordRecoveryPending]);

  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated ||
      passwordRecoveryPending ||
      mode === 'recovery'
    ) {
      return;
    }

    if (isInactiveStaff) {
      setAuthError(
        'Your DGT staff account is currently inactive. Administrative access is denied until reactivated by a Super Administrator.',
      );
      return;
    }

    const destination = resolvePostLoginDestination(
      { role, isStaff, isInactiveStaff, authorizedAdminModules },
      nextParam,
    );
    if (destination) {
      navigate(destination, { replace: true });
    }
  }, [
    authLoading,
    isAuthenticated,
    role,
    isStaff,
    isInactiveStaff,
    authorizedAdminModules,
    passwordRecoveryPending,
    mode,
    nextParam,
    navigate,
  ]);

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setStatusMessage(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0] ?? 'form')] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const result = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);

    if (!result.ok) {
      setAuthError(result.error);
      return;
    }

    if (result.session.isInactiveStaff) {
      await signOut();
      setAuthError(
        'Access denied: this staff account is inactive. Contact the Super Administrator to restore access.',
      );
      return;
    }

    const destination = resolvePostLoginDestination(
      {
        role: result.session.role,
        isStaff: result.session.isStaff,
        isInactiveStaff: result.session.isInactiveStaff,
        authorizedAdminModules: result.session.authorizedAdminModules,
      },
      nextParam,
    );

    if (destination) {
      navigate(destination, { replace: true });
    }
  };

  const handlePasswordResetRequest = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setStatusMessage(null);

    const parsed = resetEmailSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors({ email: parsed.error.issues[0]?.message ?? 'Invalid email.' });
      return;
    }
    setErrors({});

    const redirectTo = `${window.location.origin}/reset-password`;
    setSubmitting(true);
    try {
      const response = await requestPasswordReset(parsed.data.email, redirectTo);
      setStatusMessage(response.message);
    } catch (err) {
      if (shouldTriggerNativeSupabaseFallback(err)) {
        const client = getSupabaseClient();
        if (client) {
          const { error } = await client.auth.resetPasswordForEmail(
            parsed.data.email,
            { redirectTo },
          );
          if (!error) {
            setStatusMessage(
              'If an account exists for that email address, a secure password reset link has been sent. Check your inbox and spam folder.',
            );
            return;
          }
          setAuthError(
            'Unable to send password reset link right now. Please try again shortly.',
          );
          return;
        }
      }
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Unable to send password reset link right now.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordUpdate = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setStatusMessage(null);

    const parsed = newPasswordSchema.safeParse({
      password: newPassword,
      confirmPassword,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0] ?? 'form')] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    const client = getSupabaseClient();
    if (!client) {
      setAuthError('Supabase Auth is not configured in this environment.');
      return;
    }

    setSubmitting(true);
    const { error } = await client.auth.updateUser({
      password: parsed.data.password,
    });
    setSubmitting(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    clearPasswordRecovery();
    setNewPassword('');
    setConfirmPassword('');
    setMode('signin');
    setStatusMessage(
      'Password updated successfully. Redirecting to your portal...',
    );
  };

  return (
    <div className="bg-[#F5F7FA] px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#10243A] text-[#F4A62A]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
            {isStaffEntry
              ? 'Unified Authentication · Staff & Admin Entry'
              : 'Danmusa Global Trade Account'}
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-extrabold text-[#10243A]">
            {mode === 'forgot'
              ? 'Reset Your Password'
              : mode === 'recovery'
                ? 'Set a New Password'
                : isStaffEntry
                  ? 'Staff & Administrator Sign In'
                  : 'Sign In to Your Account'}
          </h1>
          <p className="mt-1.5 text-sm text-[#64748B]">
            {mode === 'forgot'
              ? 'Enter your registered email address to receive a recovery link.'
              : mode === 'recovery'
                ? 'Choose a strong password (minimum 8 characters) to complete recovery.'
                : 'One unified sign-in for registered customers and authorized DGT staff. Your portal access is verified automatically by the server.'}
          </p>
        </div>

        {!supabaseConfigured && (
          <div className="mb-5">
            <IntegrationNotice
              title="Supabase Auth Pending Configuration"
              description="Sign-in connects directly to Supabase Auth once VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured."
            />
          </div>
        )}

        <Card>
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4" noValidate>
              {(authError || sessionError) && (
                <ErrorBanner
                  title="Authentication Notice"
                  message={authError ?? sessionError ?? ''}
                />
              )}

              {statusMessage && (
                <AlertBanner
                  tone="success"
                  title="Status Update"
                  message={statusMessage}
                />
              )}

              <TextField
                id="login-email"
                label="Email Address"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                placeholder="you@example.com"
              />

              <TextField
                id="login-password"
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                placeholder="Minimum 8 characters"
              />

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#2563EB] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={submitting || authLoading}
              >
                {submitting ? 'Verifying Credentials & Role...' : 'Sign In'}
              </Button>
            </form>
          )}

          {mode === 'forgot' && (
            <form
              onSubmit={handlePasswordResetRequest}
              className="space-y-4"
              noValidate
            >
              {authError && (
                <ErrorBanner title="Password Recovery Error" message={authError} />
              )}
              {statusMessage && (
                <AlertBanner
                  tone="success"
                  title="Recovery Link Sent"
                  message={statusMessage}
                />
              )}

              <TextField
                id="reset-email"
                label="Registered Email Address"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                placeholder="you@example.com"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={submitting}
              >
                {submitting
                  ? 'Sending Recovery Link...'
                  : 'Send Password Reset Link'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setStatusMessage(null);
                    setErrors({});
                    setMode('signin');
                  }}
                  className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {mode === 'recovery' && (
            <form
              onSubmit={handlePasswordUpdate}
              className="space-y-4"
              noValidate
            >
              {authError && (
                <ErrorBanner title="Password Update Failed" message={authError} />
              )}
              {statusMessage && (
                <AlertBanner
                  tone="success"
                  title="Password Updated"
                  message={statusMessage}
                />
              )}

              <TextField
                id="new-password"
                label="New Password"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={errors.password}
                placeholder="Minimum 8 characters"
              />

              <TextField
                id="confirm-password"
                label="Confirm New Password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                placeholder="Re-enter new password"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={submitting}
              >
                {submitting ? 'Updating Password...' : 'Update Password'}
              </Button>
            </form>
          )}

          <div className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-center text-xs text-[#64748B]">
            <p>
              Need a customer trade account?{' '}
              <Link
                to="/register"
                className="font-semibold text-[#2563EB] hover:underline"
              >
                Register as a Customer
              </Link>
            </p>
            <p className="text-[11px]">
              Staff accounts are provisioned exclusively by the Super Administrator and authenticate through this same portal.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
