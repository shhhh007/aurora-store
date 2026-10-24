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

  /* Валюта магазина: '$', '€', '₽' — поменяйте на свою */
  currency: '$',

  products: [],
  demo: false,
  loaded: false,

  byId(id) {
    return this.products.find((p) => p.id === id) || null;
  },

  fmt(n) {
    return this.currency + new Intl.NumberFormat('en-US').format(n);
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
    name: 'Polar Oversized Hoodie',
    category: 'hoodies',
    price: 59, oldPrice: null, badge: 'new', rating: 4.9, reviews: 41,
    colors: ['#a78bfa', '#67e8f9', '#f3f3f8'], sizes: ['S', 'M', 'L', 'XL'],
    desc: 'Heavyweight 320 gsm brushed fleece, double-layer hood, embroidered logo. Holds its shape wash after wash.',
  },
  {
    id: 'demo-tee-black-ice',
    name: 'Black Ice Tee',
    category: 'tops',
    price: 29, oldPrice: null, badge: 'hit', rating: 5.0, reviews: 63,
    colors: ['#1e293b', '#f3f3f8', '#f0abfc'], sizes: ['S', 'M', 'L', 'XL'],
    desc: '240 gsm combed cotton with a gradient print that never cracks or fades. Boxy, slightly long silhouette.',
  },
  {
    id: 'demo-zip-aurora',
    name: 'Aurora Zip Hoodie',
    category: 'hoodies',
    price: 64, oldPrice: null, badge: null, rating: 4.8, reviews: 27,
    colors: ['#67e8f9', '#f3f3f8', '#334155'], sizes: ['S', 'M', 'L', 'XL'],
    desc: 'Two-way YKK zipper, stand-up collar, soft brushed inside. Your everyday layer for cold city nights.',
  },
  {
    id: 'demo-cargo-mist',
    name: 'Mist Cargo Pants',
    category: 'bottoms',
    price: 69, oldPrice: null, badge: 'new', rating: 4.9, reviews: 22,
    colors: ['#64748b', '#1e293b', '#6ee7b7'], sizes: ['S', 'M', 'L', 'XL'],
    desc: 'Wide-leg ripstop cargos with six roomy pockets, ankle cinches and an elastic waistband.',
  },
  {
    id: 'demo-beanie-polar',
    name: 'Polar Beanie',
    category: 'acc',
    price: 14, oldPrice: null, badge: null, rating: 4.9, reviews: 38,
    colors: ['#1e293b', '#f0abfc', '#f3f3f8'], sizes: ['OS'],
    desc: 'Double-layer acrylic knit with a fold-over cuff. No itch, no stretch-out, warm down to -20°C.',
  },
  {
    id: 'demo-tote-ark',
    name: 'Ark Tote Bag',
    category: 'acc',
    price: 19, oldPrice: 24, badge: 'sale', rating: 4.8, reviews: 45,
    colors: ['#f3f3f8', '#1e293b', '#67e8f9'], sizes: ['OS'],
    desc: '340 gsm cotton canvas shopper with long handles and an inner pocket. Carries up to 12 kg.',
  },
];
