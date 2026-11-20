import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  AlertBanner,
  ErrorBanner,
  IntegrationNotice,
  LoadingSkeleton,
} from '../../components/ui/StateViews';
import { useAuth } from '../../context/AuthContext';
import {
  getSupabaseClient,
  isSupabaseClientConfigured,
} from '../../services/supabaseClient';
import { resolvePostLoginDestination } from '../../utils/authRouting';

const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .max(128, 'Password must be 128 characters or fewer.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

function readUrlAuthError(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  const errorDesc =
    hashParams.get('error_description') ||
    searchParams.get('error_description') ||
    hashParams.get('error') ||
    searchParams.get('error');

  if (!errorDesc) return null;

  const decoded = errorDesc.replace(/\+/g, ' ');
  const lower = decoded.toLowerCase();
  if (lower.includes('expired') || lower.includes('otp_expired')) {
    return 'This password reset link has expired. Please request a fresh recovery link below.';
  }
  if (lower.includes('invalid') || lower.includes('access_denied')) {
    return 'This password reset link is invalid or has already been used. Request a new link to continue.';
  }
  return decoded;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const supabaseConfigured = isSupabaseClientConfigured();

  const {
    isAuthenticated,
    passwordRecoveryPending,
    role,
    isStaff,
    isInactiveStaff,
    authorizedAdminModules,
    clearPasswordRecovery,
    refreshSession,
    signOut,
  } = useAuth();

  const [checkingLink, setCheckingLink] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatedSuccess, setUpdatedSuccess] = useState(false);

  // Establish or verify the Supabase Auth recovery session from PKCE ?code= or hash tokens.
  useEffect(() => {
    let active = true;

    async function verifyRecoveryLink() {
      const urlError = readUrlAuthError();
      if (urlError) {
        if (active) {
          setLinkError(urlError);
          setHasRecoverySession(false);
          setCheckingLink(false);
        }
        return;
      }

      const client = getSupabaseClient();
      if (!client) {
        if (active) {
          setCheckingLink(false);
          setHasRecoverySession(false);
        }
        return;
      }

      const pkceCode = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const queryType = searchParams.get('type');

      try {
        if (pkceCode) {
          const { error: exchangeErr } =
            await client.auth.exchangeCodeForSession(pkceCode);
          if (exchangeErr && active) {
            setLinkError(
              'This password reset link is invalid or has expired. Please request a new reset link.',
            );
            setHasRecoverySession(false);
            setCheckingLink(false);
            return;
          }
        } else if (tokenHash && queryType === 'recovery') {
          const { error: verifyErr } = await client.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (verifyErr && active) {
            setLinkError(
              'This password reset link is invalid or has expired. Please request a new reset link.',
            );
            setHasRecoverySession(false);
            setCheckingLink(false);
            return;
          }
        }

        const { data } = await client.auth.getSession();
        if (active) {
          if (data.session) {
            setHasRecoverySession(true);
            setLinkError(null);
          } else {
            // Brief wait for implicit hash fragment listener to hydrate if present
            const hasHashToken =
              window.location.hash.includes('access_token=') ||
              window.location.hash.includes('type=recovery');
            if (hasHashToken) {
              await new Promise((resolve) => window.setTimeout(resolve, 450));
              const retry = await client.auth.getSession();
              if (active) {
                setHasRecoverySession(Boolean(retry.data.session));
              }
            } else {
              setHasRecoverySession(false);
            }
          }
          setCheckingLink(false);
        }
      } catch {
        if (active) {
          setLinkError(
            'Unable to verify your password reset link. Please request a fresh recovery email.',
          );
          setHasRecoverySession(false);
          setCheckingLink(false);
        }
      }
    }

    void verifyRecoveryLink();

    return () => {
      active = false;
    };
  }, [searchParams]);

  // Also respond immediately when AuthContext fires PASSWORD_RECOVERY.
  useEffect(() => {
    if (passwordRecoveryPending || isAuthenticated) {
      setHasRecoverySession(true);
      setLinkError(null);
      setCheckingLink(false);
    }
  }, [passwordRecoveryPending, isAuthenticated]);

  const requirements = useMemo(
    () => [
      { label: 'At least 8 characters', met: password.length >= 8 },
      {
        label: 'Contains uppercase & lowercase letters',
        met: /[A-Z]/.test(password) && /[a-z]/.test(password),
      },
      { label: 'Contains at least one number', met: /\d/.test(password) },
      {
        label: 'Passwords match',
        met: password.length > 0 && password === confirmPassword,
      },
    ],
    [password, confirmPassword],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setFieldErrors({});

    const parsed = updatePasswordSchema.safeParse({
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        nextErrors[String(issue.path[0] ?? 'form')] = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setSubmitError('Supabase Auth is not configured in this environment.');
      return;
    }

    setSubmitting(true);
    const { error } = await client.auth.updateUser({
      password: parsed.data.password,
    });
    setSubmitting(false);

    if (error) {
      const lower = error.message.toLowerCase();
      if (lower.includes('different from the old password')) {
        setSubmitError(
          'Your new password must be different from your current password.',
        );
      } else if (
        lower.includes('session missing') ||
        lower.includes('not authenticated')
      ) {
        setSubmitError(
          'Your recovery session has expired. Please request a new password reset link.',
        );
        setHasRecoverySession(false);
      } else {
        setSubmitError(error.message);
      }
      return;
    }

    clearPasswordRecovery();
    setPassword('');
    setConfirmPassword('');
    setUpdatedSuccess(true);
    await refreshSession();
  };

  const handleContinueToPortal = async () => {
    if (isInactiveStaff) {
      await signOut();
      navigate('/login', { replace: true });
      return;
    }
    const destination = resolvePostLoginDestination({
      role,
      isStaff,
      isInactiveStaff,
      authorizedAdminModules,
    });
    navigate(destination ?? '/login', { replace: true });
  };

  return (
    <div className="bg-[#F5F7FA] px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-md">
        {/* Branded Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#10243A] text-[#F4A62A] shadow-sm">
            <Lock className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
            Secure Password Update · Supabase Auth
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-extrabold text-[#10243A]">
            {updatedSuccess ? 'Password Updated' : 'Set a New Password'}
          </h1>
          <p className="mt-1.5 text-sm text-[#64748B]">
            {updatedSuccess
              ? 'Your Danmusa Global Trade credentials have been updated securely.'
              : 'Choose a strong new password for your customer or staff administrator account.'}
          </p>
        </div>

        {!supabaseConfigured && (
          <div className="mb-5">
            <IntegrationNotice
              title="Supabase Auth Pending Configuration"
              description="Password updates require Supabase Auth credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)."
            />
          </div>
        )}

        <Card>
          {checkingLink ? (
            <div className="space-y-4 py-2">
              <p className="text-center text-xs font-semibold text-[#10243A]">
                Verifying your secure recovery link...
              </p>
              <LoadingSkeleton rows={3} />
            </div>
          ) : updatedSuccess ? (
            <div className="space-y-5">
              <div className="flex flex-col items-center rounded-xl border border-emerald-200 bg-emerald-50/70 px-5 py-6 text-center">
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#16865C] text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h2 className="font-display text-lg font-bold text-[#10243A]">
                  Password Successfully Changed
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-[#202B38]">
                  Your new password is active immediately across the Danmusa Global Trade platform.
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                {isAuthenticated && !isInactiveStaff ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => void handleContinueToPortal()}
                  >
                    {isStaff
                      ? 'Continue to Admin Console'
                      : 'Continue to Customer Portal'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Link to="/login">
                    <Button variant="primary" size="lg" fullWidth>
                      Sign In with New Password
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={async () => {
                    await signOut();
                    navigate('/login', { replace: true });
                  }}
                >
                  Sign Out &amp; Return to Login
                </Button>
              </div>
            </div>
          ) : !hasRecoverySession || linkError ? (
            <div className="space-y-5">
              <div className="flex flex-col items-center rounded-xl border border-amber-200 bg-amber-50/70 px-5 py-6 text-center">
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#D97706] text-white">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h2 className="font-display text-base font-bold text-[#10243A]">
                  Recovery Session Required
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
                  {linkError ??
                    'Open the password reset link directly from your email inbox to verify your identity before choosing a new password.'}
                </p>
              </div>

              <Link to="/forgot-password">
                <Button variant="primary" size="lg" fullWidth>
                  Request a New Reset Link
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {submitError && (
                <ErrorBanner
                  title="Password Update Failed"
                  message={submitError}
                />
              )}

              <AlertBanner
                tone="info"
                title="Recovery Link Verified"
                message="Your single-use recovery link is verified. Enter and confirm your new password below."
              />

              {/* New Password Field with Visibility Toggle */}
              <div>
                <label
                  htmlFor="reset-new-password"
                  className="mb-1.5 block text-xs font-semibold text-[#10243A]"
                >
                  New Password <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: '' }));
                      }
                    }}
                    placeholder="Minimum 8 characters"
                    className={`w-full rounded-lg border bg-white py-2.5 pl-3.5 pr-10 text-sm text-[#202B38] placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
                      fieldErrors.password
                        ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-red-100'
                        : 'border-slate-300 focus:border-[#2563EB] focus:ring-blue-100'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-[#64748B] hover:text-[#10243A] cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-xs font-medium text-[#DC2626]">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Field with Visibility Toggle */}
              <div>
                <label
                  htmlFor="reset-confirm-password"
                  className="mb-1.5 block text-xs font-semibold text-[#10243A]"
                >
                  Confirm New Password <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reset-confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          confirmPassword: '',
                        }));
                      }
                    }}
                    placeholder="Re-enter your new password"
                    className={`w-full rounded-lg border bg-white py-2.5 pl-3.5 pr-10 text-sm text-[#202B38] placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
                      fieldErrors.confirmPassword
                        ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-red-100'
                        : 'border-slate-300 focus:border-[#2563EB] focus:ring-blue-100'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    aria-label={
                      showConfirm
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-[#64748B] hover:text-[#10243A] cursor-pointer"
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs font-medium text-[#DC2626]">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Password Guidance Checklist */}
              <div className="rounded-lg border border-slate-200 bg-[#F5F7FA] p-3.5">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#10243A]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#2563EB]" />
                  Password Security Checklist
                </p>
                <ul className="space-y-1.5">
                  {requirements.map((req) => (
                    <li
                      key={req.label}
                      className={`flex items-center gap-2 text-xs ${
                        req.met
                          ? 'font-medium text-[#16865C]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                          req.met
                            ? 'border-[#16865C] bg-[#16865C] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {req.met && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <span>{req.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

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

          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-[#64748B]">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
            <Link
              to="/forgot-password"
              className="font-medium text-[#64748B] hover:text-[#10243A] hover:underline"
            >
              Request New Link
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
