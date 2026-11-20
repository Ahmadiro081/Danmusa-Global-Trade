import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { ProductImage } from '../../components/ui/ProductImage';
import { ProductCard } from '../../components/catalogue/ProductCard';
import {
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
} from '../../components/ui/StateViews';
import {
  CURRENCIES,
  DGT_BRAND,
  SHIPPING_METHODS,
  formatCurrencyAmount,
} from '../../config/app.config';
import { useCart } from '../../context/CartContext';
import {
  extractProductSpecifications,
  fetchPublicPlatformConfig,
  fetchPublicProductBySlug,
  fetchPublicProducts,
} from '../../services/catalogueService';
import type {
  CurrencyCode,
  PublicPlatformConfig,
  StorefrontProduct,
} from '../../types/domain';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, displayCurrency, setDisplayCurrency } = useCart();

  const [product, setProduct] = useState<StorefrontProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<StorefrontProduct[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PublicPlatformConfig | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadProduct = async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      setSelectedImageIdx(0);

      try {
        const [item, cfg] = await Promise.all([
          fetchPublicProductBySlug(slug),
          fetchPublicPlatformConfig().catch(() => null),
        ]);
        if (cancelled) return;
        setProduct(item);
        setQuantity(Math.max(1, item.moq));
        setPlatformConfig(cfg);

        // Fetch related live products in the same category
        try {
          const sameCategory = await fetchPublicProducts({
            category: item.categorySlug,
          });
          if (!cancelled) {
            setRelatedProducts(
              sameCategory.filter((p) => p.id !== item.id).slice(0, 4),
            );
          }
        } catch {
          if (!cancelled) setRelatedProducts([]);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Unable to load product.';
        if (msg.toLowerCase().includes('not found') || msg.includes('404')) {
          setNotFound(true);
        } else {
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProduct();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const specifications = useMemo(
    () => (product ? extractProductSpecifications(product) : []),
    [product],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  if (notFound || (!error && !product)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<Package className="h-5 w-5" />}
          title="Product not found"
          description="This product listing may have been removed or is no longer active. Browse our live catalogue or request custom sourcing from China."
          action={
            <>
              <Link to="/catalogue">
                <Button variant="primary" size="sm">
                  Back to Catalogue
                </Button>
              </Link>
              <Link to="/sourcing">
                <Button variant="outline" size="sm">
                  Request Custom Sourcing
                </Button>
              </Link>
            </>
          }
        />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <ErrorBanner
          title="Unable to load product details"
          message={error ?? 'An unexpected error occurred.'}
          action={
            <Link to="/catalogue">
              <Button variant="outline" size="sm">
                Return to Shop
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const isReadyStock = product.fulfillmentMode === 'ready_stock';
  const activeMedia = product.media[selectedImageIdx] ?? null;
  const shippingInfo = SHIPPING_METHODS.find(
    (m) => m.code === product.shippingMethod,
  );
  const whatsappEnabled = Boolean(platformConfig?.integrations?.whatsappConfigured);

  return (
    <div className="bg-[#F5F7FA] pb-16">
      {/* Breadcrumb Bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-xs sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-2 text-[#64748B]" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-[#2563EB]">
              Home
            </Link>
            <span>/</span>
            <Link to="/catalogue" className="hover:text-[#2563EB]">
              Shop
            </Link>
            <span>/</span>
            <Link
              to={`/catalogue?category=${product.categorySlug}`}
              className="hover:text-[#2563EB]"
            >
              {product.categoryName}
            </Link>
            <span>/</span>
            <span className="truncate font-semibold text-[#10243A]">
              {product.name}
            </span>
          </nav>

          <Link
            to="/catalogue"
            className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Shop
          </Link>
        </div>
      </div>

      {/* Main Product Showcase */}
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-8 lg:grid-cols-12">
          {/* Left: Multi-Image Studio Gallery */}
          <div className="space-y-4 lg:col-span-7">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#F5F7FA]">
              <ProductImage
                src={activeMedia?.url ?? product.primaryImageUrl}
                alt={activeMedia?.altText ?? product.primaryImageAlt}
                aspectClass="aspect-[4/3]"
                priority
              />
            </div>

            {product.media.length > 1 && (
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                {product.media.map((img, idx) => (
                  <button
                    key={`${img.url}-${idx}`}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`overflow-hidden rounded-lg border-2 bg-[#F5F7FA] transition-all cursor-pointer ${
                      idx === selectedImageIdx
                        ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                    aria-label={`View image ${idx + 1} of ${product.name}`}
                  >
                    <img
                      src={img.url}
                      alt={img.altText ?? `${product.name} preview ${idx + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Commercial Purchase & Quote Panel */}
          <div className="flex flex-col space-y-5 lg:col-span-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={isReadyStock ? 'success' : 'warning'}>
                {isReadyStock ? 'Ready Stock' : 'Pre-Order from China'}
              </StatusBadge>
              <span className="font-mono text-xs text-[#64748B]">
                SKU: {product.sku}
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
                {product.categoryName}
                {product.brand ? ` · ${product.brand}` : ''}
              </p>
              <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight text-[#10243A] sm:text-3xl">
                {product.name}
              </h1>
            </div>

            {/* Price & Currency Block */}
            <div className="rounded-xl border border-slate-200 bg-[#F5F7FA] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-[#64748B]">
                    Unit Price ({displayCurrency})
                  </p>
                  <p className="mt-0.5 font-display text-3xl font-extrabold tabular-nums text-[#10243A]">
                    {product.priceNgn > 0
                      ? formatCurrencyAmount(product.priceNgn, displayCurrency)
                      : 'Quotation on Request'}
                  </p>
                </div>

                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setDisplayCurrency(code)}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                        displayCurrency === code
                          ? 'bg-[#10243A] text-white'
                          : 'text-[#64748B] hover:text-[#10243A]'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-200/80 pt-3 text-xs text-[#64748B]">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#202B38]">
                  {isReadyStock ? (
                    <CheckCircle2 className="h-4 w-4 text-[#16865C]" />
                  ) : (
                    <Clock className="h-4 w-4 text-[#D97706]" />
                  )}
                  {product.availabilityLabel}
                </span>
                <span className="tabular-nums">
                  MOQ: <strong className="text-[#10243A]">{product.moq}</strong> unit(s)
                </span>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-sm leading-relaxed text-[#64748B]">
                {product.description}
              </p>
            )}

            {/* Quantity & Primary Actions */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Quantity
                </span>
                <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => Math.max(product.moq, q - 1))
                    }
                    className="flex h-10 w-10 items-center justify-center text-[#10243A] hover:bg-[#F5F7FA] cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[44px] text-center text-sm font-bold tabular-nums text-[#10243A]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="flex h-10 w-10 items-center justify-center text-[#10243A] hover:bg-[#F5F7FA] cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {product.priceNgn > 0 && (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => addItem(product, quantity)}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to Cart
                  </Button>
                )}

                <Link
                  to={`/sourcing?product=${encodeURIComponent(product.name)}&sku=${encodeURIComponent(product.sku)}`}
                  className={product.priceNgn > 0 ? '' : 'sm:col-span-2'}
                >
                  <Button variant="accent" size="lg" fullWidth>
                    <FileText className="h-4 w-4" />
                    Request a Quote
                  </Button>
                </Link>
              </div>

              {whatsappEnabled && (
                <Link
                  to={`/contact?subject=${encodeURIComponent(`WhatsApp Enquiry: ${product.name} (${product.sku})`)}`}
                >
                  <Button variant="outline" size="md" fullWidth>
                    <MessageCircle className="h-4 w-4 text-[#16865C]" />
                    WhatsApp Product Enquiry
                  </Button>
                </Link>
              )}
            </div>

            {/* Fulfillment & Shipping Assurance Strip */}
            <div className="mt-auto space-y-2.5 border-t border-slate-200 pt-4 text-xs text-[#64748B]">
              <div className="flex items-start gap-2.5">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                <span>
                  <strong className="text-[#10243A]">Shipping Method:</strong>{' '}
                  {shippingInfo?.label ?? 'Custom Freight Quotation'} —{' '}
                  {shippingInfo?.description}
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#16865C]" />
                <span>
                  Verified bank transfer checkout with official receipt confirmation by {DGT_BRAND.name} Finance.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Category-Aware Specifications Section */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="font-display text-lg font-bold text-[#10243A]">
              Product Specifications
            </h2>
            <p className="mt-1 text-xs text-[#64748B]">
              Technical details and trade parameters supplied for {product.categoryName}.
            </p>
          </div>

          {specifications.length === 0 ? (
            <p className="mt-5 text-sm text-[#64748B]">
              Detailed specification sheets for this item are provided upon formal quotation request.
            </p>
          ) : (
            <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {specifications.map((spec) => (
                <div
                  key={spec.label}
                  className="border-b border-slate-100 pb-3"
                >
                  <dt className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
                    {spec.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-[#10243A]">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-xl font-bold text-[#10243A]">
                Related Products in {product.categoryName}
              </h2>
              <Link
                to={`/catalogue?category=${product.categorySlug}`}
                className="text-xs font-semibold text-[#2563EB] hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
