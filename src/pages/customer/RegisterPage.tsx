import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SelectField, TextField } from '../../components/ui/FormField';
import {
  AlertBanner,
  ErrorBanner,
  IntegrationNotice,
} from '../../components/ui/StateViews';
import { NIGERIAN_STATES } from '../../config/app.config';
import {
  getSupabaseClient,
  isSupabaseClientConfigured,
} from '../../services/supabaseClient';

const registerSchema = z.object({
  fullName: z.string().min(3, 'Enter your full legal or business name.'),
  email: z.string().email('Enter a valid email address.'),
  phone: z
    .string()
    .min(8, 'Enter a valid Nigerian or international phone number.'),
  stateCode: z.string().min(2, 'Select your primary delivery state.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export function RegisterPage() {
  const supabaseConfigured = isSupabaseClientConfigured();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stateCode, setStateCode] = useState('NG-KT');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const parsed = registerSchema.safeParse({
      fullName,
      email,
      phone,
      stateCode,
      password,
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
      setSubmitError(
        'Registration form validation passed. Account creation requires Supabase Auth configuration.',
      );
      return;
    }

    setSubmitting(true);
    const { error } = await client.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
          default_state_code: parsed.data.stateCode,
        },
      },
    });
    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
    } else {
      setSubmitSuccess(
        'Verification email sent via Supabase Auth. Confirm your email address to activate your Registered Customer profile.',
      );
    }
  };

  return (
    <div className="bg-[#F5F7FA] px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#10243A] text-[#F4A62A]">
            <UserPlus className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
            Customer Onboarding
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-extrabold text-[#10243A]">
            Create a Customer Account
          </h1>
          <p className="mt-1.5 text-sm text-[#64748B]">
            Register to place ready-stock orders, request wholesale sourcing from China, review quotations, and track deliveries.
          </p>
        </div>

        {!supabaseConfigured && (
          <div className="mb-5">
            <IntegrationNotice
              title="Supabase Auth Pending Configuration"
              description="Customer registration connects directly to Supabase Auth & Row-Level Security once configured."
            />
          </div>
        )}

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {submitError && (
              <ErrorBanner title="Registration Error" message={submitError} />
            )}
            {submitSuccess && (
              <AlertBanner
                tone="success"
                title="Verification Email Sent"
                message={submitSuccess}
              />
            )}

            <TextField
              id="reg-name"
              label="Full Name or Business Name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={errors.fullName}
              placeholder="e.g., Ibrahim Musa Enterprises"
            />

            <TextField
              id="reg-email"
              label="Email Address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              placeholder="you@example.com"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                id="reg-phone"
                label="Phone Number"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
                placeholder="+234 ..."
              />

              <SelectField
                id="reg-state"
                label="Primary Delivery State"
                required
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                error={errors.stateCode}
              >
                {NIGERIAN_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </SelectField>
            </div>

            <TextField
              id="reg-password"
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              placeholder="Minimum 8 characters"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={submitting}
            >
              {submitting ? 'Creating Account...' : 'Create Customer Account'}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-[#64748B]">
            Already registered?{' '}
            <Link
              to="/login"
              className="font-semibold text-[#2563EB] hover:underline"
            >
              Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
