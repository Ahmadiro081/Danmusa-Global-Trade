import { ArrowLeft, LogOut, Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/authRouting';
import { BrandLogo } from '../ui/BrandLogo';

export interface PortalNavItem {
  to: string;
  label: string;
  end?: boolean;
}

interface PortalLayoutProps {
  portalTitle: string;
  portalSubtitle: string;
  breadcrumbCurrent: string;
  navItems: readonly PortalNavItem[];
  topAction?: ReactNode;
  children: ReactNode;
}

export function PortalLayout({
  portalTitle,
  portalSubtitle,
  breadcrumbCurrent,
  navItems,
  topAction,
  children,
}: PortalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, profile, user, role, staffAccount, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    setSidebarOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName =
    profile?.fullName?.trim() || profile?.email || user?.email || 'Authenticated User';
  const roleLabel = role ? ROLE_LABELS[role] : null;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#10243A] text-slate-200">
      <div className="border-b border-white/10 px-5 py-4">
        <Link to="/" className="inline-block">
          <BrandLogo compact variant="light" />
        </Link>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#F4A62A]">
            {portalTitle}
          </p>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-slate-400">
          {portalSubtitle}
        </p>
      </div>

      <nav
        aria-label={`${portalTitle} navigation`}
        className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `block truncate whitespace-nowrap rounded-lg px-3.5 py-2.5 text-xs font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-[#2563EB] font-semibold text-white shadow-xs'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-white/10 bg-[#0B1929]/60 p-4">
        {isAuthenticated && (
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs">
            <p className="truncate font-semibold text-white">{displayName}</p>
            {roleLabel && (
              <p className="mt-0.5 truncate text-[11px] text-[#F4A62A]">
                {roleLabel}
                {staffAccount?.department ? ` · ${staffAccount.department}` : ''}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Return to Storefront
          </Link>

          {isAuthenticated && (
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 text-left text-xs font-medium text-slate-300 transition-colors hover:text-[#F4A62A] cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F5F7FA] text-[#202B38]">
      {/* Desktop Deep Navy Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#10243A]/60 backdrop-blur-[1px]"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-64 max-w-[82vw]">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close portal navigation"
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open portal navigation"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-[#10243A] hover:bg-[#F5F7FA] lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 truncate text-xs text-[#64748B]">
              <span className="font-medium text-[#64748B]">{portalTitle}</span>
              <span aria-hidden="true">/</span>
              <span className="truncate font-semibold text-[#10243A]">
                {breadcrumbCurrent}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {topAction && <div>{topAction}</div>}
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-[#202B38] transition-colors hover:border-slate-300 hover:bg-[#F5F7FA] cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
