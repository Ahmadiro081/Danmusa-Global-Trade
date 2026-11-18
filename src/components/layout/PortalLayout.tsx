import { ArrowLeft, Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
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

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0B1E3D] text-slate-200">
      <div className="border-b border-white/10 px-5 py-4">
        <Link to="/" className="inline-block">
          <BrandLogo compact inverted />
        </Link>
        <p className="mt-2 text-xs font-semibold text-[#C59B27]">{portalTitle}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{portalSubtitle}</p>
      </div>

      <nav
        aria-label={`${portalTitle} navigation`}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap truncate transition-colors duration-150 ${
                isActive
                  ? 'bg-[#C59B27] text-[#0B1E3D] font-semibold'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Return to Public Storefront
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-[#0B1E3D]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#0B1E3D]/60"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] h-full">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close portal navigation"
              className="absolute right-3 top-3 inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-slate-300 hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open portal navigation"
              className="inline-flex lg:hidden min-h-[40px] min-w-[40px] items-center justify-center rounded-md border border-slate-200 text-[#0B1E3D] hover:bg-slate-50 cursor-pointer"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span className="font-medium text-slate-700">{portalTitle}</span>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-[#0B1E3D] truncate">
                {breadcrumbCurrent}
              </span>
            </div>
          </div>

          {topAction ? <div className="shrink-0">{topAction}</div> : null}
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
