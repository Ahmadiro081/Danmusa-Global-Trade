import { CURRENCIES } from '../config/app.config';
import { apiFetch } from './apiClient';
import type {
  CurrencyCode,
  FulfillmentMode,
  LiveNigerianState,
  PublicPlatformConfig,
  ShippingMethod,
  StorefrontCategory,
  StorefrontProduct,
  StorefrontProductMedia,
} from '../types/domain';

interface RawCategoryRow {
  id: string;
  parent_id?: string | null;
  slug: string;
  name: string;
  description?: string | null;
  sort_order?: number | null;
}

interface RawProductMediaRow {
  url: string;
  alt_text?: string | null;
  is_primary?: boolean | null;
  sort_order?: number | null;
}

interface RawProductRow {
  id: string;
  sku: string;
  name: string;
  slug: string;
  fulfillment_mode?: string | null;
  base_currency?: string | null;
  base_price?: number | string | null;
  estimated_weight_kg?: number | string | null;
  estimated_volume_cbm?: number | string | null;
  shipping_method?: string | null;
  moq?: number | null;
  description?: string | null;
  specs_json?: Record<string, unknown> | null;
  is_featured?: boolean | null;
  categories?:
    | { id?: string; slug?: string; name?: string }
    | Array<{ id?: string; slug?: string; name?: string }>
    | null;
  product_media?: RawProductMediaRow[] | null;
}

function normalizeCurrency(raw?: string | null): CurrencyCode {
  if (raw === 'USD' || raw === 'CNY' || raw === 'NGN') return raw;
  return 'NGN';
}

function normalizeFulfillmentMode(raw?: string | null): FulfillmentMode {
  return raw === 'pre_order' ? 'pre_order' : 'ready_stock';
}

function normalizeShippingMethod(raw?: string | null): ShippingMethod {
  if (
    raw === 'weight_based' ||
    raw === 'volume_based' ||
    raw === 'product_based' ||
    raw === 'custom_quotation'
  ) {
    return raw;
  }
  return 'custom_quotation';
}

function readSpecString(
  specs: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const val = specs[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
    if (typeof val === 'number') {
      return String(val);
    }
  }
  return null;
}

function mapRawProduct(row: RawProductRow): StorefrontProduct {
  const categoryObj = Array.isArray(row.categories)
    ? row.categories[0]
    : row.categories;

  const media: StorefrontProductMedia[] = (row.product_media ?? [])
    .filter((m) => Boolean(m?.url))
    .map((m) => ({
      url: m.url,
      altText: m.alt_text ?? null,
      isPrimary: Boolean(m.is_primary),
      sortOrder: Number(m.sort_order ?? 0),
    }))
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });

  const baseCurrency = normalizeCurrency(row.base_currency);
  const basePrice = Number(row.base_price ?? 0);
  const priceNgn =
    baseCurrency === 'NGN'
      ? basePrice
      : Math.round(basePrice * CURRENCIES[baseCurrency].referenceRateToNgn);

  const specsJson: Record<string, unknown> =
    row.specs_json && typeof row.specs_json === 'object' && !Array.isArray(row.specs_json)
      ? row.specs_json
      : {};

  const fulfillmentMode = normalizeFulfillmentMode(row.fulfillment_mode);
  const brand = readSpecString(specsJson, ['brand', 'Brand', 'make', 'Make', 'manufacturer']);
  const subcategory = readSpecString(specsJson, ['subcategory', 'Subcategory', 'type', 'Type', 'body_type']);

  return {
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    name: row.name,
    categoryId: categoryObj?.id ?? null,
    categorySlug: categoryObj?.slug ?? 'general',
    categoryName: categoryObj?.name ?? 'General Merchandise',
    fulfillmentMode,
    baseCurrency,
    basePrice,
    priceNgn,
    shippingMethod: normalizeShippingMethod(row.shipping_method),
    moq: Math.max(1, Number(row.moq ?? 1)),
    description: row.description?.trim() ?? '',
    specsJson,
    estimatedWeightKg:
      row.estimated_weight_kg !== null && row.estimated_weight_kg !== undefined
        ? Number(row.estimated_weight_kg)
        : null,
    estimatedVolumeCbm:
      row.estimated_volume_cbm !== null && row.estimated_volume_cbm !== undefined
        ? Number(row.estimated_volume_cbm)
        : null,
    isFeatured: Boolean(row.is_featured),
    media,
    primaryImageUrl: media[0]?.url ?? null,
    primaryImageAlt: media[0]?.altText ?? row.name,
    brand,
    subcategory,
    availabilityLabel:
      fulfillmentMode === 'ready_stock'
        ? 'In Stock — Ready for Dispatch'
        : 'Available on Pre-Order from China',
  };
}

