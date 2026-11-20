import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable, type TableColumn } from '../../components/ui/DataTable';
import { ErrorBanner, LoadingSkeleton } from '../../components/ui/StateViews';
import { RBAC_ROLES } from '../../config/app.config';
import { useAuth } from '../../context/AuthContext';
import {
  apiFetch,
  fetchPlatformHealth,
  probeAdminAuthStatus,
  type HealthResponse,
} from '../../services/apiClient';
import type { RoleDefinition } from '../../types/domain';
import { ROLE_LABELS } from '../../utils/authRouting';
import { getAdminNavForRole } from './adminModules';

const ROLE_COLUMNS: TableColumn<RoleDefinition>[] = [
  {
    key: 'name',
    header: 'Role Title',
    render: (role) => (
      <span className="font-semibold text-[#10243A]">{role.name}</span>
    ),
  },
  {
    key: 'slug',
    header: 'System Slug',
    render: (role) => (
      <span className="font-mono text-xs text-[#2563EB]">{role.slug}</span>
    ),
  },
  {
    key: 'scope',
    header: 'Tier',
    render: (role) => (
      <StatusBadge
        tone={
          role.scope === 'administrative'
            ? 'navy'
            : role.scope === 'operational'
              ? 'info'
              : 'neutral'
        }
      >
        {role.scope}
      </StatusBadge>
    ),
  },
  {
    key: 'domains',
    header: 'Authorized Domains',
    render: (role) => (
      <span className="text-xs text-[#64748B]">
        {role.keyDomains.join(' · ')}
      </span>
    ),
  },
];

interface ReportsSummary {
  ordersTotalCount: number;
  awaitingBankTransferVerificationCount: number;
}

