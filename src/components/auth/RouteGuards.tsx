import { Lock, ShieldAlert } from 'lucide-react';
import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_MODULES } from '../../pages/admin/adminModules';
import { ROLE_LABELS } from '../../utils/authRouting';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LoadingSkeleton } from '../ui/StateViews';

function AuthVerificationScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
            Danmusa Global Trade
          </p>
          <p className="mt-1 font-display text-lg font-bold text-[#10243A]">
            {label}
          </p>
        </div>
        <LoadingSkeleton rows={3} />
      </div>
    </div>
  );
}

function AccessDeniedScreen({
  title,
  description,
  primaryAction,
  showSignOut = true,
}: {
  title: string;
  description: string;
  primaryAction?: { to: string; label: string };
  showSignOut?: boolean;
}) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] p-4">
      <Card className="w-full max-w-lg">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#DC2626]/25 bg-[#DC2626]/10 text-[#DC2626]">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#DC2626]">
              Access Denied · RBAC Enforcement
            </p>
            <h1 className="font-display text-xl font-bold text-[#10243A]">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-[#64748B]">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
          {primaryAction && (
            <Link to={primaryAction.to}>
              <Button variant="primary" size="sm">
                {primaryAction.label}
              </Button>
            </Link>
          )}
          <Link to="/">
            <Button variant="outline" size="sm">
              Return to Storefront
            </Button>
          </Link>
          {showSignOut && (
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

export function RequireCustomerAuth() {
  const { loading, isAuthenticated, isStaff, isInactiveStaff } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthVerificationScreen label="Verifying Customer Session..." />;
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (isInactiveStaff) {
    return (
      <AccessDeniedScreen
        title="Staff Account Inactive"
        description="Your staff account is currently deactivated and cannot access portal workspaces. Contact the Super Administrator for account review."
      />
    );
  }

  if (isStaff) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}

export function RequireStaffAuth() {
  const {
    loading,
    isAuthenticated,
    isStaff,
    isInactiveStaff,
    role,
    canAccessModule,
  } = useAuth();
  const location = useLocation();
  const { moduleSlug } = useParams<{ moduleSlug?: string }>();

  if (loading) {
    return <AuthVerificationScreen label="Verifying Staff Authorization..." />;
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?portal=staff&next=${next}`} replace />;
  }

  if (isInactiveStaff) {
    return (
      <AccessDeniedScreen
        title="Administrative Access Suspended"
        description="Your DGT staff account is marked inactive in the database. All administrative routes and API endpoints remain blocked until reactivated by a Super Administrator."
      />
    );
  }

  if (!isStaff || !role) {
    return (
      <AccessDeniedScreen
        title="Administrative Operations Restricted"
        description="You are signed in as a Registered Customer. Administrative dashboards and operational APIs require an active verified staff account."
        primaryAction={{ to: '/account', label: 'Go to My Account' }}
      />
    );
  }

  if (moduleSlug && ADMIN_MODULES[moduleSlug] && !canAccessModule(moduleSlug)) {
    const spec = ADMIN_MODULES[moduleSlug];
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] p-4">
        <Card className="w-full max-w-lg">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#D97706]/30 bg-[#FEF7E7] text-[#B45309]">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#B45309]">
                Module Restricted · Role: {ROLE_LABELS[role]}
              </p>
              <h1 className="font-display text-xl font-bold text-[#10243A]">
                Access to {spec.title} Is Not Authorized
              </h1>
              <p className="text-sm leading-relaxed text-[#64748B]">
                The <span className="font-semibold text-[#10243A]">{spec.title}</span>{' '}
                module is restricted to: {spec.authorizedRoles.join(', ')}.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
            <Link to="/admin">
              <Button variant="primary" size="sm">
                Return to Authorized Overview
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return <Outlet />;
}
