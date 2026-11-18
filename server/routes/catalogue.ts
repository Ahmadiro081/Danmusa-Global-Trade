import { Router } from 'express';
import {
  defaultAuthResolver,
  requireDatabaseClient,
  type AuthResolver,
} from '../middleware/security.ts';

export function createCatalogueRouter(
  authResolver: AuthResolver = defaultAuthResolver,
): Router {
  const router = Router();
  const dbGuard = requireDatabaseClient(authResolver);

  router.get('/categories', dbGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const { data, error } = await supabase
      .from('categories')
      .select('id, parent_id, slug, name, description, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      res.status(500).json({ error: 'Failed to load categories' });
      return;
    }
    res.json({ categories: data ?? [] });
  });

  router.get('/products', dbGuard, async (req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const mode = typeof req.query.mode === 'string' ? req.query.mode : undefined;
    const categorySlug =
      typeof req.query.category === 'string' ? req.query.category : undefined;
    const search =
      typeof req.query.q === 'string' ? req.query.q.trim() : undefined;

    let query = supabase
      .from('products')
      .select(
        'id, sku, name, slug, fulfillment_mode, base_currency, base_price, shipping_method, moq, description, specs_json, is_featured, categories!inner(id, slug, name), product_media(url, alt_text, is_primary, sort_order)',
      )
      .eq('is_active', true);

    if (mode === 'ready_stock' || mode === 'pre_order') {
      query = query.eq('fulfillment_mode', mode);
    }
    if (categorySlug && categorySlug !== 'all') {
      query = query.eq('categories.slug', categorySlug);
    }
    if (search) {
      const escaped = search.replace(/[%_]/g, '');
      query = query.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%`);
    }

    const { data, error } = await query.order('is_featured', { ascending: false });
    if (error) {
      res.status(500).json({ error: 'Failed to load products' });
      return;
    }
    res.json({ products: data ?? [] });
  });

  router.get('/products/:slug', dbGuard, async (req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, sku, name, slug, fulfillment_mode, base_currency, base_price, estimated_weight_kg, estimated_volume_cbm, shipping_method, moq, description, specs_json, categories(id, slug, name), product_media(url, alt_text, is_primary, sort_order)',
      )
      .eq('slug', req.params.slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: 'Failed to load product details' });
      return;
    }
    if (!data) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({ product: data });
  });

  router.get('/states', dbGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const { data, error } = await supabase
      .from('nigerian_states')
      .select(
        'id, code, name, geopolitical_zone, is_fct, is_priority_hub, base_delivery_fee_ngn, estimated_transit_days',
      )
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      res.status(500).json({ error: 'Failed to load Nigerian states' });
      return;
    }
    res.json({ states: data ?? [] });
  });

  return router;
}