export function AdminOverviewPage() {
  const {
    accessToken,
    profile,
    user,
    role,
    staffAccount,
    authorizedAdminModules,
    canAccessModule,
  } = useAuth();

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [authProbe, setAuthProbe] = useState<{
    ok: boolean;
    status: number;
    message: string;
  } | null>(null);
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  const navItems = getAdminNavForRole(role, authorizedAdminModules);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setHealthError(null);

    async function loadDiagnostics() {
      const [healthResult, adminProbeResult] = await Promise.allSettled([
        fetchPlatformHealth(),
        probeAdminAuthStatus(accessToken),
      ]);

      if (!active) return;

      if (healthResult.status === 'fulfilled') {
        setHealth(healthResult.value);
      } else {
        setHealthError(
          healthResult.reason instanceof Error
            ? healthResult.reason.message
            : 'Unable to reach platform API.',
        );
      }

      if (adminProbeResult.status === 'fulfilled') {
        const adminProbeRes = adminProbeResult.value;
        const message =
          'message' in adminProbeRes.payload && adminProbeRes.payload.message
            ? adminProbeRes.payload.message
            : 'error' in adminProbeRes.payload
              ? adminProbeRes.payload.error
              : 'Verified';
        setAuthProbe({
          ok: adminProbeRes.ok,
          status: adminProbeRes.status,
          message,
        });
      }

      if (accessToken && canAccessModule('reports')) {
        try {
          const reportData = await apiFetch<ReportsSummary>(
            '/api/admin/reports/summary',
            { accessToken },
          );
          if (active) setSummary(reportData);
        } catch {
          // Non-blocking if report query fails
        }
      }

      if (active) setLoading(false);
    }

    void loadDiagnostics();
    return () => {
      active = false;
    };
  }, [accessToken, canAccessModule, reloadTick]);

  const integrationEntries = health
    ? [
        {
          label: 'Supabase Browser Auth',
          ready: health.integrations.supabaseClient,
          env: 'VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY',
        },
        {
          label: 'Supabase Server Admin & DB',
          ready: health.integrations.supabaseAdmin,
          env: 'SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY',
        },
        {
          label: 'Cloudinary Media Storage',
          ready: health.integrations.cloudinary,
          env: 'CLOUDINARY_CLOUD_NAME + API_KEY + API_SECRET',
        },
        {
          label: 'Resend Email Service',
          ready: health.integrations.resend,
          env: 'RESEND_API_KEY',
        },
        {
          label: 'WhatsApp Business API',
          ready: health.integrations.whatsapp,
          env: 'WHATSAPP_BUSINESS_TOKEN + PHONE_NUMBER_ID',
        },
      ]
    : [];

  return (
    <PortalLayout
      portalTitle="Admin Console"
      portalSubtitle={role ? ROLE_LABELS[role] : 'Staff Operations'}
      breadcrumbCurrent="Overview"
      navItems={navItems}
      topAction={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReloadTick((n) => n + 1)}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {canAccessModule('settings') && (
            <Link to="/admin/settings">
              <Button variant="primary" size="sm">
                Settings
              </Button>
            </Link>
          )}
        </div>
      }
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
          Enterprise Operations
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-[#10243A]">
          Administrative Operations Overview
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Verified staff console backed by Supabase Auth, PostgreSQL Row-Level Security, and server-enforced RBAC.
        </p>
      </div>

      {/* Executive Staff Identity Card */}
      <Card>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#10243A] text-[#F4A62A]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base font-bold text-[#10243A]">
                  {profile?.fullName || user?.email || 'DGT Staff Member'}
                </h2>
                <StatusBadge tone="success">Active Staff Session</StatusBadge>
              </div>
              <p className="mt-1 text-xs text-[#64748B]">
                {profile?.email || user?.email} ·{' '}
                <span className="font-semibold text-[#10243A]">
                  {role ? ROLE_LABELS[role] : 'Staff'}
                </span>
                {staffAccount?.department ? ` · ${staffAccount.department}` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-slate-100 pt-3 text-xs sm:border-t-0 sm:pt-0 sm:text-right">
            <div>
              <p className="text-[#64748B]">Backend Auth Check</p>
              <p className="mt-0.5 font-mono font-bold tabular-nums text-[#16865C]">
                {authProbe ? `HTTP ${authProbe.status}` : 'Checking...'}
              </p>
            </div>
            <div>
              <p className="text-[#64748B]">Authorized Modules</p>
              <p className="mt-0.5 font-mono font-bold tabular-nums text-[#10243A]">
                {navItems.length}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Live Operational Ledger Summary (only when role has reports access) */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#64748B]">
                Total Database Orders
              </p>
              <Layers className="h-4 w-4 text-[#2563EB]" />
            </div>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#10243A]">
              {summary.ordersTotalCount}
            </p>
            <p className="mt-1 text-[11px] text-[#64748B]">
              Live count from PostgreSQL <code className="font-mono">orders</code>
            </p>
          </Card>

          <Card padding="sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#64748B]">
                Bank Transfers Awaiting Verification
              </p>
              <Clock className="h-4 w-4 text-[#D97706]" />
            </div>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#B45309]">
              {summary.awaitingBankTransferVerificationCount}
            </p>
            <Link
              to="/admin/payments"
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] hover:underline"
            >
              Open Payments queue
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Card>
        </div>
      )}

      {/* Quick Access Authorized Modules */}
      <Card>
        <div className="border-b border-slate-200 pb-3.5">
          <h2 className="font-display text-base font-bold text-[#10243A]">
            Authorized Operational Modules
          </h2>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Direct navigation filtered strictly to your server-verified role permissions.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
          {navItems
            .filter((item) => item.to !== '/admin')
            .map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#F5F7FA] px-3.5 py-2.5 text-xs font-semibold text-[#10243A] transition-colors hover:border-[#2563EB] hover:bg-white hover:text-[#2563EB]"
              >
                <span className="truncate">{item.label}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
              </Link>
            ))}
        </div>
      </Card>

      {/* External Integration Readiness */}
      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : healthError ? (
        <ErrorBanner
          title="Backend API Unreachable"
          message={healthError}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadTick((n) => n + 1)}
            >
              Retry API Check
            </Button>
          }
        />
      ) : (
        <Card>
          <div className="flex flex-col gap-1 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-[#10243A]">
                Platform Integration Status
              </h2>
              <p className="text-xs text-[#64748B]">
                Reported live by <code className="font-mono">/api/health</code> without exposing secret keys.
              </p>
            </div>
            <span className="font-mono text-xs font-medium text-[#64748B]">
              {health?.stage}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {integrationEntries.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-slate-200 bg-[#F5F7FA] p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#10243A]">
                    {item.label}
                  </span>
                  <StatusBadge tone={item.ready ? 'success' : 'warning'}>
                    {item.ready ? 'Configured' : 'Pending'}
                  </StatusBadge>
                </div>
                <p className="mt-1.5 truncate font-mono text-[11px] text-[#64748B]">
                  {item.env}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 10-Role RBAC Matrix */}
      <div className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold text-[#10243A]">
            10-Role RBAC Governance Matrix
          </h2>
          <p className="text-xs text-[#64748B]">
            Enforced via PostgreSQL Row-Level Security (<code className="font-mono">has_staff_role</code>) and Express middleware.
          </p>
        </div>

        <DataTable
          columns={ROLE_COLUMNS}
          rows={[...RBAC_ROLES]}
          rowKey={(r) => r.slug}
          searchable
          searchPlaceholder="Filter roles or domains..."
          emptyTitle="No roles found"
          emptyDescription="Adjust your filter to view roles."
          renderMobileCard={(r) => (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-[#10243A]">{r.name}</p>
                <StatusBadge
                  tone={
                    r.scope === 'administrative'
                      ? 'navy'
                      : r.scope === 'operational'
                        ? 'info'
                        : 'neutral'
                  }
                >
                  {r.scope}
                </StatusBadge>
              </div>
              <p className="font-mono text-[11px] text-[#2563EB]">{r.slug}</p>
              <p className="text-xs text-[#64748B]">
                {r.keyDomains.join(' · ')}
              </p>
            </div>
          )}
        />
      </div>

      {/* Compact security note */}
      <div className="flex items-center gap-2 text-xs text-[#64748B]">
        <CheckCircle2 className="h-4 w-4 text-[#16865C]" />
        <span>
          All administrative operations require server-verified JWT tokens and write immutable records to <code className="font-mono">audit_logs</code>.
        </span>
      </div>
    </PortalLayout>
  );
}
