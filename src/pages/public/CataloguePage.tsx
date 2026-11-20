import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Package,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { ProductCard } from '../../components/catalogue/ProductCard';
import { Button } from '../../components/ui/Button';
import {
  EmptyState,
  ErrorBanner,
  ProductGridSkeleton,
} from '../../components/ui/StateViews';
import { Pagination } from '../../components/ui/Pagination';
import { STOREFRONT_CATEGORY_DIRECTORY } from '../../config/categories';
import {
  fetchPublicCategories,
  fetchPublicProducts,
} from '../../services/catalogueService';
import type {
  FulfillmentMode,
  StorefrontCategory,
  StorefrontProduct,
} from '../../types/domain';

type SortOption = 'featured' | 'price_asc' | 'price_desc' | 'name_asc';

const PAGE_SIZE = 12;

export function CataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCategory = searchParams.get('category') || 'all';
  const initialMode =
    (searchParams.get('mode') as FulfillmentMode | 'all' | null) || 'all';
  const initialQuery = searchParams.get('q') || '';

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<FulfillmentMode | 'all'>(initialMode);
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

  const [liveProducts, setLiveProducts] = useState<StorefrontProduct[]>([]);
  const [liveCategories, setLiveCategories] = useState<StorefrontCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync URL query params into local state when navigated from Navbar / Home
  useEffect(() => {
    const cat = searchParams.get('category') || 'all';
    const mode = (searchParams.get('mode') as FulfillmentMode | 'all' | null) || 'all';
    const q = searchParams.get('q') || '';
    setSelectedCategory(cat);
    setSelectedMode(mode);
    setSearchQuery(q);
    setCurrentPage(1);
  }, [searchParams]);

  const loadCatalogue = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetchPublicProducts(),
        fetchPublicCategories(),
      ]);
      setLiveProducts(productsRes);
      setLiveCategories(categoriesRes);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load products from the DGT catalogue API.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalogue();
  }, []);

  // Merge live DB categories with the 8 official storefront category divisions
  const categoryOptions = useMemo(() => {
    const map = new Map<string, { slug: string; name: string }>();
    for (const dir of STOREFRONT_CATEGORY_DIRECTORY) {
      map.set(dir.slug, { slug: dir.slug, name: dir.name });
    }
    for (const dbCat of liveCategories) {
      map.set(dbCat.slug, { slug: dbCat.slug, name: dbCat.name });
    }
    return Array.from(map.values());
  }, [liveCategories]);

  // Dynamic brand and subcategory options extracted from real live products
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    liveProducts.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort();
  }, [liveProducts]);

  const availableSubcategories = useMemo(() => {
    const set = new Set<string>();
    liveProducts.forEach((p) => {
      if (
        p.subcategory &&
        (selectedCategory === 'all' || p.categorySlug === selectedCategory)
      ) {
        set.add(p.subcategory);
      }
    });
    return Array.from(set).sort();
  }, [liveProducts, selectedCategory]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const min = minPrice.trim() ? Number(minPrice) : null;
    const max = maxPrice.trim() ? Number(maxPrice) : null;

    const list = liveProducts.filter((product) => {
      if (selectedCategory !== 'all' && product.categorySlug !== selectedCategory) {
        return false;
      }
      if (selectedMode !== 'all' && product.fulfillmentMode !== selectedMode) {
        return false;
      }
      if (selectedBrand !== 'all' && product.brand !== selectedBrand) {
        return false;
      }
      if (
        selectedSubcategory !== 'all' &&
        product.subcategory !== selectedSubcategory
      ) {
        return false;
      }
      if (min !== null && !Number.isNaN(min) && product.priceNgn < min) {
        return false;
      }
      if (max !== null && !Number.isNaN(max) && product.priceNgn > max) {
        return false;
      }
      if (q) {
        const haystack = `${product.name} ${product.sku} ${product.categoryName} ${product.brand ?? ''} ${product.description}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...list];
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => a.priceNgn - b.priceNgn);
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => b.priceNgn - a.priceNgn);
    } else if (sortBy === 'name_asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    }
    return sorted;
  }, [
    liveProducts,
    selectedCategory,
    selectedMode,
    selectedBrand,
    selectedSubcategory,
    minPrice,
    maxPrice,
    searchQuery,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, safePage]);

  const updateUrlParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (!v || v === 'all') {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    }
    setSearchParams(next, { replace: true });
  };

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    setSelectedSubcategory('all');
    setCurrentPage(1);
    updateUrlParams({ category: slug });
  };

  const handleModeChange = (mode: FulfillmentMode | 'all') => {
    setSelectedMode(mode);
    setCurrentPage(1);
    updateUrlParams({ mode });
  };

  const handleClearFilters = () => {
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedBrand('all');
    setSelectedMode('all');
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('featured');
    setCurrentPage(1);
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedSubcategory !== 'all' ||
    selectedBrand !== 'all' ||
    selectedMode !== 'all' ||
    searchQuery.trim().length > 0 ||
    minPrice.trim().length > 0 ||
    maxPrice.trim().length > 0;

  const activeCategoryLabel =
    selectedCategory === 'all'
      ? 'All Products'
      : categoryOptions.find((c) => c.slug === selectedCategory)?.name ??
        selectedCategory;

  const renderFilterControls = () => (
    <div className="space-y-6">
      {/* Fulfillment / Availability */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#10243A]">
          Availability
        </h3>
        <div className="mt-2.5 space-y-1.5">
          {[
            { value: 'all', label: 'All Availability' },
            { value: 'ready_stock', label: 'Ready Stock (In Nigeria)' },
            { value: 'pre_order', label: 'Pre-Order (From China)' },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-[#202B38] hover:bg-[#F5F7FA]"
            >
              <input
                type="radio"
                name="fulfillment-mode"
                checked={selectedMode === opt.value}
                onChange={() =>
                  handleModeChange(opt.value as FulfillmentMode | 'all')
                }
                className="h-4 w-4 accent-[#2563EB]"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="border-t border-slate-200 pt-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#10243A]">
          Categories
        </h3>
        <ul className="mt-2.5 space-y-1">
          <li>
            <button
              type="button"
              onClick={() => handleCategoryChange('all')}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#EFF6FF] font-semibold text-[#2563EB]'
                  : 'text-[#202B38] hover:bg-[#F5F7FA]'
              }`}
            >
              <span>All Categories</span>
              <span className="font-mono text-xs text-[#64748B]">
                {liveProducts.length}
              </span>
            </button>
          </li>
          {categoryOptions.map((cat) => {
            const count = liveProducts.filter(
              (p) => p.categorySlug === cat.slug,
            ).length;
            const active = selectedCategory === cat.slug;
            return (
              <li key={cat.slug}>
                <button
                  type="button"
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#EFF6FF] font-semibold text-[#2563EB]'
                      : 'text-[#202B38] hover:bg-[#F5F7FA]'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  <span className="font-mono text-xs text-[#64748B]">
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Subcategory Filter (when products expose subcategories) */}
      {availableSubcategories.length > 0 && (
        <div className="border-t border-slate-200 pt-5">
          <label
            htmlFor="filter-subcategory"
            className="block text-xs font-bold uppercase tracking-wider text-[#10243A]"
          >
            Subcategory
          </label>
          <select
            id="filter-subcategory"
            value={selectedSubcategory}
            onChange={(e) => {
              setSelectedSubcategory(e.target.value);
              setCurrentPage(1);
            }}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#202B38] focus:border-[#2563EB] focus:outline-none"
          >
            <option value="all">All Subcategories</option>
            {availableSubcategories.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Brand Filter (when products expose brands) */}
      {availableBrands.length > 0 && (
        <div className="border-t border-slate-200 pt-5">
          <label
            htmlFor="filter-brand"
            className="block text-xs font-bold uppercase tracking-wider text-[#10243A]"
          >
            Brand / Make
          </label>
          <select
            id="filter-brand"
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setCurrentPage(1);
            }}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#202B38] focus:border-[#2563EB] focus:outline-none"
          >
            <option value="all">All Brands</option>
            {availableBrands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Price Range Filter (NGN) */}
      <div className="border-t border-slate-200 pt-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#10243A]">
          Price Range (₦ NGN)
        </h3>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Min ₦"
            aria-label="Minimum price in NGN"
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-[#202B38] tabular-nums focus:border-[#2563EB] focus:outline-none"
          />
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Max ₦"
            aria-label="Maximum price in NGN"
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-[#202B38] tabular-nums focus:border-[#2563EB] focus:outline-none"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="border-t border-slate-200 pt-4">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={handleClearFilters}
          >
            Reset All Filters
          </Button>
        </div>
      )}

      {/* Custom Sourcing Callout */}
      <div className="rounded-xl bg-[#10243A] p-4 text-white">
        <p className="text-xs font-bold text-[#F4A62A]">
          Can’t find a specific item?
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">
          Submit your target product and quantity for direct China procurement.
        </p>
        <Link to="/sourcing" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white hover:text-[#F4A62A]">
          Request Sourcing Quote
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="bg-[#F5F7FA] pb-16">
      {/* Page Header Band */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav className="text-xs text-[#64748B]" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-[#2563EB]">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-[#10243A]">Shop</span>
            {selectedCategory !== 'all' && (
              <>
                <span className="mx-2">/</span>
                <span className="font-medium text-[#10243A]">
                  {activeCategoryLabel}
                </span>
              </>
            )}
          </nav>

          <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="font-display text-2xl font-extrabold text-[#10243A] sm:text-3xl">
                {activeCategoryLabel}
              </h1>
              <p className="mt-1.5 text-sm text-[#64748B]">
                Live ready-stock and pre-order listings managed by Danmusa Global Trade.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={loadCatalogue}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
              <Link to="/sourcing">
                <Button variant="accent" size="sm">
                  Request Custom Sourcing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Two-Column Catalogue Layout */}
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Desktop Category & Filter Sidebar */}
          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              {renderFilterControls()}
            </div>
          </aside>

          {/* Product Grid & Toolbar */}
          <div className="space-y-6 lg:col-span-9">
            {/* Search, Mobile Filter Trigger & Sort Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by product name, brand, or SKU..."
                  className="w-full rounded-lg border border-slate-300 bg-[#F5F7FA] py-2 pl-9 pr-3 text-sm text-[#202B38] placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </Button>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-[#64748B]">
                  <span className="hidden sm:inline">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label="Sort products"
                    className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-[#10243A] focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="featured">Featured</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="name_asc">Name: A–Z</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Results Metadata Bar */}
            {!loading && !error && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
                <p className="tabular-nums">
                  Showing{' '}
                  <span className="font-semibold text-[#10243A]">
                    {filteredProducts.length}
                  </span>{' '}
                  {filteredProducts.length === 1 ? 'product' : 'products'}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="font-semibold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Loading / Error / Empty / Grid States */}
            {loading ? (
              <ProductGridSkeleton count={6} />
            ) : error ? (
              <ErrorBanner
                title="Unable to load products"
                message={error}
                action={
                  <Button variant="outline" size="sm" onClick={loadCatalogue}>
                    Try Again
                  </Button>
                }
              />
            ) : liveProducts.length === 0 ? (
              <EmptyState
                icon={<Package className="h-5 w-5" />}
                title="No live products published yet"
                description="The DGT live product database currently has zero published listings. Once products are added by authorized product managers, they will appear here automatically. In the meantime, you can request any item directly through our China Wholesale Sourcing service."
                action={
                  <>
                    <Link to="/sourcing">
                      <Button variant="primary" size="md">
                        Request a Product from China
                      </Button>
                    </Link>
                    <Link to="/contact">
                      <Button variant="outline" size="md">
                        Contact DGT Sales
                      </Button>
                    </Link>
                  </>
                }
              />
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                icon={<Search className="h-5 w-5" />}
                title="No products match your current filters"
                description="Try broadening your price range, clearing your search query, or switching categories. Need an unlisted item sourced directly from China?"
                action={
                  <>
                    <Button variant="primary" size="sm" onClick={handleClearFilters}>
                      Clear All Filters
                    </Button>
                    <Link to="/sourcing">
                      <Button variant="outline" size="sm">
                        Submit Sourcing Request
                      </Button>
                    </Link>
                  </>
                }
              />
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {paginatedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPageChange={(p) => {
                    setCurrentPage(p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  totalItems={filteredProducts.length}
                  pageSize={PAGE_SIZE}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Slide-Over Filter Drawer */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-start bg-[#10243A]/55 backdrop-blur-[2px] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filter products"
          onClick={() => setMobileFiltersOpen(false)}
        >
          <div
            className="flex h-full w-full max-w-xs flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-display text-base font-bold text-[#10243A]">
                Filter Catalogue
              </h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-slate-100"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {renderFilterControls()}
            </div>
            <div className="border-t border-slate-200 p-4">
              <Button
                variant="primary"
                fullWidth
                onClick={() => setMobileFiltersOpen(false)}
              >
                Show Results ({filteredProducts.length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
