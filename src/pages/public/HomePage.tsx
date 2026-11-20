import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Globe2,
  Headphones,
  Layers,
  Mail,
  MapPin,
  Package,
  Phone,
  Search,
  ShieldCheck,
  Ship,
  Truck,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ProductCard } from '../../components/catalogue/ProductCard';
import {
  EmptyState,
  ErrorBanner,
  ProductGridSkeleton,
} from '../../components/ui/StateViews';
import { StatusBadge } from '../../components/ui/Badge';
import { DGT_BRAND } from '../../config/app.config';
import {
  HERO_SHOWCASE_IMAGE,
  STOREFRONT_CATEGORY_DIRECTORY,
  WHOLESALE_BANNER_IMAGE,
} from '../../config/categories';
import { fetchPublicProducts } from '../../services/catalogueService';
import type { StorefrontProduct } from '../../types/domain';

const WHY_CHOOSE_PILLARS = [
  {
    icon: Globe2,
    title: 'China-to-Nigeria Sourcing',
    description:
      'Direct commercial procurement channels connecting verified manufacturers and suppliers in China with buyers across Nigeria.',
  },
  {
    icon: Building2,
    title: 'Competitive Wholesale Procurement',
    description:
      'Structured bulk pricing for traders, retailers, corporate buyers, and institutions sourcing stock at scale.',
  },
  {
    icon: Layers,
    title: 'Broad Product Variety',
    description:
      'Spanning cars, trucks, smartphones, electronics, computers, kitchen appliances, fashion, footwear, and sportswear.',
  },
  {
    icon: FileText,
    title: 'Transparent Quotations',
    description:
      'Itemized quotations detailing unit costs, shipping calculations, and delivery timelines prior to order confirmation.',
  },
  {
    icon: Ship,
    title: 'Structured Order Tracking',
    description:
      'Clear milestone visibility from supplier procurement in China through customs clearance and local dispatch in Nigeria.',
  },
  {
    icon: Headphones,
    title: 'Dedicated Customer Support',
    description:
      'Responsive trade support assisting customers with product specifications, quotations, and post-order enquiries.',
  },
] as const;

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Browse or Request Products',
    description:
      'Explore ready-stock listings or submit a custom wholesale sourcing request with your target item specifications.',
  },
  {
    step: '02',
    title: 'Receive Quotation',
    description:
      'Our sourcing and operations team confirms availability, pricing, and freight options in a formal quotation.',
  },
  {
    step: '03',
    title: 'Confirm Your Order',
    description:
      'Approve your quotation or checkout ready-stock items and complete settlement via verified bank transfer.',
  },
  {
    step: '04',
    title: 'Procurement and Shipping',
    description:
      'DGT manages supplier inspection, consolidation in China, international air or sea freight, and customs clearance.',
  },
  {
    step: '05',
    title: 'Delivery',
    description:
      'Receive your shipment at your Nigerian destination across Katsina, Abuja, Kano, Lagos, and all 36 states + FCT.',
  },
] as const;

