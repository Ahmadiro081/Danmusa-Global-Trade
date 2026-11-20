import { Link } from 'react-router-dom';
import { Lock, Mail, MapPin, Phone } from 'lucide-react';
import { BrandLogo } from '../ui/BrandLogo';
import { DGT_BRAND } from '../../config/app.config';
import { STOREFRONT_CATEGORY_DIRECTORY } from '../../config/categories';

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-[#10243A] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Company Info */}
          <div className="space-y-4 lg:col-span-4">
            <BrandLogo variant="light" showTagline />
            <p className="max-w-sm text-sm leading-relaxed text-slate-300">
              {DGT_BRAND.tagline} Connecting verified manufacturers and suppliers in China with wholesale buyers, businesses, and individual customers across Nigeria.
            </p>
            <div className="space-y-2.5 pt-2 text-xs text-slate-400">
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#F4A62A]" />
                <span>{DGT_BRAND.placeholders.nigeriaOfficeAddress}</span>
              </p>
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#F4A62A]" />
                <span>{DGT_BRAND.placeholders.chinaWarehouseAddress}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-[#F4A62A]" />
                <span>{DGT_BRAND.placeholders.businessPhone}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-[#F4A62A]" />
                <span>{DGT_BRAND.placeholders.supportEmail}</span>
              </p>
            </div>
          </div>

          {/* Product Categories */}
          <div className="lg:col-span-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-white">
              Product Categories
            </h3>
            <ul className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-1">
              {STOREFRONT_CATEGORY_DIRECTORY.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    to={`/catalogue?category=${cat.slug}`}
                    className="text-slate-300 transition-colors hover:text-[#F4A62A]"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Services & Wholesale */}
          <div className="lg:col-span-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-white">
              Customer Services &amp; Sourcing
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link to="/catalogue?mode=ready_stock" className="hover:text-[#F4A62A]">
                  Ready-Stock Inventory
                </Link>
              </li>
              <li>
                <Link to="/catalogue?mode=pre_order" className="hover:text-[#F4A62A]">
                  Pre-Order from China
                </Link>
              </li>
              <li>
                <Link to="/sourcing" className="hover:text-[#F4A62A]">
                  Wholesale Sourcing Requests
                </Link>
              </li>
              <li>
                <Link to="/logistics" className="hover:text-[#F4A62A]">
                  China-to-Nigeria Shipping
                </Link>
              </li>
              <li>
                <Link to="/account/tracking" className="hover:text-[#F4A62A]">
                  Order &amp; Shipment Tracking
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-[#F4A62A]">
                  Customer Account Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Company, Policies & Staff Access */}
          <div className="lg:col-span-2">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-white">
              Company &amp; Policies
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link to="/about" className="hover:text-[#F4A62A]">
                  About Danmusa Global Trade
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#F4A62A]">
                  Contact &amp; Support
                </Link>
              </li>
              <li>
                <Link to="/logistics#delivery-coverage" className="hover:text-[#F4A62A]">
                  Delivery Coverage
                </Link>
              </li>
              <li>
                <Link to="/checkout" className="hover:text-[#F4A62A]">
                  Bank Transfer Policy
                </Link>
              </li>
              <li className="pt-2">
                <Link
                  to="/login?portal=staff&next=/admin"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-[#F4A62A] hover:text-[#F4A62A]"
                >
                  <Lock className="h-3.5 w-3.5 text-[#F4A62A]" />
                  Staff &amp; Admin Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {DGT_BRAND.name} ({DGT_BRAND.shortName}). All rights reserved.
          </p>
          <p>
            Platform engineering by <span className="font-medium text-slate-200">{DGT_BRAND.commissionCredit}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
