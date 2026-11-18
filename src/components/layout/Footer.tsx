import { Link } from 'react-router-dom';
import { DGT_BRAND } from '../../config/app.config';
import { BrandLogo } from '../ui/BrandLogo';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-[#0B1E3D] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Corporate Identity */}
          <div className="space-y-4 md:col-span-1">
            <BrandLogo inverted />
            <p className="text-sm font-medium text-[#C59B27]">
              {DGT_BRAND.tagline}
            </p>
            <p className="text-xs leading-relaxed text-slate-300">
              International trade, ready-stock distribution, wholesale procurement,
              and China-to-Nigeria logistics serving Katsina, Northern Nigeria, and
              all 36 states plus the FCT.
            </p>
          </div>

          {/* Trade & Storefront */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Trade Services</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/catalogue" className="hover:text-white transition-colors">
                  Product Catalogue
                </Link>
              </li>
              <li>
                <Link to="/sourcing" className="hover:text-white transition-colors">
                  Wholesale Sourcing
                </Link>
              </li>
              <li>
                <Link to="/logistics" className="hover:text-white transition-colors">
                  China-to-Nigeria Shipping
                </Link>
              </li>
              <li>
                <Link to="/account/tracking" className="hover:text-white transition-colors">
                  Shipment & Order Tracking
                </Link>
              </li>
            </ul>
          </div>

          {/* Portals */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Platform Portals</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Customer Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Customer Registration
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-white transition-colors">
                  Customer Dashboard
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-white transition-colors">
                  Administrative Operations
                </Link>
              </li>
            </ul>
          </div>

          {/* Official Contact Placeholders */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">
              Official Contact Information
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>{DGT_BRAND.placeholders.katsinaHubAddress}</li>
              <li>{DGT_BRAND.placeholders.nigeriaOfficeAddress}</li>
              <li>{DGT_BRAND.placeholders.businessPhone}</li>
              <li>{DGT_BRAND.placeholders.supportEmail}</li>
              <li>{DGT_BRAND.placeholders.whatsappNumber}</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {currentYear} {DGT_BRAND.name} ({DGT_BRAND.shortName}). Commissioned via{' '}
            {DGT_BRAND.commissionCredit}.
          </p>
          <p>
            Platform Foundation Stage 1 · Sample demonstration catalogue displayed.
          </p>
        </div>
      </div>
    </footer>
  );
}