export function HomePage() {
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublicProducts();
      setProducts(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load products from the live catalogue.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const featuredProducts = products
    .filter((p) => p.isFeatured)
    .slice(0, 4);
  const displayFeatured =
    featuredProducts.length > 0 ? featuredProducts : products.slice(0, 4);

  const readyStockProducts = products
    .filter((p) => p.fulfillmentMode === 'ready_stock')
    .slice(0, 4);

  const preOrderProducts = products
    .filter((p) => p.fulfillmentMode === 'pre_order')
    .slice(0, 4);

  return (
    <div className="bg-[#F5F7FA]">
      {/* SECTION A: HERO */}
      <section className="relative overflow-hidden bg-[#10243A] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 80% 25%, #2563EB 0%, transparent 48%)',
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Editorial Copy Column */}
            <div className="space-y-6 lg:col-span-6">
              <div className="inline-flex items-center gap-2 border-l-2 border-[#F4A62A] pl-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#F4A62A]">
                Danmusa Global Trade · China — Nigeria
              </div>

              <h1 className="font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-[46px]">
                Everything You Need. Sourced Globally. Delivered with Confidence.
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                Discover quality products from China, competitive wholesale prices and reliable sourcing solutions for customers across Nigeria.
              </p>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                <Link to="/catalogue">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto">
                    Explore Products
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/sourcing">
                  <Button variant="accent" size="lg" className="w-full sm:w-auto">
                    Request Wholesale Sourcing
                  </Button>
                </Link>
              </div>

              {/* Clean Architectural Value Strip */}
              <div className="grid grid-cols-3 gap-4 border-t border-white/15 pt-6 text-xs">
                <div>
                  <p className="font-display text-base font-bold text-white sm:text-lg">
                    8+ Categories
                  </p>
                  <p className="mt-0.5 text-slate-400">Vehicles to electronics</p>
                </div>
                <div>
                  <p className="font-display text-base font-bold text-white sm:text-lg">
                    36 States + FCT
                  </p>
                  <p className="mt-0.5 text-slate-400">Nationwide delivery</p>
                </div>
                <div>
                  <p className="font-display text-base font-bold text-white sm:text-lg">
                    Direct China
                  </p>
                  <p className="mt-0.5 text-slate-400">Wholesale &amp; pre-order</p>
                </div>
              </div>
            </div>

            {/* Premium Studio Showcase Visual */}
            <div className="lg:col-span-6">
              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#0B1929] shadow-2xl">
                <img
                  src={HERO_SHOWCASE_IMAGE}
                  alt="Premium imported vehicle showcase by Danmusa Global Trade"
                  className="aspect-[16/10] w-full object-cover object-center"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#10243A] via-[#10243A]/75 to-transparent p-5 sm:p-6">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#F4A62A]">
                        Global Import &amp; Ready Stock
                      </p>
                      <p className="mt-0.5 font-display text-sm font-bold text-white sm:text-base">
                        Vehicles, Smartphones, Electronics, Home &amp; Fashion
                      </p>
                    </div>
                    <Link
                      to="/catalogue?category=cars-vehicles"
                      className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/25"
                    >
                      Vehicles
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION B: PRODUCT CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
              Product Categories
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#10243A] sm:text-3xl">
              Explore Our International Trade Catalogue
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[#64748B]">
              Browse eight structured product divisions spanning automotive, mobile devices, electronics, home appliances, and fashion.
            </p>
          </div>
          <Link
            to="/catalogue"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:underline"
          >
            View full catalogue
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STOREFRONT_CATEGORY_DIRECTORY.map((category) => (
            <Link
              key={category.slug}
              to={`/catalogue?category=${category.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:border-[#2563EB]/40 hover:shadow-md"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#F5F7FA]">
                <img
                  src={category.imageUrl}
                  alt={category.imageAlt}
                  loading="lazy"
                  className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.04]"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <h3 className="font-display text-base font-bold text-[#10243A] group-hover:text-[#2563EB]">
                    {category.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#64748B]">
                    {category.shortDescription}
                  </p>
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB]">
                  Browse category
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION C: FEATURED PRODUCTS (LIVE BACKEND DATA) */}
      <section className="border-y border-slate-200/90 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
                Featured Inventory
              </p>
              <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#10243A] sm:text-3xl">
                Featured Products
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[#64748B]">
                Live listings published by Danmusa Global Trade product management. Prices display in Nigerian Naira with currency conversion options.
              </p>
            </div>
            <Link
              to="/catalogue"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:underline"
            >
              Shop all products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8">
            {loading ? (
              <ProductGridSkeleton count={4} />
            ) : error ? (
              <ErrorBanner
                title="Unable to load live catalogue"
                message={error}
                action={
                  <Button variant="outline" size="sm" onClick={loadProducts}>
                    Retry
                  </Button>
                }
              />
            ) : displayFeatured.length === 0 ? (
              <EmptyState
                icon={<Package className="h-5 w-5" />}
                title="Live catalogue inventory is being prepared"
                description="No products are currently published in the live storefront database. You can submit a custom sourcing request for any product from China and our team will prepare a formal quotation."
                action={
                  <>
                    <Link to="/sourcing">
                      <Button variant="primary" size="sm">
                        Request Wholesale Sourcing
                      </Button>
                    </Link>
                    <Link to="/contact">
                      <Button variant="outline" size="sm">
                        Contact Sales Team
                      </Button>
                    </Link>
                  </>
                }
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {displayFeatured.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION D & E: READY STOCK & PRE-ORDER PRODUCTS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-14">
          {/* D: Ready Stock */}
          <div>
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
              <div>
                <StatusBadge tone="success">Immediate Local Availability</StatusBadge>
                <h2 className="mt-2 font-display text-2xl font-extrabold text-[#10243A]">
                  Ready Stock
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm text-[#64748B]">
                  Products stocked in Nigeria and ready for direct order confirmation and nationwide dispatch.
                </p>
              </div>
              <Link
                to="/catalogue?mode=ready_stock"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#16865C] hover:underline"
              >
                Explore ready stock
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6">
              {loading ? (
                <ProductGridSkeleton count={4} />
              ) : readyStockProducts.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {readyStockProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#16865C]/10 text-[#16865C]">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-[#10243A]">
                        Ready-stock listings update as warehouse inventory is published
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                        New ready-stock vehicles, electronics, and appliances appear here automatically once verified by DGT inventory managers.
                      </p>
                    </div>
                  </div>
                  <Link to="/catalogue?mode=ready_stock" className="shrink-0">
                    <Button variant="outline" size="sm">
                      Check Ready Stock
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* E: Pre-Order Products */}
          <div>
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
              <div>
                <StatusBadge tone="warning">Direct Import from China</StatusBadge>
                <h2 className="mt-2 font-display text-2xl font-extrabold text-[#10243A]">
                  Pre-Order Products
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm text-[#64748B]">
                  Order specialized vehicles, bulk smartphones, commercial equipment, or factory-direct goods sourced on request from China with transparent lead times.
                </p>
              </div>
              <Link
                to="/catalogue?mode=pre_order"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B45309] hover:underline"
              >
                Explore pre-orders
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6">
              {loading ? (
                <ProductGridSkeleton count={4} />
              ) : preOrderProducts.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {preOrderProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-[#F4A62A]/35 bg-[#FEF7E7]/65 p-6 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F4A62A]/20 text-[#92400E]">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-[#10243A]">
                        Import any product on pre-order directly from China
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                        Pre-order listings allow buyers to reserve high-value items or custom configurations sourced from verified Chinese suppliers with tracked air or sea freight to Nigeria.
                      </p>
                    </div>
                  </div>
                  <Link to="/sourcing" className="shrink-0">
                    <Button variant="navy" size="sm">
                      Submit Pre-Order Request
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION F: WHOLESALE SOURCING BANNER */}
      <section className="bg-[#10243A] text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-7">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F4A62A]">
                Wholesale &amp; Corporate Procurement
              </p>
              <h2 className="font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl lg:text-4xl">
                Source Directly from Verified Suppliers in China for Your Business.
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Whether you are stocking a retail store, procuring fleet vehicles, importing electronics in bulk, or sourcing custom commercial merchandise, DGT handles supplier verification, price negotiation, consolidation, and freight delivery to Nigeria.
              </p>

              <ul className="grid gap-3 pt-1 text-sm text-slate-200 sm:grid-cols-2">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#F4A62A]" />
                  <span>Direct factory &amp; wholesale market sourcing</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#F4A62A]" />
                  <span>Formal itemized NGN / USD / CNY quotations</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#F4A62A]" />
                  <span>Air freight &amp; sea container consolidation</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#F4A62A]" />
                  <span>Customs clearance &amp; 36-state delivery</span>
                </li>
              </ul>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link to="/sourcing">
                  <Button variant="accent" size="lg">
                    Request a Product from China
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/logistics">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10"
                  >
                    View Shipping Process
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#0B1929]">
                <img
                  src={WHOLESALE_BANNER_IMAGE}
                  alt="International freight and China-to-Nigeria container logistics"
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover object-center"
                />
                <div className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 bg-[#0B1929] p-4 text-xs">
                  <div className="pr-3">
                    <p className="font-semibold text-[#F4A62A]">Origin Operations</p>
                    <p className="mt-0.5 text-slate-300">China Consolidation Hub</p>
                  </div>
                  <div className="pl-3">
                    <p className="font-semibold text-[#F4A62A]">Destination Coverage</p>
                    <p className="mt-0.5 text-slate-300">All 36 Nigerian States &amp; FCT</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION G: WHY CHOOSE DGT? */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
              Business Reliability
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#10243A] sm:text-3xl">
              Why Choose Danmusa Global Trade?
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Built for transparent international trade between China and Nigeria with structured procurement, clear pricing, and end-to-end operational accountability.
            </p>
          </div>

          <div className="mt-10 grid gap-x-8 gap-y-8 border-t border-slate-200 pt-10 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_CHOOSE_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div key={pillar.title} className="space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-base font-bold text-[#10243A]">
                    {pillar.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#64748B]">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION H: HOW IT WORKS (5 STEPS) */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
            Procurement &amp; Fulfillment Workflow
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#10243A] sm:text-3xl">
            How It Works
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[#64748B]">
            A straightforward five-stage trade workflow designed for individual buyers and wholesale importers alike.
          </p>
        </div>

        <ol className="mt-10 grid gap-5 md:grid-cols-5">
          {HOW_IT_WORKS_STEPS.map((item) => (
            <li
              key={item.step}
              className="relative flex flex-col rounded-xl border border-slate-200 bg-white p-5"
            >
              <span className="font-mono text-xs font-bold text-[#2563EB]">
                STEP {item.step}
              </span>
              <h3 className="mt-2 font-display text-sm font-bold text-[#10243A]">
                {item.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#64748B]">
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* SECTION I: TRUST AND SUPPORT */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-8 rounded-2xl border border-slate-200 bg-[#F5F7FA] p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
            <div className="space-y-3 lg:col-span-7">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#10243A]">
                <ShieldCheck className="h-4 w-4 text-[#16865C]" />
                Trust &amp; Customer Support
              </div>
              <h2 className="font-display text-2xl font-extrabold text-[#10243A]">
                Need assistance with an order, quotation, or shipment?
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-[#64748B]">
                Our operations and customer support team is available to guide you through ready-stock availability, bulk quotations, bank transfer verification, and delivery scheduling across Nigeria.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link to="/contact">
                  <Button variant="primary" size="md">
                    Contact Support
                  </Button>
                </Link>
                <Link to="/account/tracking">
                  <Button variant="outline" size="md">
                    <Truck className="h-4 w-4" />
                    Track an Order
                  </Button>
                </Link>
                <Link to="/catalogue">
                  <Button variant="ghost" size="md">
                    <Search className="h-4 w-4" />
                    Search Products
                  </Button>
                </Link>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-xs text-[#64748B] lg:col-span-5">
              <p className="font-display text-sm font-bold text-[#10243A]">
                Official Business Channels
              </p>
              <div className="space-y-2.5">
                <p className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                  <span>{DGT_BRAND.placeholders.nigeriaOfficeAddress}</span>
                </p>
                <p className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                  <span>{DGT_BRAND.placeholders.katsinaHubAddress}</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-[#2563EB]" />
                  <span>{DGT_BRAND.placeholders.businessPhone}</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-[#2563EB]" />
                  <span>{DGT_BRAND.placeholders.supportEmail}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
