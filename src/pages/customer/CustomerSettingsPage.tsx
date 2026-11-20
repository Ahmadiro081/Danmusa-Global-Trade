import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, Save } from 'lucide-react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/FormField';
import { AlertBanner, ErrorBanner } from '../../components/ui/StateViews';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/apiClient';
import { fetchPublicStates } from '../../services/catalogueService';
import { getSupabaseClient } from '../../services/supabaseClient';
import type { LiveNigerianState } from '../../types/domain';
import { CUSTOMER_PORTAL_NAV } from './customerNav';

export function CustomerSettingsPage() {
  const { accessToken, profile, user, refreshSession } = useAuth();

  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [defaultStateId, setDefaultStateId] = useState(
    profile?.defaultStateId ?? '',
  );
  const [liveStates, setLiveStates] = useState<LiveNigerianState[]>([]);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.fullName ?? '');
    setPhone(profile?.phone ?? '');
    setDefaultStateId(profile?.defaultStateId ?? '');
  }, [profile]);

  useEffect(() => {
    fetchPublicStates()
      .then((rows) => setLiveStates(rows))
      .catch(() => setLiveStates([]));
  }, []);

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const payload: Record<string, unknown> = {};
      if (fullName.trim().length >= 2) payload.fullName = fullName.trim();
      if (phone.trim().length >= 7) payload.phone = phone.trim();
      if (defaultStateId) payload.defaultStateId = defaultStateId;

      await apiFetch('/api/customer/profile', {
        method: 'PATCH',
        accessToken,
        body: payload,
      });
      await refreshSession();
      setProfileSuccess('Your profile information has been saved.');
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Unable to save profile updates.',
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setPasswordError('Supabase Auth is not configured in this environment.');
      return;
    }

    setPasswordSaving(true);
    const { error } = await client.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);

    if (error) {
      setPasswordError(error.message);
    } else {
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Your account password has been updated.');
    }
  };

  return (
    <PortalLayout
      portalTitle="Customer Portal"
      portalSubtitle="Profile & Security"
      breadcrumbCurrent="Account Settings"
      navItems={CUSTOMER_PORTAL_NAV}
    >
      <div>
        <h1 className="font-display text-2xl font-extrabold text-[#10243A]">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Update your trade profile details, default Nigerian delivery state, and authentication password.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Form */}
        <Card>
          <h2 className="font-display text-base font-bold text-[#10243A]">
            Personal &amp; Business Profile
          </h2>
          <p className="mt-1 text-xs text-[#64748B]">
            Signed in as <span className="font-mono">{profile?.email || user?.email}</span>
          </p>

          <form onSubmit={handleProfileSave} className="mt-5 space-y-4">
            {profileError && (
              <ErrorBanner title="Profile update failed" message={profileError} />
            )}
            {profileSuccess && (
              <AlertBanner
                tone="success"
                title="Profile Saved"
                message={profileSuccess}
              />
            )}

            <TextField
              id="set-name"
              label="Full Name or Business Name"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <TextField
              id="set-phone"
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234 ..."
            />

            <SelectField
              id="set-state"
              label="Default Delivery State"
              value={defaultStateId}
              onChange={(e) => setDefaultStateId(e.target.value)}
            >
              <option value="">Select primary state</option>
              {liveStates.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </SelectField>

            <Button type="submit" variant="primary" disabled={profileSaving}>
              <Save className="h-4 w-4" />
              {profileSaving ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </form>
        </Card>

        {/* Password Security Form */}
        <Card>
          <h2 className="font-display text-base font-bold text-[#10243A]">
            Update Password
          </h2>
          <p className="mt-1 text-xs text-[#64748B]">
            Passwords are managed securely by Supabase Authentication.
          </p>

          <form onSubmit={handlePasswordChange} className="mt-5 space-y-4">
            {passwordError && (
              <ErrorBanner
                title="Password update failed"
                message={passwordError}
              />
            )}
            {passwordSuccess && (
              <AlertBanner
                tone="success"
                title="Password Updated"
                message={passwordSuccess}
              />
            )}

            <TextField
              id="set-new-pw"
              label="New Password"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />

            <TextField
              id="set-confirm-pw"
              label="Confirm New Password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
            />

            <Button type="submit" variant="navy" disabled={passwordSaving}>
              <KeyRound className="h-4 w-4" />
              {passwordSaving ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </Card>
      </div>
    </PortalLayout>
  );
}
