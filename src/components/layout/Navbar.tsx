import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  Globe,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { BrandLogo } from '../ui/BrandLogo';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { CURRENCIES } from '../../config/app.config';
import { STOREFRONT_CATEGORY_DIRECTORY } from '../../config/categories';
import { ROLE_LABELS } from '../../utils/authRouting';
import type { CurrencyCode } from '../../types/domain';

export function Navbar() {
  const { totalCount, openDrawer, displayCurrency, setDisplayCurrency } = useCart();
  const { isAuthenticated, isStaff, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const megaMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMegaMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  // Close mega menu on outside click or Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMegaMenuOpen(false);
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target as Node)) {
        setMegaMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }
  }, [searchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    if (trimmed) {
      navigate(`/catalogue?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/catalogue');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors whitespace-nowrap ${
      isActive ? 'text-[#2563EB]' : 'text-[#202B38] hover:text-[#2563EB]'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      {/* Slim Corporate Trade Bar */}
      <div className="bg-[#10243A] text-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-[11px] sm:px-6 lg:px-8">
          <p className="truncate font-medium">
            Your Trusted China-to-Nigeria Trade Partner — Ready Stock &amp; Direct China Sourcing
          </p>
          <div className="hidden items-center gap-4 md:flex">
            <Link to="/logistics" className="text-slate-300 transition-colors hover:text-white">
              Shipping &amp; Logistics
            </Link>
            <span className="text-slate-600" aria-hidden="true">|</span>
            <label className="inline-flex items-center gap-1.5 text-slate-300">
              <Globe className="h-3 w-3 text-[#F4A62A]" />
              <span className="sr-only">Display currency</span>
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value as CurrencyCode)}
                aria-label="Select display currency"
                className="bg-transparent text-[11px] font-semibold text-white focus:outline-none cursor-pointer"
              >
                {Object.values(CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code} className="text-[#10243A]">
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Main Sticky Header Bar */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Danmusa Global Trade Home" className="shrink-0">
          <BrandLogo compact />
        </Link>

        {/* Desktop Primary Navigation */}
        <nav className="hidden items-center gap-6 xl:gap-7 lg:flex" aria-label="Main navigation">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/catalogue" className={navLinkClass}>
            Shop
          </NavLink>

          {/* Categories Multi-Column Mega Menu */}
          <div
            ref={megaMenuRef}
            className="relative"
            onMouseEnter={() => setMegaMenuOpen(true)}
            onMouseLeave={() => setMegaMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => setMegaMenuOpen((prev) => !prev)}
              aria-expanded={megaMenuOpen}
              className={`inline-flex items-center gap-1 text-sm font-medium transition-colors cursor-pointer ${
                megaMenuOpen ? 'text-[#2563EB]' : 'text-[#202B38] hover:text-[#2563EB]'
              }`}
            >
              Categories
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-150 ${
                  megaMenuOpen ? 'rotate-180 text-[#2563EB]' : ''
                }`}
              />
            </button>

            {megaMenuOpen && (
              <div className="absolute left-1/2 top-full z-50 w-[760px] -translate-x-1/2 pt-3">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="grid grid-cols-12">
                    <div className="col-span-8 grid grid-cols-2 gap-x-5 gap-y-4 p-6">
                      {STOREFRONT_CATEGORY_DIRECTORY.map((cat) => (
                        <div key={cat.slug} className="group">
                          <Link
                            to={`/catalogue?category=${cat.slug}`}
                            onClick={() => setMegaMenuOpen(false)}
                            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[#F5F7FA]"
                          >
                            <img
                              src={cat.imageUrl}
                              alt={cat.imageAlt}
                              className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#10243A] group-hover:text-[#2563EB]">
                                {cat.name}
                              </p>
                              <p className="truncate text-[11px] text-[#64748B]">
                                {cat.subcategories.slice(0, 2).join(' · ')}
                              </p>
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>

                    {/* Mega Menu Wholesale Sourcing Feature Panel */}
                    <div className="col-span-4 flex flex-col justify-between bg-[#10243A] p-6 text-white">
                      <div>
                        <span className="inline-block rounded-md bg-[#F4A62A]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#F4A62A]">
                          Direct Procurement
                        </span>
                        <h3 className="mt-3 font-display text-base font-bold leading-snug text-white">
                          Need bulk or custom products from China?
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-slate-300">
                          Submit specifications, target quantities, and delivery state for a formal DGT quotation.
                        </p>
                      </div>
                      <div className="mt-5 space-y-2.5">
                        <Link
                          to="/sourcing"
                          onClick={() => setMegaMenuOpen(false)}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#F4A62A] px-3.5 py-2.5 text-xs font-semibold text-[#10243A] transition-colors hover:bg-[#E0951D]"
                        >
                          Request Wholesale Sourcing
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                          to="/catalogue"
                          onClick={() => setMegaMenuOpen(false)}
                          className="block text-center text-xs font-medium text-slate-300 hover:text-white"
                        >
                          Browse All Products →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <NavLink to="/sourcing" className={navLinkClass}>
            Wholesale Sourcing
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About Us
          </NavLink>
          <NavLink to="/contact" className={navLinkClass}>
            Contact
          </NavLink>
        </nav>

        {/* Utility Actions (Search, Account, Cart, Mobile Toggle) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen((prev) => !prev)}
            aria-label="Search products"
            aria-expanded={searchOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#202B38] transition-colors hover:bg-[#F5F7FA] hover:text-[#2563EB] cursor-pointer"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>

          {/* Role-Aware Account Action */}
          {isAuthenticated && isStaff ? (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link
                to="/admin"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#10243A] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#1A3554]"
                title={role ? `Signed in as ${ROLE_LABELS[role]}` : 'Admin Console'}
              >
                <ShieldCheck className="h-4 w-4 text-[#F4A62A]" />
                <span>Admin</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-[#64748B] transition-colors hover:border-slate-300 hover:text-[#DC2626] cursor-pointer"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : isAuthenticated ? (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link
                to="/account"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-[#10243A] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
              >
                <User className="h-4 w-4 text-[#2563EB]" />
                <span className="max-w-[110px] truncate">
                  {profile?.fullName?.split(' ')[0] || 'Account'}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-[#64748B] transition-colors hover:border-slate-300 hover:text-[#DC2626] cursor-pointer"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-[#10243A] transition-colors hover:border-[#2563EB] hover:text-[#2563EB] sm:inline-flex"
            >
              <User className="h-4 w-4" />
              <span>Account</span>
            </Link>
          )}

          {/* Shopping Cart Trigger */}
          <button
            type="button"
            onClick={openDrawer}
            aria-label={`Open shopping cart with ${totalCount} items`}
            className="relative inline-flex h-10 items-center gap-2 rounded-lg bg-[#2563EB] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            <span className="inline-flex min-w-[20px] items-center justify-center rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white">
              {totalCount}
            </span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-[#10243A] hover:bg-[#F5F7FA] lg:hidden cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Expandable Desktop/Tablet Search Drawer */}
      {searchOpen && (
        <div className="border-t border-slate-200 bg-[#F5F7FA] px-4 py-3 sm:px-6 lg:px-8">
          <form
            onSubmit={handleSearchSubmit}
            className="mx-auto flex max-w-3xl items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vehicles, smartphones, electronics, home appliances, or SKU..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-[#202B38] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              />
            </div>
            <button
              type="submit"
              className="h-10 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#64748B] hover:text-[#10243A] cursor-pointer"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Responsive Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="max-h-[calc(100vh-5rem)] overflow-y-auto border-t border-slate-200 bg-white lg:hidden">
          <div className="space-y-4 px-4 py-5 sm:px-6">
            {/* Mobile Search */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products or SKU..."
                  className="w-full rounded-lg border border-slate-300 bg-[#F5F7FA] py-2.5 pl-9 pr-3 text-sm text-[#202B38] focus:border-[#2563EB] focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-[#2563EB] px-4 text-xs font-semibold text-white"
              >
                Go
              </button>
            </form>

            {/* Primary Mobile Links */}
            <nav className="space-y-1" aria-label="Mobile navigation">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#10243A] hover:bg-[#F5F7FA]"
              >
                Home
              </Link>
              <Link
                to="/catalogue"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#10243A] hover:bg-[#F5F7FA]"
              >
                Shop All Products
              </Link>

              {/* Expandable Categories Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() => setMobileCategoriesOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-[#10243A] hover:bg-[#F5F7FA]"
                >
                  <span>Product Categories</span>
                  <ChevronDown
                    className={`h-4 w-4 text-[#64748B] transition-transform ${
                      mobileCategoriesOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {mobileCategoriesOpen && (
                  <div className="mt-1 grid grid-cols-1 gap-1 pl-3 sm:grid-cols-2">
                    {STOREFRONT_CATEGORY_DIRECTORY.map((cat) => (
                      <Link
                        key={cat.slug}
                        to={`/catalogue?category=${cat.slug}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#202B38] hover:bg-[#F5F7FA]"
                      >
                        <img
                          src={cat.imageUrl}
                          alt={cat.imageAlt}
                          className="h-7 w-7 rounded object-cover"
                        />
                        <span>{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                to="/sourcing"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#10243A] hover:bg-[#F5F7FA]"
              >
                Wholesale Sourcing
              </Link>
              <Link
                to="/logistics"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#10243A] hover:bg-[#F5F7FA]"
              >
                Shipping &amp; Logistics
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#10243A] hover:bg-[#F5F7FA]"
              >
                About Us
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#10243A] hover:bg-[#F5F7FA]"
              >
                Contact
              </Link>
            </nav>

            {/* Mobile Currency & Account Controls */}
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between rounded-lg bg-[#F5F7FA] px-3 py-2">
                <span className="text-xs font-medium text-[#64748B]">Display Currency</span>
                <select
                  value={displayCurrency}
                  onChange={(e) => setDisplayCurrency(e.target.value as CurrencyCode)}
                  aria-label="Mobile currency selector"
                  className="bg-transparent text-xs font-semibold text-[#10243A] focus:outline-none"
                >
                  {Object.values(CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {isAuthenticated && isStaff ? (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#10243A] text-xs font-semibold text-white"
                  >
                    <ShieldCheck className="h-4 w-4 text-[#F4A62A]" />
                    Admin Console
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-[#DC2626]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              ) : isAuthenticated ? (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] text-xs font-semibold text-white"
                  >
                    <User className="h-4 w-4" />
                    My Account
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-[#DC2626]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[#10243A] text-xs font-semibold text-white"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 text-xs font-semibold text-[#10243A]"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
