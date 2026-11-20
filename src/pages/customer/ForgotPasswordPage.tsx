import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Mail,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextField } from '../../components/ui/FormField';
import {
  AlertBanner,
  ErrorBanner,
  IntegrationNotice,
} from '../../components/ui/StateViews';
import {
  ApiRequestError,
  requestPasswordReset,
} from '../../services/apiClient';
import {
  getSupabaseClient,
  isSupabaseClientConfigured,
} from '../../services/supabaseClient';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter a valid email address associated with your DGT account.'),
});

const RESEND_COOLDOWN_SECONDS = 45;

export function ForgotPasswordPage() {
  const supabaseConfigured = isSupabaseClientConfigured();

  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deliveryChannel, setDeliveryChannel] = useState<'resend' | 'supabase' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const dispatchResetRequest = async (targetEmail: string) => {
    setSubmitError(null);
    setSubmitting(true);

    const redirectTo = `${window.location.origin}/reset-password`;

    try {
      const response = await requestPasswordReset(targetEmail, redirectTo);
      setSubmittedEmail(targetEmail);
      setDeliveryChannel('resend');
      setSuccessMessage(response.message);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      // If Resend is not yet configured on the server, fall back gracefully to Supabase native recovery email.
      if (
        err instanceof ApiRequestError &&
        (err.code === 'RESEND_NOT_CONFIGURED' || err.status === 503)
      ) {
        const client = getSupabaseClient();
        if (client) {
          const { error: sbError } = await client.auth.resetPasswordForEmail(
            targetEmail,
            { redirectTo },
          );
          if (!sbError) {
            setSubmittedEmail(targetEmail);
            setDeliveryChannel('supabase');
            setSuccessMessage(
              'If an account exists for that email address, a secure password reset link has been sent. Check your inbox and spam folder.',
            );
            setCooldown(RESEND_COOLDOWN_SECONDS);
            return;
          }
          setSubmitError(sbError.message);
          return;
        }
      }

      if (err instanceof ApiRequestError) {
        setSubmitError(err.message);
      } else {
        setSubmitError(
          'Unable to process your password reset request right now. Please try again in a moment.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFieldError(null);
    setSubmitError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(
        parsed.error.issues[0]?.message ?? 'Please enter a valid email address.',
      );
      return;
    }

    await dispatchResetRequest(parsed.data.email);
  };

  const handleResend = async () => {
    if (!submittedEmail || cooldown > 0 || submitting) return;
    await dispatchResetRequest(submittedEmail);
  };

  return (
    <div className="bg-[#F5F7FA] px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-md">
        {/* Branded Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#10243A] text-[#F4A62A] shadow-sm">
            <KeyRound className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
            Unified Account Recovery · Customers &amp; Staff
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-extrabold text-[#10243A]">
            Reset Your Password
          </h1>
          <p className="mt-1.5 text-sm text-[#64748B]">
            Enter the email address registered to your Danmusa Global Trade customer or staff account and we will send you a secure single-use reset link.
          </p>
        </div>

        {!supabaseConfigured && (
          <div className="mb-5">
            <IntegrationNotice
              title="Supabase Auth Pending Configuration"
              description="Password recovery requires Supabase Authentication credentials in your deployment environment."
            />
          </div>
        )}

        <Card>
          {submittedEmail && successMessage ? (
            <div className="space-y-5">
              <div className="flex flex-col items-center rounded-xl border border-emerald-200 bg-emerald-50/70 px-5 py-6 text-center">
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#16865C] text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h2 className="font-display text-lg font-bold text-[#10243A]">
                  Check Your Email
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-[#202B38]">
                  {successMessage}
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-[#10243A]">
                  <Mail className="h-3.5 w-3.5 text-[#2563EB]" />
                  <span>{submittedEmail}</span>
                </div>
              </div>

              {submitError && (
                <ErrorBanner title="Resend Failed" message={submitError} />
              )}

              <AlertBanner
                tone="info"
                title="What happens next?"
                message={
                  deliveryChannel === 'resend'
                    ? 'Open the Danmusa Global Trade recovery email and click "Reset Your Password". You will be brought directly to the secure password update form.'
                    : 'Open the recovery email and follow the secure link to set your new password. Recovery links expire automatically for your protection.'
                }
              />

              <div className="flex flex-col gap-2.5 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={handleResend}
                  disabled={submitting || cooldown > 0}
                >
                  <RotateCcw className="h-4 w-4" />
                  {submitting
                    ? 'Sending...'
                    : cooldown > 0
                      ? `Resend in ${cooldown}s`
                      : 'Resend Reset Link'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setSubmittedEmail(null);
                    setSuccessMessage(null);
                    setSubmitError(null);
                  }}
                >
                  Use Different Email
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {submitError && (
                <ErrorBanner
                  title="Password Reset Error"
                  message={submitError}
                />
              )}

              <TextField
                id="forgot-email"
                label="Registered Email Address"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError(null);
                }}
                error={fieldError ?? undefined}
                placeholder="you@example.com"
                helperText="Works for both Registered Customers and DGT Staff Administrators."
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

              <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-[#F5F7FA] p-3 text-xs text-[#64748B]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#10243A]" />
                <span>
                  For account protection, reset links are single-use, cryptographically signed by Supabase Auth, and expire automatically.
                </span>
              </div>
            </form>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-xs text-[#64748B]">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
            <Link
              to="/register"
              className="font-medium text-[#64748B] hover:text-[#10243A] hover:underline"
            >
              Create Customer Account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
