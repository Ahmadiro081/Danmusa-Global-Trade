import { Menu, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { BrandLogo } from '../ui/BrandLogo';

const PRIMARY_NAV_LINKS = [
  { to: '/catalogue', label: 'Catalogue' },
  { to: '/sourcing', label: 'Sourcing' },
  { to: '/logistics', label: 'Logistics' },
  { to: '/account', label: 'Account' },
  { to: '/admin', label: 'Admin' },
] as const;

export function Navbar() {
  const { totalCount, openDrawer } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <Link
          to="/"
          className="whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1E3D] focus-visible:ring-offset-2 rounded"
        >
          <BrandLogo />
        </Link>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          {PRIMARY_NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 transition-colors duration-150 hover:text-[#0B1E3D] ${
                  isActive
                    ? 'text-[#0B1E3D] border-b-2 border-[#C59B27]'
                    : 'border-b-2 border-transparent'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: 1 primary CTA button + mobile menu trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openDrawer}
            aria-label={`Open shopping bag with ${totalCount} items`}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-[#0B1E3D] px-4 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 hover:bg-[#15315E] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1E3D] focus-visible:ring-offset-2"
          >
            <ShoppingBag className="w-4 h-4 text-[#C59B27]" aria-hidden="true" />
            <span>Bag</span>
            <span className="tabular-nums font-mono">({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex md:hidden min-h-[40px] min-w-[40px] items-center justify-center rounded-md border border-slate-200 text-[#0B1E3D] hover:bg-slate-50 cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen ? (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-slate-200 bg-white px-4 py-4 md:hidden"
        >
          <div className="flex flex-col space-y-1">
            {PRIMARY_NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2.5 text-sm font-medium ${
                    isActive
                      ? 'bg-[#0B1E3D] text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-slate-200 flex gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center rounded-md border border-slate-300 px-3 py-2.5 text-sm font-medium text-[#0B1E3D]"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center rounded-md bg-[#C59B27] px-3 py-2.5 text-sm font-semibold text-[#0B1E3D]"
              >
                Register
              </Link>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