export async function fetchPublicCategories(): Promise<StorefrontCategory[]> {
  const data = await apiFetch<{ categories: RawCategoryRow[] }>('/api/categories');
  return (data.categories ?? []).map((row) => ({
    id: row.id,
    parentId: row.parent_id ?? null,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    sortOrder: Number(row.sort_order ?? 0),
  }));
}

export interface ProductQueryParams {
  category?: string;
  mode?: FulfillmentMode | 'all';
  q?: string;
}

export async function fetchPublicProducts(
  params: ProductQueryParams = {},
): Promise<StorefrontProduct[]> {
  const searchParams = new URLSearchParams();
  if (params.category && params.category !== 'all') {
    searchParams.set('category', params.category);
  }
  if (params.mode && params.mode !== 'all') {
    searchParams.set('mode', params.mode);
  }
  if (params.q && params.q.trim().length > 0) {
    searchParams.set('q', params.q.trim());
  }

  const queryString = searchParams.toString();
  const path = queryString ? `/api/products?${queryString}` : '/api/products';
  const data = await apiFetch<{ products: RawProductRow[] }>(path);
  return (data.products ?? []).map(mapRawProduct);
}

export async function fetchPublicProductBySlug(
  slug: string,
): Promise<StorefrontProduct> {
  const data = await apiFetch<{ product: RawProductRow }>(
    `/api/products/${encodeURIComponent(slug)}`,
  );
  return mapRawProduct(data.product);
}

export async function fetchPublicStates(): Promise<LiveNigerianState[]> {
  const data = await apiFetch<{ states: LiveNigerianState[] }>('/api/states');
  return data.states ?? [];
}

export async function fetchPublicPlatformConfig(): Promise<PublicPlatformConfig> {
  return apiFetch<PublicPlatformConfig>('/api/config/public');
}

function formatSpecLabel(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/**
 * Dynamically orders and extracts category-relevant technical specifications
 * from a live product's `specs_json` without fabricating values.
 */
export function extractProductSpecifications(
  product: StorefrontProduct,
): Array<{ label: string; value: string }> {
  const specs = product.specsJson ?? {};
  const slug = product.categorySlug.toLowerCase();

  let priorityKeys: string[] = [];
  if (slug.includes('car') || slug.includes('vehicle') || slug.includes('truck') || slug.includes('auto')) {
    priorityKeys = ['make', 'model', 'year', 'transmission', 'fuel_type', 'engine', 'condition', 'mileage', 'drivetrain'];
  } else if (slug.includes('phone') || slug.includes('mobile')) {
    priorityKeys = ['brand', 'model', 'storage', 'ram', 'display', 'battery', 'camera', 'network', 'warranty'];
  } else if (slug.includes('electronic') || slug.includes('computer') || slug.includes('laptop')) {
    priorityKeys = ['brand', 'model', 'processor', 'memory', 'storage', 'display', 'power', 'technical_specs', 'warranty'];
  } else {
    priorityKeys = ['brand', 'model', 'material', 'sizes', 'color', 'condition', 'warranty'];
  }

  const usedLowerKeys = new Set<string>();
  const rows: Array<{ label: string; value: string }> = [];

  const lowerMap = new Map<string, { originalKey: string; value: unknown }>();
  for (const [k, v] of Object.entries(specs)) {
    if (v === null || v === undefined || v === '') continue;
    lowerMap.set(k.toLowerCase(), { originalKey: k, value: v });
  }

  for (const priority of priorityKeys) {
    const match = lowerMap.get(priority);
    if (match) {
      usedLowerKeys.add(priority);
      rows.push({
        label: formatSpecLabel(match.originalKey),
        value: Array.isArray(match.value)
          ? match.value.join(', ')
          : String(match.value),
      });
    }
  }

  for (const [lowerKey, entry] of lowerMap.entries()) {
    if (usedLowerKeys.has(lowerKey)) continue;
    rows.push({
      label: formatSpecLabel(entry.originalKey),
      value: Array.isArray(entry.value)
        ? entry.value.join(', ')
        : typeof entry.value === 'object'
          ? JSON.stringify(entry.value)
          : String(entry.value),
    });
  }

  if (product.estimatedWeightKg) {
    rows.push({ label: 'Estimated Weight', value: `${product.estimatedWeightKg} kg` });
  }
  if (product.estimatedVolumeCbm) {
    rows.push({ label: 'Estimated Volume', value: `${product.estimatedVolumeCbm} CBM` });
  }

  return rows;
}
