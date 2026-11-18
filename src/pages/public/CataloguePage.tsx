import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCard } from '../../components/catalogue/ProductCard';
import { SelectInput } from '../../components/ui/FormField';
import { EmptyState, IntegrationNotice } from '../../components/ui/StateViews';
import { CURRENCIES } from '../../config/app.config';
import { useCart } from '../../context/CartContext';
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from '../../data/demoCatalogue';
import type { CurrencyCode, FulfillmentMode } from '../../types/domain';

export function CataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { displayCurrency, setDisplayCurrency } = useCart();

  const initialQuery = searchParams.get('q') ?? '';
  const initialCategory = searchParams.get('category') ?? 'all';
  const initialMode = (searchParams.get('mode') as FulfillmentMode | 'all') ?? 'all';

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedMode, setSelectedMode] = useState<FulfillmentMode | 'all'>(
    initialMode === 'ready_stock' || initialMode === 'pre_order' ? initialMode : 'all',
  );

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_PRODUCTS.filter((product) => {
      if (selectedCategory !== 'all' && product.categorySlug !== selectedCategory) {
        return false;
      }
      if (selectedMode !== 'all' && product.fulfillmentMode !== selectedMode) {
        return false;
      }
      if (q) {
        const haystack =
          `${product.name} ${product.sku} ${product.categoryName} ${product.shortDescription}`.toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  }, [query, selectedCategory, selectedMode]);

  const handleResetFilters = () => {
    setQuery('');
    setSelectedCategory('all');
    setSelectedMode('all');
    setSearchParams({});
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#8E6B0C]">
            DGT Trade Catalogue · Demonstration Preview
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#0B1E3D]">
            Product Catalogue
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Browse demonstration listings across ready-stock fixed-price goods and
            pre-order quotation items.
          </p>
        </div>

        {/* Display Currency Selector */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <label
            htmlFor="catalogue-currency"
            className="text-xs font-medium text-slate-600 whitespace-nowrap"
          >
            Display Currency
          </label>
          <SelectInput
            id="catalogue-currency"
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value as CurrencyCode)}
            className="w-40"
          >
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
              <option key={code} value={code}>
                {code} ({CURRENCIES[code].symbol})
              </option>
            ))}
          </SelectInput>
        </div>
      </div>

      <IntegrationNotice
        title="Demonstration Catalogue Content"
        description="Products, prices, and currency conversions shown here are Stage 1 demonstration records for interface verification. Live inventory counts and Finance Manager exchange rates will load from Supabase PostgreSQL once connected."
      />

      {/* Filter Bar */}
      <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-12 lg:items-center">
        <div className="relative lg:col-span-5">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by product name, SKU, or specification..."
            aria-label="Filter catalogue"
            className="w-full min-h-[42px] rounded-md border border-slate-300 bg-white pl-10 pr-4 text-sm text-[#0B1E3D] focus:border-[#0B1E3D] focus:outline-none focus:ring-2 focus:ring-[#0B1E3D]/15"
          />
        </div>

        <div className="lg:col-span-3">
          <SelectInput
            aria-label="Filter by category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {DEMO_CATEGORIES.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 lg:col-span-4">
          {(
            [
              { value: 'all', label: 'All Types' },
              { value: 'ready_stock', label: 'Ready-Stock' },
              { value: 'pre_order', label: 'Pre-Order' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setSelectedMode(mode.value)}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedMode === mode.value
                  ? 'bg-[#0B1E3D] text-white'
                  : 'text-slate-600 hover:text-[#0B1E3D]'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          title="No matching demonstration items"
          description="Try clearing your search query or switching back to all product categories."
          action={
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-md bg-[#0B1E3D] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
