import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrencyAmount } from '../../config/app.config';
import { useCart } from '../../context/CartContext';
import { Button } from '../ui/Button';

export function CartDrawer() {
  const {
    items,
    totalCount,
    subtotalNgn,
    displayCurrency,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
  } = useCart();

  if (!isDrawerOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0B1E3D]/50 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping bag"
    >
      <div className="flex h-full w-full max-w-md flex-col bg-white border-l border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#0B1E3D]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-[#0B1E3D]">
              Shopping Bag ({totalCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close shopping bag"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#0B1E3D] cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display text-base font-semibold text-[#0B1E3D]">
                Your bag is currently empty
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Add ready-stock demonstration items from the DGT catalogue to preview
                cart and checkout totals.
              </p>
              <div className="mt-6">
                <Link to="/catalogue" onClick={closeDrawer}>
                  <Button variant="primary">Browse Catalogue</Button>
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="py-4 flex gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">
                      {product.categoryName} · {product.sku}
                    </p>
                    <Link
                      to={`/catalogue/${product.slug}`}
                      onClick={closeDrawer}
                      className="mt-0.5 block text-sm font-semibold text-[#0B1E3D] hover:underline truncate"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-1 font-mono text-xs font-medium text-slate-700 tabular-nums">
                      {formatCurrencyAmount(product.demoPriceNgn * quantity, displayCurrency)}
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="inline-flex items-center rounded-md border border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          aria-label={`Decrease quantity for ${product.name}`}
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <span className="px-3 text-xs font-mono font-semibold tabular-nums">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          aria-label={`Increase quantity for ${product.name}`}
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(product.id)}
                        aria-label={`Remove ${product.name}`}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 ? (
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Demonstration Subtotal</span>
              <span className="font-mono text-base font-bold text-[#0B1E3D] tabular-nums">
                {formatCurrencyAmount(subtotalNgn, displayCurrency)}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Temporary session bag only. Order creation requires live checkout backend
              validation.
            </p>
            <div className="flex gap-3">
              <Link to="/cart" onClick={closeDrawer} className="flex-1">
                <Button variant="outline" className="w-full">
                  View Bag
                </Button>
              </Link>
              <Link to="/checkout" onClick={closeDrawer} className="flex-1">
                <Button variant="primary" className="w-full">
                  Checkout
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
