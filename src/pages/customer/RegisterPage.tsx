import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  FieldWrapper,
  SelectInput,
  TextInput,
} from '../../components/ui/FormField';
import { ErrorBanner, IntegrationNotice } from '../../components/ui/StateViews';
import { NIGERIAN_STATES } from '../../config/app.config';
import {
  getSupabaseClient,
  isSupabaseClientConfigured,
} from '../../services/supabaseClient';

const registerSchema = z.object({
  fullName: z.string().min(3, 'Enter your full legal or business name.'),
  email: z.string().email('Enter a valid email address.'),
  phone: z.string().min(8, 'Enter a valid Nigerian or international phone number.'),
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
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitMessage(null);

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
      setSubmitMessage(
        'Registration form validation passed. Account creation requires Supabase Auth configuration (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).',
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
      setSubmitMessage(error.message);
    } else {
      setSubmitMessage(
        'Verification email sent via Supabase Auth. Confirm your email to activate your Registered Customer profile.',
      );
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold text-[#8E6B0C]">DGT Account Onboarding</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-[#0B1E3D]">
          Create a Customer Account
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Register for ready-stock orders, wholesale sourcing requests, and quotation
          approvals.
        </p>
      </div>

      {!supabaseConfigured ? (
        <div className="mb-6">
          <IntegrationNotice
            title="Supabase Auth Pending Configuration"
            description="Customer registration enforces email verification and Registered Customer isolation via Supabase Auth & RLS once environment variables are provided."
          />
        </div>
      ) : null}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {submitMessage ? (
            <ErrorBanner title="Registration Status" message={submitMessage} />
          ) : null}

          <FieldWrapper
            id="reg-name"
            label="Full Name or Business Name"
            required
            error={errors.fullName}
          >
            <TextInput
              id="reg-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ibrahim Musa Enterprises"
            />
          </FieldWrapper>

          <FieldWrapper
            id="reg-email"
            label="Email Address"
            required
            error={errors.email}
          >
            <TextInput
              id="reg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </FieldWrapper>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldWrapper
              id="reg-phone"
              label="Phone Number"
              required
              error={errors.phone}
            >
              <TextInput
                id="reg-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 ..."
              />
            </FieldWrapper>

            <FieldWrapper
              id="reg-state"
              label="Primary Delivery State"
              required
              error={errors.stateCode}
            >
              <SelectInput
                id="reg-state"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
              >
                {NIGERIAN_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </SelectInput>
            </FieldWrapper>
          </div>

          <FieldWrapper
            id="reg-password"
            label="Password"
            required
            error={errors.password}
          >
            <TextInput
              id="reg-password"
              type="password"
              autoComplete="new-password"
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
            {submitting ? 'Submitting...' : 'Create Customer Account'}
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-[#0B1E3D] hover:underline">
            Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
