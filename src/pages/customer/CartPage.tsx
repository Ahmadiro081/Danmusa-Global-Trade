import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/StateViews';
import { useCart } from '../../context/CartContext';
import { formatCurrencyAmount } from '../../config/app.config';

export function CartPage() {
  const {
    items,
    totalCount,
    subtotalNgn,
    displayCurrency,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  return (
    <div className="bg-[#F5F7FA] pb-16">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
            Order Preparation
          </p>
          <div className="mt-1.5 flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display text-2xl font-extrabold text-[#10243A] sm:text-3xl">
              Shopping Cart
            </h1>
            <Link
              to="/catalogue"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Continue Shopping
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {items.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-5 w-5" />}
            title="Your shopping cart is currently empty"
            description="Browse live ready-stock inventory in the Danmusa Global Trade catalogue or submit a custom China wholesale sourcing request."
            action={
              <>
                <Link to="/catalogue">
                  <Button variant="primary" size="md">
                    Explore Products
                  </Button>
                </Link>
                <Link to="/sourcing">
                  <Button variant="outline" size="md">
                    Request Wholesale Sourcing
                  </Button>
                </Link>
              </>
            }
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Cart Line Items */}
            <div className="space-y-4 lg:col-span-8">
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span className="tabular-nums">
                  {totalCount} {totalCount === 1 ? 'unit' : 'units'} across{' '}
                  {items.length} {items.length === 1 ? 'line item' : 'line items'}
                </span>
                <button
                  type="button"
                  onClick={clearCart}
                  className="font-semibold text-[#DC2626] hover:underline cursor-pointer"
                >
                  Clear Cart
                </button>
              </div>

              <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                {items.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
                  >
                    <Link
                      to={`/catalogue/${product.slug}`}
                      className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-[#F5F7FA]"
                    >
                      {product.primaryImageUrl ? (
                        <img
                          src={product.primaryImageUrl}
                          alt={product.primaryImageAlt}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-[#64748B]">
                          DGT
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          tone={
                            product.fulfillmentMode === 'ready_stock'
                              ? 'success'
                              : 'warning'
                          }
                        >
                          {product.fulfillmentMode === 'ready_stock'
                            ? 'Ready Stock'
                            : 'Pre-Order'}
                        </StatusBadge>
                        <span className="font-mono text-[11px] text-[#64748B]">
                          {product.sku}
                        </span>
                      </div>
                      <Link
                        to={`/catalogue/${product.slug}`}
                        className="block font-display text-base font-bold text-[#10243A] hover:text-[#2563EB]"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-[#64748B] tabular-nums">
                        Unit Price:{' '}
                        <strong className="text-[#202B38]">
                          {formatCurrencyAmount(product.priceNgn, displayCurrency)}
                        </strong>
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <p className="font-display text-base font-extrabold tabular-nums text-[#10243A]">
                        {formatCurrencyAmount(
                          product.priceNgn * quantity,
                          displayCurrency,
                        )}
                      </p>

                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-[#F5F7FA]">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="flex h-8 w-8 items-center justify-center text-[#10243A] hover:text-[#2563EB] cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[32px] text-center text-xs font-bold tabular-nums text-[#10243A]">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            className="flex h-8 w-8 items-center justify-center text-[#10243A] hover:text-[#2563EB] cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(product.id)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-[#DC2626] cursor-pointer"
                          aria-label={`Remove ${product.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary Column */}
            <div className="lg:col-span-4">
              <Card className="sticky top-24 space-y-5">
                <h2 className="font-display text-lg font-bold text-[#10243A]">
                  Order Summary
                </h2>

                <dl className="space-y-3 border-y border-slate-200 py-4 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-[#64748B]">Items ({totalCount})</dt>
                    <dd className="font-semibold tabular-nums text-[#10243A]">
                      {formatCurrencyAmount(subtotalNgn, displayCurrency)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#64748B]">State Delivery Fee</dt>
                    <dd className="text-xs font-medium text-[#64748B]">
                      Calculated at checkout
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <dt className="font-display font-bold text-[#10243A]">
                      Estimated Total
                    </dt>
                    <dd className="font-display text-xl font-extrabold tabular-nums text-[#10243A]">
                      {formatCurrencyAmount(subtotalNgn, displayCurrency)}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-2.5">
                  <Link to="/checkout">
                    <Button variant="primary" size="lg" fullWidth>
                      Proceed to Checkout
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/catalogue">
                    <Button variant="outline" size="md" fullWidth>
                      Continue Shopping
                    </Button>
                  </Link>
                </div>

                <div className="flex items-start gap-2.5 rounded-lg bg-[#F5F7FA] p-3 text-xs text-[#64748B]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#16865C]" />
                  <span>
                    All DGT orders settle via verified corporate bank transfer. Payment receipts are uploaded privately inside your Customer Portal.
                  </span>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
