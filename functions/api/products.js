/* ============================================================
   AURORA API — товары: GET (публично) / PUT (только админ)
   Товары целиком лежат в KV под ключом "products".
   ============================================================ */

import { json, isAuthed } from './_lib.js';

const MAX_PRODUCTS = 500;

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

function normColor(c) {
  if (typeof c === 'string') {
    return HEX_RE.test(c) ? { name: c, hex: c, images: [] } : null;
  }
  if (!c || typeof c !== 'object') return null;
  const hex = HEX_RE.test(String(c.hex || '')) ? String(c.hex) : '#9b9bb0';
  const images = (Array.isArray(c.images) ? c.images : [])
    .map((u) => String(u || '').slice(0, 300))
    .filter(Boolean)
    .slice(0, 6);
  return {
    name: String(c.name || hex).trim().slice(0, 24) || hex,
    hex,
    images,
  };
}

function sanitize(p) {
  if (!p || typeof p !== 'object') return null;
  const name = String(p.name || '').trim().slice(0, 120);
  if (!name) return null;
  const badge = ['new', 'hit', 'sale'].includes(p.badge) ? p.badge : null;
  const sizes = Array.isArray(p.sizes)
    ? p.sizes.map((s) => String(s).trim().slice(0, 8)).filter(Boolean).slice(0, 12)
    : [];
  const colors = (Array.isArray(p.colors) ? p.colors : [])
    .map(normColor)
    .filter(Boolean)
    .slice(0, 8);
  return {
    id: String(p.id || `p_${crypto.randomUUID().slice(0, 8)}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || `p_${crypto.randomUUID().slice(0, 8)}`,
    name,
    price: Math.max(0, Math.round(Number(p.price) || 0)),
    oldPrice: p.oldPrice ? Math.max(0, Math.round(Number(p.oldPrice) || 0)) : null,
    badge,
    category: String(p.category || 'acc').slice(0, 20),
    rating: Math.min(5, Math.max(0, Number(p.rating) || 0)),
    reviews: Math.max(0, Math.round(Number(p.reviews) || 0)),
    image: String(p.image || '').slice(0, 300),
    desc: String(p.desc || '').slice(0, 1200),
    sizes,
    colors,
  };
}

export async function onRequestGet({ env }) {
  if (!env.PRODUCTS) {
    return json({ ok: false, error: 'KV binding PRODUCTS is not configured', products: [] }, 503);
  }
  try {
    const raw = await env.PRODUCTS.get('products');
    const products = raw ? JSON.parse(raw) : [];
    return json({ ok: true, products });
  } catch {
    return json({ ok: false, error: 'Failed to read products', products: [] }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  if (!env.PRODUCTS) {
    return json({ ok: false, error: 'KV binding PRODUCTS is not configured' }, 503);
  }
  if (!(await isAuthed(request, env))) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }
  try {
    const body = await request.json();
    if (!Array.isArray(body.products)) {
      return json({ ok: false, error: 'Body must be { products: [...] }' }, 400);
    }
    if (body.products.length > MAX_PRODUCTS) {
      return json({ ok: false, error: `Max ${MAX_PRODUCTS} products` }, 400);
    }
    const products = body.products.map(sanitize).filter(Boolean);
    await env.PRODUCTS.put('products', JSON.stringify(products));
    return json({ ok: true, products });
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }
}
