import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FieldWrapper, TextInput } from '../../components/ui/FormField';
import { ErrorBanner, IntegrationNotice } from '../../components/ui/StateViews';
import {
  getSupabaseClient,
  isSupabaseClientConfigured,
} from '../../services/supabaseClient';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export function LoginPage() {
  const supabaseConfigured = isSupabaseClientConfigured();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);

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
    const client = getSupabaseClient();
    if (!client) {
      setAuthError(
        'Supabase Auth is not yet configured in this environment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable real authentication.',
      );
      return;
    }

    setSubmitting(true);
    const { error } = await client.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setSubmitting(false);

    if (error) {
      setAuthError(error.message);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold text-[#8E6B0C]">DGT Customer Portal</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-[#0B1E3D]">
          Sign In to Your Account
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Access your orders, quotations, and China-to-Nigeria shipment tracking.
        </p>
      </div>

      {!supabaseConfigured ? (
        <div className="mb-6">
          <IntegrationNotice
            title="Supabase Auth Pending Configuration"
            description="No fake authentication is permitted. Sign-in connects directly to Supabase Auth once VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured."
          />
        </div>
      ) : null}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {authError ? <ErrorBanner title="Sign In Blocked" message={authError} /> : null}

          <FieldWrapper
            id="login-email"
            label="Email Address"
            required
            error={errors.email}
          >
            <TextInput
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </FieldWrapper>

          <FieldWrapper
            id="login-password"
            label="Password"
            required
            error={errors.password}
          >
            <TextInput
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />
          </FieldWrapper>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-600">
          Need a trade account?{' '}
          <Link to="/register" className="font-semibold text-[#0B1E3D] hover:underline">
            Register as a Customer
          </Link>
        </div>
      </Card>
    </div>
  );
}
