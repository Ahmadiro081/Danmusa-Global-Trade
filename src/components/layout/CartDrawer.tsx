import { Link } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatCurrencyAmount } from '../../config/app.config';
import { Button } from '../ui/Button';

export function CartDrawer() {
  const {
    items,
    subtotalNgn,
    displayCurrency,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
  } = useCart();

  if (!isDrawerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#10243A]/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart"
      onClick={closeDrawer}
    >
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-[#10243A]" />
            <div>
              <h2 className="font-display text-base font-bold text-[#10243A]">
                Shopping Cart
              </h2>
              <p className="text-xs text-[#64748B] tabular-nums">
                {items.reduce((sum, i) => sum + i.quantity, 0)} item(s) selected
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#10243A] cursor-pointer"
            aria-label="Close shopping cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F7FA] text-[#10243A] ring-1 ring-slate-200">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="font-display text-base font-bold text-[#10243A]">
                Your cart is empty
              </h3>
              <p className="mt-1.5 max-w-xs text-sm text-[#64748B]">
                Explore ready-stock items in the DGT catalogue or request a custom wholesale quote from China.
              </p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <Link to="/catalogue" onClick={closeDrawer}>
                  <Button variant="primary" size="sm">
                    Browse Catalogue
                  </Button>
                </Link>
                <Link to="/sourcing" onClick={closeDrawer}>
                  <Button variant="outline" size="sm">
                    Wholesale Sourcing
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex gap-4 py-4 first:pt-0">
                  <Link
                    to={`/catalogue/${product.slug}`}
                    onClick={closeDrawer}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-[#F5F7FA]"
                  >
                    {product.primaryImageUrl ? (
                      <img
                        src={product.primaryImageUrl}
                        alt={product.primaryImageAlt}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-[#64748B]">
                        DGT
                      </div>
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/catalogue/${product.slug}`}
                          onClick={closeDrawer}
                          className="line-clamp-2 text-sm font-semibold text-[#10243A] hover:text-[#2563EB]"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-0.5 font-mono text-[11px] text-[#64748B]">
                          {product.sku}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(product.id)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-[#DC2626] cursor-pointer"
                        aria-label={`Remove ${product.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-[#F5F7FA]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center text-[#202B38] hover:text-[#2563EB] cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[28px] text-center text-xs font-semibold tabular-nums text-[#10243A]">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center text-[#202B38] hover:text-[#2563EB] cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p className="text-sm font-bold tabular-nums text-[#10243A]">
                        {formatCurrencyAmount(
                          product.priceNgn * quantity,
                          displayCurrency,
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-200 bg-[#F5F7FA] px-6 py-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#64748B]">
                Estimated Subtotal
              </span>
              <span className="font-display text-lg font-bold tabular-nums text-[#10243A]">
                {formatCurrencyAmount(subtotalNgn, displayCurrency)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#64748B]">
              Delivery fees by Nigerian state and bank transfer settlement instructions are shown at checkout.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Link to="/cart" onClick={closeDrawer}>
                <Button variant="outline" fullWidth>
                  View Cart
                </Button>
              </Link>
              <Link to="/checkout" onClick={closeDrawer}>
                <Button variant="primary" fullWidth>
                  Checkout
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
