import { Link } from 'react-router-dom';
import { formatCurrencyAmount } from '../../config/app.config';
import { useCart } from '../../context/CartContext';
import type { DemoProduct } from '../../types/domain';
import { Button } from '../ui/Button';
import { ProductImage } from '../ui/ProductImage';

interface ProductCardProps {
  product: DemoProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, displayCurrency } = useCart();
  const isReadyStock = product.fulfillmentMode === 'ready_stock';

  return (
    <article className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300">
      <div>
        <Link to={`/catalogue/${product.slug}`} className="block">
          <ProductImage
            src={product.imageUrl}
            alt={product.imageAlt}
            categoryLabel={product.categoryName}
            aspectRatio="4/3"
          />
        </Link>

        {/* Clean unboxed metadata with typographic separator (no pill badges) */}
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-[#0B1E3D]">
            {isReadyStock ? 'Ready-Stock' : 'Pre-Order'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{product.categoryName}</span>
        </div>

        <Link to={`/catalogue/${product.slug}`} className="mt-1.5 block">
          <h3 className="font-display text-base font-semibold leading-snug text-[#0B1E3D] group-hover:text-[#15315E]">
            {product.name}
          </h3>
        </Link>

        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
          {product.shortDescription}
        </p>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] text-slate-500">
            {isReadyStock ? 'Demo Fixed Price' : 'Demo Est. Reference'}
          </p>
          <p className="font-mono text-sm font-bold text-[#0B1E3D] tabular-nums">
            {formatCurrencyAmount(product.demoPriceNgn, displayCurrency)}
          </p>
        </div>

        {isReadyStock ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => addItem(product, 1)}
          >
            Add to Bag
          </Button>
        ) : (
          <Link to={`/catalogue/${product.slug}`}>
            <Button variant="outline" size="sm">
              Request Quote
            </Button>
          </Link>
        )}
      </div>
    </article>
  );
}
