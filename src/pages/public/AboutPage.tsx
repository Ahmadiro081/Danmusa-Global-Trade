import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe2,
  MapPin,
  ShieldCheck,
  Ship,
  Users,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { DGT_BRAND } from '../../config/app.config';
import {
  STOREFRONT_CATEGORY_DIRECTORY,
  WHOLESALE_BANNER_IMAGE,
} from '../../config/categories';

const CORE_PILLARS = [
  {
    icon: Globe2,
    title: 'Direct China Trade Corridor',
    description:
      'We connect Nigerian businesses and individual buyers directly with verified manufacturers, automotive dealers, and wholesale hubs in China.',
  },
  {
    icon: ShieldCheck,
    title: 'Transparent Commercial Governance',
    description:
      'Every quotation, bank transfer settlement, procurement milestone, and delivery update is recorded within structured DGT operational systems.',
  },
  {
    icon: Ship,
    title: 'Managed International Freight',
    description:
      'End-to-end air and sea cargo coordination from consolidation in China through Nigerian customs clearance and inland dispatch.',
  },
  {
    icon: Users,
    title: 'Wholesale & Retail Flexibility',
    description:
      'Serving corporate fleet buyers, retail merchants, institutional buyers, and individuals purchasing single ready-stock or pre-order items.',
  },
] as const;

export function AboutPage() {
  return (
    <div className="bg-[#F5F7FA] pb-16">
      {/* Dark Navy Corporate Header */}
      <section className="bg-[#10243A] text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-7">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F4A62A]">
                About {DGT_BRAND.name}
              </p>
              <h1 className="font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
                {DGT_BRAND.tagline}
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-slate-300">
                Danmusa Global Trade (DGT) is an international trading and procurement company bridging verified Chinese manufacturing supply chains with businesses and consumers across Nigeria.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link to="/catalogue">
                  <Button variant="primary" size="lg">
                    Explore Products
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/sourcing">
                  <Button variant="accent" size="lg">
                    Request Wholesale Sourcing
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#0B1929]">
                <img
                  src={WHOLESALE_BANNER_IMAGE}
                  alt="Danmusa Global Trade international trade and container freight operations"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Operating Model & Pillars */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
            How We Operate
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#10243A] sm:text-3xl">
            Built for Dependable Cross-Border Commerce
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
            International trade requires more than product listings — it requires disciplined supplier vetting, accurate documentation, transparent currency handling, and reliable Nigerian fulfillment.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CORE_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-[#10243A]">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Product Divisions Covered */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
                Trade Divisions
              </p>
              <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#10243A]">
                What We Source &amp; Supply
              </h2>
            </div>
            <Link
              to="/catalogue"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#2563EB] hover:underline"
            >
              Browse Catalogue
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STOREFRONT_CATEGORY_DIRECTORY.map((cat) => (
              <Link
                key={cat.slug}
                to={`/catalogue?category=${cat.slug}`}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-[#F5F7FA] p-4 transition-colors hover:border-[#2563EB]/40 hover:bg-white"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16865C]" />
                <div>
                  <p className="font-display text-sm font-bold text-[#10243A]">
                    {cat.name}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                    {cat.shortDescription}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Regional Presence & Office Placeholders */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
              <Building2 className="h-4 w-4" />
              Nigeria Head Office
            </div>
            <p className="mt-3 text-sm font-medium text-[#10243A]">
              {DGT_BRAND.placeholders.nigeriaOfficeAddress}
            </p>
            <p className="mt-2 text-xs text-[#64748B]">
              Corporate coordination, customer orders, finance verification, and nationwide logistics management.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
              <MapPin className="h-4 w-4" />
              Katsina Operations Hub
            </div>
            <p className="mt-3 text-sm font-medium text-[#10243A]">
              {DGT_BRAND.placeholders.katsinaHubAddress}
            </p>
            <p className="mt-2 text-xs text-[#64748B]">
              Regional Northern Nigeria dispatch and customer pickup hub serving Katsina, Kano, Kaduna, Abuja, and neighbouring states.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
              <Globe2 className="h-4 w-4" />
              China Consolidation Hub
            </div>
            <p className="mt-3 text-sm font-medium text-[#10243A]">
              {DGT_BRAND.placeholders.chinaWarehouseAddress}
            </p>
            <p className="mt-2 text-xs text-[#64748B]">
              Supplier receiving, inspection, export packaging, and container/air cargo consolidation for Nigeria-bound orders.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
