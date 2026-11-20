import { Link } from 'react-router-dom';
import { ArrowRight, FileText, ShoppingBag } from 'lucide-react';
import type { StorefrontProduct } from '../../types/domain';
import { formatCurrencyAmount } from '../../config/app.config';
import { useCart } from '../../context/CartContext';
import { ProductImage } from '../ui/ProductImage';
import { StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface ProductCardProps {
  product: StorefrontProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, displayCurrency } = useCart();
  const isReadyStock = product.fulfillmentMode === 'ready_stock';

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      {/* Studio Image Area (65–70% visual presence) */}
      <Link
        to={`/catalogue/${product.slug}`}
        className="relative block overflow-hidden bg-[#F5F7FA]"
      >
        <ProductImage
          src={product.primaryImageUrl}
          alt={product.primaryImageAlt}
          aspectClass="aspect-[4/3]"
        />
        <div className="absolute left-3 top-3">
          <StatusBadge tone={isReadyStock ? 'success' : 'warning'} className="bg-white/95 backdrop-blur-xs">
            {isReadyStock ? 'Ready Stock' : 'Pre-Order'}
          </StatusBadge>
        </div>
      </Link>

      {/* Clean Product Metadata */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 text-[11px] text-[#64748B]">
          <span className="truncate font-medium">{product.categoryName}</span>
          {product.brand && (
            <span className="truncate font-semibold text-[#10243A]">{product.brand}</span>
          )}
        </div>

        <Link
          to={`/catalogue/${product.slug}`}
          className="mt-1.5 line-clamp-2 font-display text-base font-bold leading-snug text-[#10243A] transition-colors group-hover:text-[#2563EB]"
        >
          {product.name}
        </Link>

        <p className="mt-1 text-xs text-[#64748B]">
          {product.availabilityLabel}
        </p>

        <div className="mt-auto pt-4">
          <div className="flex items-baseline justify-between gap-2 border-t border-slate-100 pt-3">
            <div>
              <p className="font-display text-lg font-extrabold tabular-nums text-[#10243A]">
                {product.priceNgn > 0
                  ? formatCurrencyAmount(product.priceNgn, displayCurrency)
                  : 'Quote on Request'}
              </p>
              {product.moq > 1 && (
                <p className="text-[11px] text-[#64748B] tabular-nums">
                  MOQ: {product.moq} units
                </p>
              )}
            </div>
            <Link
              to={`/catalogue/${product.slug}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
            >
              Details
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-3">
            {isReadyStock && product.priceNgn > 0 ? (
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => addItem(product, product.moq)}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Add to Cart
              </Button>
            ) : (
              <Link to={`/sourcing?product=${encodeURIComponent(product.name)}`}>
                <Button variant="outline" size="sm" fullWidth>
                  <FileText className="h-3.5 w-3.5" />
                  Request Quote
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
