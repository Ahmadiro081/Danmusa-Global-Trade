import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ProductImage } from '../../components/ui/ProductImage';
import { EmptyState, IntegrationNotice } from '../../components/ui/StateViews';
import {
  formatCurrencyAmount,
  SHIPPING_METHODS,
} from '../../config/app.config';
import { useCart } from '../../context/CartContext';
import { DEMO_PRODUCTS } from '../../data/demoCatalogue';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, displayCurrency } = useCart();
  const [quantity, setQuantity] = useState(1);

  const product = DEMO_PRODUCTS.find((item) => item.slug === slug);

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="Product listing not found"
          description="The requested demonstration product could not be found in the current catalogue."
          action={
            <Link to="/catalogue">
              <Button variant="primary">Return to Catalogue</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const isReadyStock = product.fulfillmentMode === 'ready_stock';
  const shippingInfo = SHIPPING_METHODS.find(
    (method) => method.code === product.shippingMethod,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div>
        <Link
          to="/catalogue"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0B1E3D]"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to Catalogue
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
        {/* Left Sticky Visual */}
        <div className="lg:col-span-6 lg:sticky lg:top-24">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <ProductImage
              src={product.imageUrl}
              alt={product.imageAlt}
              categoryLabel={product.categoryName}
              aspectRatio="4/3"
            />
          </div>
        </div>

        {/* Right Contiguous Purchase / Quotation Module */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#8E6B0C]">
                {isReadyStock ? 'Ready-Stock' : 'Pre-Order · Quotation Required'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{product.categoryName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{product.sku}</span>
            </div>

            <h1 className="font-display text-2xl font-bold text-[#0B1E3D] sm:text-3xl">
              {product.name}
            </h1>

            <p className="text-sm leading-relaxed text-slate-600">
              {product.shortDescription}
            </p>

            <div className="border-y border-slate-200 py-4 flex flex-col gap-1">
              <span className="text-xs text-slate-500">
                {isReadyStock
                  ? `Demonstration Fixed Price (${displayCurrency})`
                  : `Demonstration Reference Estimate (${displayCurrency})`}
              </span>
              <span className="font-mono text-2xl font-bold text-[#0B1E3D] tabular-nums">
                {formatCurrencyAmount(product.demoPriceNgn, displayCurrency)}
              </span>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                Supplier Reference: ¥{product.demoReferenceCny.toLocaleString()} CNY · MOQ{' '}
                {product.moq}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>
                <span className="font-semibold text-[#0B1E3D]">Shipping Calculation:</span>{' '}
                {shippingInfo?.label ?? product.shippingMethod} — {shippingInfo?.description}
              </p>
              <p>
                <span className="font-semibold text-[#0B1E3D]">Fulfillment Lead Time:</span>{' '}
                {product.estimatedLeadTime}
              </p>
            </div>

            {isReadyStock ? (
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="inline-flex items-center rounded-md border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="min-h-[42px] min-w-[42px] flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <span className="px-4 font-mono text-sm font-semibold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    aria-label="Increase quantity"
                    className="min-h-[42px] min-w-[42px] flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  onClick={() => addItem(product, quantity)}
                >
                  Add {quantity} to Bag
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Link to="/sourcing" className="flex-1">
                  <Button variant="accent" size="lg" className="w-full">
                    Request Pre-Order Quotation
                  </Button>
                </Link>
                <Link to="/account/sourcing" className="flex-1">
                  <Button variant="outline" size="lg" className="w-full">
                    Customer Quotation Portal
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Specifications Table */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
              <h2 className="font-display text-sm font-semibold text-[#0B1E3D]">
                Demonstration Specifications
              </h2>
            </div>
            <dl className="divide-y divide-slate-200">
              {product.specifications.map((spec) => (
                <div
                  key={spec.label}
                  className="grid grid-cols-1 gap-1 px-6 py-3 sm:grid-cols-2"
                >
                  <dt className="text-xs font-medium text-slate-500">{spec.label}</dt>
                  <dd className="text-xs font-semibold text-[#0B1E3D] sm:text-right">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <IntegrationNotice
            title="Stage 1 Demonstration Product Notice"
            description="Stock levels and final binding prices are not live yet. Real inventory reservation and bank transfer payment verification will be handled server-side via Supabase PostgreSQL."
          />
        </div>
      </div>
    </div>
  );
}
