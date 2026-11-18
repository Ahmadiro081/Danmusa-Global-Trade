import {
  ArrowRight,
  CheckCircle2,
  PackageSearch,
  Search,
  Ship,
  ShieldCheck,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProductCard } from '../../components/catalogue/ProductCard';
import { Button } from '../../components/ui/Button';
import {
  DGT_BRAND,
  INTERNATIONAL_LOGISTICS_STAGES,
} from '../../config/app.config';
import {
  DEMO_CATEGORIES,
  DEMO_PRODUCTS,
  HERO_LOGISTICS_IMAGE,
} from '../../data/demoCatalogue';

type HomeFilter = 'all' | 'ready_stock' | 'pre_order';

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<HomeFilter>('all');

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    navigate(trimmed ? `/catalogue?q=${encodeURIComponent(trimmed)}` : '/catalogue');
  };

  const featuredProducts = DEMO_PRODUCTS.filter((product) => {
    if (activeFilter === 'all') return product.isFeatured;
    return product.fulfillmentMode === activeFilter;
  }).slice(0, 6);

  return (
    <div>
      {/* 1. Storefront Hero Section */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
            <div className="flex flex-col justify-center space-y-6 lg:col-span-6">
              <p className="text-xs font-semibold tracking-wide text-[#8E6B0C]">
                {DGT_BRAND.name} ({DGT_BRAND.shortName}) · China-to-Nigeria Trade
              </p>

              <h1
                className="font-display text-3xl font-bold tracking-tight text-[#0B1E3D] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]"
                style={{ textWrap: 'balance' }}
              >
                {DGT_BRAND.tagline}
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-slate-600">
                Direct procurement, fixed-price ready-stock inventory, quotation-backed
                pre-orders, and custom wholesale sourcing from China with nationwide
                delivery across Katsina, Northern Nigeria, and all 36 states plus the FCT.
              </p>

              {/* Integrated Product Search Bar */}
              <form
                onSubmit={handleSearchSubmit}
                className="flex flex-col gap-2.5 sm:flex-row sm:items-center max-w-xl"
                role="search"
                aria-label="Search DGT catalogue"
              >
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search vehicles, smartphones, laptops, appliances..."
                    className="w-full min-h-[44px] rounded-md border border-slate-300 bg-white pl-10 pr-4 text-sm text-[#0B1E3D] placeholder:text-slate-400 focus:border-[#0B1E3D] focus:outline-none focus:ring-2 focus:ring-[#0B1E3D]/15"
                  />
                </div>
                <Button type="submit" variant="primary" size="lg">
                  Search Catalogue
                </Button>
              </form>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link to="/catalogue">
                  <Button variant="accent" size="md">
                    Browse Demonstration Catalogue
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
                <Link
                  to="/sourcing"
                  className="text-sm font-semibold text-[#0B1E3D] hover:text-[#8E6B0C] transition-colors whitespace-nowrap"
                >
                  Request Custom China Sourcing
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 flex">
              <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <img
                  src={HERO_LOGISTICS_IMAGE}
                  alt="International container port and freight logistics corridor connecting China and Nigeria"
                  referrerPolicy="no-referrer"
                  className="h-full w-full min-h-[280px] object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B1E3D]/90 via-[#0B1E3D]/45 to-transparent p-6 text-white">
                  <p className="text-xs font-medium text-[#C59B27]">
                    China Export Consolidation · Nigerian Delivery Network
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    Structured ready-stock fulfillment and transparent 10-stage freight
                    tracking.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Column Trade Pillar Strip below Hero */}
          <div className="mt-12 grid grid-cols-1 gap-6 border-t border-slate-200 pt-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-display text-sm font-semibold text-[#0B1E3D]">
                01. Ready-Stock Storefront
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Fixed Nigerian Naira pricing for verified local inventory ready for
                dispatch.
              </p>
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-[#0B1E3D]">
                02. Pre-Order Quotations
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Supplier cost assessment in CNY, shipping calculation, and formal customer
                quotes.
              </p>
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-[#0B1E3D]">
                03. Custom Wholesale Sourcing
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Submit product specifications or reference photographs for unlisted Chinese
                goods.
              </p>
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-[#0B1E3D]">
                04. 36 States + FCT Delivery
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Nationwide coverage with dedicated operational focus on Katsina State and
                Northern Nigeria.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Product Categories & Featured Demonstration Catalogue */}
      <section className="border-b border-slate-200 bg-slate-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Categories Index */}
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#0B1E3D]">
                  Core Trade Categories
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Consumer electronics, commercial vehicles, appliances, and apparel
                  sourced directly from verified factories.
                </p>
              </div>
              <Link
                to="/catalogue"
                className="text-sm font-semibold text-[#0B1E3D] hover:text-[#8E6B0C] whitespace-nowrap"
              >
                View Full Catalogue →
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {DEMO_CATEGORIES.map((category) => (
                <Link
                  key={category.slug}
                  to={`/catalogue?category=${encodeURIComponent(category.slug)}`}
                  className="rounded-lg border border-slate-200 bg-white p-5 transition-colors duration-150 hover:border-[#0B1E3D]"
                >
                  <p className="text-xs text-slate-500">{category.productCountLabel}</p>
                  <h3 className="mt-1 font-display text-base font-semibold text-[#0B1E3D]">
                    {category.name}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    {category.summary}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Featured / Ready-Stock / Pre-Order Switchable Grid */}
          <div className="pt-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#0B1E3D]">
                  Featured Demonstration Products
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Sample listings illustrating ready-stock fixed pricing and pre-order
                  quotation workflows. Live stock connects in Stage 2.
                </p>
              </div>

              <div
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 self-start"
                role="tablist"
                aria-label="Filter demonstration products"
              >
                {(
                  [
                    { key: 'all', label: 'Featured' },
                    { key: 'ready_stock', label: 'Ready-Stock' },
                    { key: 'pre_order', label: 'Pre-Order' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      activeFilter === tab.key
                        ? 'bg-[#0B1E3D] text-white'
                        : 'text-slate-600 hover:text-[#0B1E3D]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Wholesale Sourcing, How It Works & China-to-Nigeria Logistics */}
      <section className="border-b border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-14">
          {/* How It Works across 3 Business Workflows */}
          <div>
            <h2 className="font-display text-2xl font-bold text-[#0B1E3D]">
              How DGT Trade Workflows Operate
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Transparent commercial pathways for individual buyers, retail merchants, and
              institutional importers.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <CheckCircle2 className="w-6 h-6 text-[#0B1E3D]" aria-hidden="true" />
                <h3 className="mt-4 font-display text-lg font-semibold text-[#0B1E3D]">
                  Ready-Stock Purchase
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Browse stocked inventory → Add to bag → Checkout in NGN → Submit
                  bank transfer for Finance Manager verification → Order dispatch to
                  your Nigerian state.
                </p>
                <div className="mt-5">
                  <Link
                    to="/catalogue?mode=ready_stock"
                    className="text-xs font-semibold text-[#0B1E3D] hover:text-[#8E6B0C]"
                  >
                    View Ready-Stock Demo Items →
                  </Link>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <Ship className="w-6 h-6 text-[#0B1E3D]" aria-hidden="true" />
                <h3 className="mt-4 font-display text-lg font-semibold text-[#0B1E3D]">
                  Pre-Order Procurement
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Select pre-order item → Request formal quotation → Supplier CNY cost &
                  freight calculation → Accept quote & pay → China procurement & 10-stage
                  shipment tracking.
                </p>
                <div className="mt-5">
                  <Link
                    to="/catalogue?mode=pre_order"
                    className="text-xs font-semibold text-[#0B1E3D] hover:text-[#8E6B0C]"
                  >
                    View Pre-Order Demo Items →
                  </Link>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <PackageSearch className="w-6 h-6 text-[#0B1E3D]" aria-hidden="true" />
                <h3 className="mt-4 font-display text-lg font-semibold text-[#0B1E3D]">
                  Custom Wholesale Sourcing
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Submit description & reference photo → DGT Sourcing Team investigates
                  factories in China → Formal quotation issued → Customer approval →
                  End-to-end delivery.
                </p>
                <div className="mt-5">
                  <Link
                    to="/sourcing"
                    className="text-xs font-semibold text-[#0B1E3D] hover:text-[#8E6B0C]"
                  >
                    Open Sourcing Request Form →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* China-to-Nigeria 10-Stage Logistics & Wholesale CTA */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
            <div className="rounded-lg border border-slate-200 bg-[#0B1E3D] p-8 text-white lg:col-span-5">
              <p className="text-xs font-semibold text-[#C59B27]">
                Wholesale & Unlisted Goods
              </p>
              <h3 className="mt-2 font-display text-2xl font-bold">
                Need Products Not Listed in Our Catalogue?
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Submit target quantities, specifications, and reference photographs. Our
                China sourcing specialists verify factory availability, calculate
                weight/volume freight, and issue a structured NGN quotation.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/sourcing">
                  <Button variant="accent">Submit Sourcing Request</Button>
                </Link>
                <Link to="/logistics">
                  <Button
                    variant="outline"
                    className="border-white/25 bg-transparent text-white hover:bg-white/10"
                  >
                    Shipping Coverage
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 sm:p-8 lg:col-span-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#0B1E3D]">
                    10-Stage China-to-Nigeria Logistics Pipeline
                  </h3>
                  <p className="text-xs text-slate-600">
                    Tracked milestones from supplier procurement through customs release
                    and Nigerian state delivery.
                  </p>
                </div>
                <Link
                  to="/logistics"
                  className="text-xs font-semibold text-[#0B1E3D] hover:text-[#8E6B0C] whitespace-nowrap"
                >
                  View All 36 States + FCT →
                </Link>
              </div>

              <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {INTERNATIONAL_LOGISTICS_STAGES.map((stage) => (
                  <li
                    key={stage.code}
                    className="flex items-start gap-3 rounded-md border border-slate-200 bg-white px-3.5 py-2.5"
                  >
                    <span className="font-mono text-xs font-semibold text-[#8E6B0C] tabular-nums mt-0.5">
                      {String(stage.step).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#0B1E3D]">{stage.label}</p>
                      <p className="text-[11px] text-slate-500">{stage.region}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Customer Support & Trust Verification */}
      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 max-w-2xl">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#0B1E3D] text-[#C59B27]">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1E3D]">
                  Customer Support & Account Verification
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Dedicated support for quotation reviews, bank transfer verification, and
                  Katsina / nationwide delivery updates. Official business telephone,
                  WhatsApp Business line, and office addresses are reserved as placeholders
                  pending official corporate entry.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <Link to="/account/tracking">
                <Button variant="outline">Track Order</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary">Create Customer Account</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
