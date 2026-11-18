import { Minus, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ProductImage } from '../../components/ui/ProductImage';
import { EmptyState } from '../../components/ui/StateViews';
import { formatCurrencyAmount } from '../../config/app.config';
import { useCart } from '../../context/CartContext';

export function CartPage() {
  const {
    items,
    subtotalNgn,
    displayCurrency,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#8E6B0C]">DGT Ready-Stock Bag</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#0B1E3D]">
            Shopping Cart
          </h1>
        </div>
        {items.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={clearCart}>
            Clear Bag
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Your shopping bag is empty"
          description="Select ready-stock demonstration items from the DGT catalogue to review line totals and checkout structure."
          action={
            <Link to="/catalogue">
              <Button variant="primary">Browse Catalogue</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-8 space-y-4">
            {items.map(({ product, quantity }) => (
              <Card key={product.id} padding="sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="w-full sm:w-36 shrink-0">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.imageAlt}
                      categoryLabel={product.categoryName}
                      aspectRatio="4/3"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">
                      {product.categoryName} · {product.sku}
                    </p>
                    <Link
                      to={`/catalogue/${product.slug}`}
                      className="mt-0.5 block font-display text-base font-semibold text-[#0B1E3D] hover:underline"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
                      Unit:{' '}
                      {formatCurrencyAmount(product.demoPriceNgn, displayCurrency)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <p className="font-mono text-sm font-bold text-[#0B1E3D] tabular-nums">
                      {formatCurrencyAmount(
                        product.demoPriceNgn * quantity,
                        displayCurrency,
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center rounded-md border border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          aria-label={`Decrease quantity for ${product.name}`}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <span className="px-3 font-mono text-xs font-semibold tabular-nums">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          aria-label={`Increase quantity for ${product.name}`}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(product.id)}
                        aria-label={`Remove ${product.name}`}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="lg:col-span-4 space-y-5">
            <h2 className="font-display text-lg font-bold text-[#0B1E3D]">
              Order Summary
            </h2>
            <dl className="space-y-3 border-y border-slate-200 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Demo Subtotal</dt>
                <dd className="font-mono font-semibold text-[#0B1E3D] tabular-nums">
                  {formatCurrencyAmount(subtotalNgn, displayCurrency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Nigerian Delivery Fee</dt>
                <dd className="text-xs text-slate-500">Calculated at checkout</dd>
              </div>
            </dl>

            <Link to="/checkout" className="block">
              <Button variant="primary" size="lg" className="w-full">
                Proceed to Checkout
              </Button>
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}
