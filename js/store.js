/* ============================================================
   AURORA — store: загружает товары с /api/products (Cloudflare KV).
   Если API ещё не настроен — включает демо-режим с образцами.
   Реальные товары вы загружаете через /admin
   ============================================================ */

'use strict';

window.AuroraStore = {
  categories: {
    tops: 'Tops & Tees',
    hoodies: 'Hoodies & Sweats',
    bottoms: 'Bottoms',
    acc: 'Accessories',
  },

  /* Валюта магазина: продажи в Германии — евро */
  currency: '€',

  products: [],
  demo: false,
  loaded: false,

  byId(id) {
    return this.products.find((p) => p.id === id) || null;
  },

  fmt(n) {
    return new Intl.NumberFormat('de-DE').format(n) + ' ' + this.currency;
  },

  async load() {
    if (this.loaded) return this.products;
    try {
      const res = await fetch('/api/products', {
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.products)) {
        this.products = data.products;
      } else {
        throw new Error(data.error || 'store not configured');
      }
    } catch {
      this.demo = true;
      this.products = DEMO_PRODUCTS.map((p) => ({ ...p }));
    }
    this.loaded = true;
    document.dispatchEvent(new CustomEvent('aurora:store'));
    return this.products;
  },
};

/* Показываются, только пока админка не настроена и API не отвечает */
const DEMO_PRODUCTS = [
  {
    id: 'demo-hoodie-polar',
    name: 'Oversized Hoodie — Black',
    category: 'hoodies',
    price: 59, oldPrice: null, badge: 'new', rating: 4.9, reviews: 41,
    colors: ['#a78bfa', '#67e8f9', '#f3f3f8'], sizes: ['S', 'M', 'L', 'XL'],
    desc: 'Heavyweight brushed fleece, double-layer hood. Quality checked before shipping.',
  },
  {
    id: 'demo-tee-black-ice',
    name: 'Graphic Tee — White',
    category: 'tops',
    price: 29, oldPrice: null, badge: 'hit', rating: 5.0, reviews: 63,
    colors: ['#1e293b', '#f3f3f8', '#f0abfc'], sizes: ['S', 'M', 'L', 'XL'],
    desc: '240 gsm combed cotton with a crisp print that never cracks or fades.',
  },
  {
    id: 'demo-zip-aurora',
    name: 'Zip Hoodie — Navy',
    category: 'hoodies',
    price: 64, oldPrice: null, badge: null, rating: 4.8, reviews: 27,
    colors: ['#67e8f9', '#f3f3f8', '#334155'], sizes: ['S', 'M', 'L', 'XL'],
    desc: 'Two-way zipper, stand-up collar, soft brushed inside. Your everyday layer.',
  },
  {
    id: 'demo-cargo-mist',
    name: 'Cargo Pants — Grey',
    category: 'bottoms',
    price: 69, oldPrice: null, badge: 'new', rating: 4.9, reviews: 22,
    colors: ['#64748b', '#1e293b', '#6ee7b7'], sizes: ['S', 'M', 'L', 'XL'],
    desc: 'Wide-leg ripstop cargos with six roomy pockets and an elastic waistband.',
  },
  {
    id: 'demo-beanie-polar',
    name: 'Knit Beanie — Black',
    category: 'acc',
    price: 14, oldPrice: null, badge: null, rating: 4.9, reviews: 38,
    colors: ['#1e293b', '#f0abfc', '#f3f3f8'], sizes: ['OS'],
    desc: 'Double-layer knit with a fold-over cuff. No itch, no stretch-out.',
  },
  {
    id: 'demo-tote-ark',
    name: 'Canvas Tote Bag',
    category: 'acc',
    price: 19, oldPrice: null, badge: null, rating: 4.8, reviews: 45,
    colors: ['#f3f3f8', '#1e293b', '#67e8f9'], sizes: ['OS'],
    desc: '340 gsm cotton canvas shopper with long handles and an inner pocket.',
  },
];
