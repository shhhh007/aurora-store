/* ============================================================
   AURORA — core: cart, favorites, modals, UI (storefront)
   Products come from AuroraStore (Cloudflare KV via /api/products)
   ============================================================ */

'use strict';

/* ---------- Store settings (edit to yours) ---------- */

const AURORA_CONFIG = {
  telegram: 'aurora_store',     // your Telegram handle without @
  whatsapp: '79000000000',      // WhatsApp number, digits only
  email: 'hello@aurora-store.com',
  freeShippingFrom: 70,         // free shipping threshold, in store currency
  promoCodes: { AURORA10: 10 }, // promo code -> percent off
};

/* ---------- Utilities ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const fmt = (n) => AuroraStore.fmt(n);
const byId = (id) => AuroraStore.byId(id);
const catLabel = (key) => AuroraStore.categories[key] || key;

async function ensureStore() {
  if (!AuroraStore.loaded) await AuroraStore.load();
}

const badgeLabel = { new: 'New', hit: 'Hot', sale: 'Sale' };

const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

/* ---------- Cart ---------- */

const CART_KEY = 'aurora_cart_v1';
const PROMO_KEY = 'aurora_promo_v1';
const FAVS_KEY = 'aurora_favs_v1';

let cart = load(CART_KEY, []);
let promoCode = load(PROMO_KEY, null);
let favs = load(FAVS_KEY, []);

const saveCart = () => save(CART_KEY, cart);
const cartCount = () => cart.reduce((s, i) => s + i.qty, 0);
const cartSubtotal = () => cart.reduce((s, i) => {
  const p = byId(i.id);
  return p ? s + p.price * i.qty : s;
}, 0);

function promoDiscount(sub) {
  const pct = promoCode && AURORA_CONFIG.promoCodes[promoCode];
  return pct ? Math.round((sub * pct) / 100) : 0;
}

function addToCart(id, size, qty = 1) {
  const line = cart.find((i) => i.id === id && i.size === size);
  if (line) line.qty = Math.min(line.qty + qty, 99);
  else cart.push({ id, size, qty });
  saveCart();
  renderCart();
  updateCartBadge();
}

function removeLine(id, size) {
  cart = cart.filter((i) => !(i.id === id && i.size === size));
  saveCart();
  renderCart();
  updateCartBadge();
}

function changeQty(id, size, delta) {
  const line = cart.find((i) => i.id === id && i.size === size);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) removeLine(id, size);
  else { saveCart(); renderCart(); updateCartBadge(); }
}

/* ---------- Favorites ---------- */

function toggleFav(id) {
  const i = favs.indexOf(id);
  if (i >= 0) favs.splice(i, 1); else favs.push(id);
  save(FAVS_KEY, favs);
  $$('.fav-btn').forEach((b) => b.classList.toggle('active', b.dataset.id === id));
  document.dispatchEvent(new CustomEvent('aurora:favs'));
}

/* ---------- Toast ---------- */

function toast(msg) {
  let wrap = $('[data-toasts]');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    wrap.setAttribute('data-toasts', '');
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="t-ico">${ICON.check}</span>${msg}`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ---------- Icons ---------- */

const ICON = {
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  heart: '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
};

/* ---------- Product media: real photo or clean placeholder ---------- */

function phClass(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 997;
  return 'ph-' + (h % 4);
}

function productMediaHTML(p, lazy = true) {
  return p.image
    ? `<img src="${p.image}" alt="${p.name}" ${lazy ? 'loading="lazy"' : ''}>`
    : `<div class="ph ${phClass(p.id)}"><span>${(p.name || '?').trim().charAt(0).toUpperCase()}</span></div>`;
}

/* ---------- Product card (home + catalog) ---------- */

function productCardHTML(p, delay = 0) {
  const fav = favs.includes(p.id);
  const old = p.oldPrice ? `<s>${fmt(p.oldPrice)}</s>` : '';
  const badge = p.badge ? `<span class="badge badge-${p.badge}">${badgeLabel[p.badge] || p.badge}</span>` : '';
  const colors = (p.colors || []).map((c) => `<i style="background:${c}"></i>`).join('');
  const rating = p.reviews ? `<span class="results-count">★ ${p.rating} · ${p.reviews} reviews</span>` : '';
  return `
  <article class="product-card reveal" style="--d:${delay}s" data-tilt>
    <div class="product-media">
      ${productMediaHTML(p)}
      <div class="product-badges">${badge}</div>
      <button class="fav-btn ${fav ? 'active' : ''}" data-fav="${p.id}" aria-label="Add to favorites">${ICON.heart}</button>
    </div>
    <div class="product-body">
      <span class="product-cat">${catLabel(p.category)}</span>
      <h3 class="product-name">${p.name}</h3>
      <div class="product-row">
        <div class="price"><b>${fmt(p.price)}</b>${old}</div>
        <div class="product-colors">${colors}</div>
      </div>
      <div class="product-row">
        ${rating || '<span></span>'}
        <button class="add-btn" data-add="${p.id}" aria-label="Add to cart">${ICON.plus}</button>
      </div>
    </div>
  </article>`;
}

/* ---------- Quick add: pick a size, then into the cart ---------- */

function quickAdd(id) {
  const p = byId(id);
  if (!p) return;
  if ((p.sizes || []).length <= 1) {
    addToCart(p.id, (p.sizes || ['OS'])[0]);
    toast(`“${p.name}” added to cart`);
    openCart();
    return;
  }
  openModal(`
    <button class="modal-close" data-modal-close aria-label="Close">${ICON.x}</button>
    <h3>Select a size</h3>
    <p class="modal-sub">${p.name}</p>
    <div class="qv-product">
      ${productMediaHTML(p)}
      <div>
        <div class="price" style="margin-bottom:6px"><b>${fmt(p.price)}</b></div>
        <p style="color:var(--muted);font-size:0.85rem">${(p.desc || '').split('.')[0]}.</p>
      </div>
    </div>
    <div class="size-picker">
      ${p.sizes.map((s, i) => `<button class="size-btn ${i === Math.floor(p.sizes.length / 2) ? 'active' : ''}" data-size="${s}">${s}</button>`).join('')}
    </div>
    <button class="btn btn-grad" style="width:100%" data-qv-add="${p.id}">Add to cart — <span data-qv-price>${fmt(p.price)}</span></button>
  `);
  const modal = $('[data-modal]');
  modal.addEventListener('click', (e) => {
    const sizeBtn = e.target.closest('.size-btn');
    if (sizeBtn) {
      $$('.size-btn', modal).forEach((b) => b.classList.remove('active'));
      sizeBtn.classList.add('active');
    }
  });
}

/* ---------- Modals ---------- */

function openModal(html) {
  let overlay = $('[data-modal-overlay]');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('data-modal-overlay', '');
    overlay.innerHTML = '<div class="modal" data-modal></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('[data-modal-close]')) closeModal();
    });
  }
  $('[data-modal]', overlay).innerHTML = html;
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = $('[data-modal-overlay]');
  if (overlay) overlay.classList.remove('show');
  if (!$('.cart-drawer.open')) document.body.style.overflow = '';
}

/* ---------- Cart drawer ---------- */

function ensureDrawer() {
  if ($('[data-cart-drawer]')) return;
  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  overlay.setAttribute('data-cart-overlay', '');
  overlay.addEventListener('click', closeCart);

  const drawer = document.createElement('aside');
  drawer.className = 'cart-drawer';
  drawer.setAttribute('data-cart-drawer', '');
  drawer.innerHTML = `
    <div class="cart-head">
      <h3>Cart <span data-cart-total-count>0</span></h3>
      <button class="drawer-close" data-cart-close aria-label="Close">${ICON.x}</button>
    </div>
    <div class="cart-items" data-cart-items></div>
    <div class="shipping-bar" data-shipping hidden></div>
    <div class="cart-foot" data-cart-foot hidden>
      <div class="promo-row">
        <input type="text" placeholder="Promo code" data-promo-input aria-label="Promo code">
        <button class="btn btn-ghost btn-sm" data-promo-apply>Apply</button>
      </div>
      <div class="cart-discount" data-discount-row hidden><span data-promo-label></span><span data-discount-val></span></div>
      <div class="cart-total">
        <span>Total</span>
        <b data-cart-total>0</b>
      </div>
      <button class="btn btn-grad" style="width:100%" data-checkout>Checkout</button>
    </div>`;
  document.body.append(overlay, drawer);

  drawer.addEventListener('click', (e) => {
    if (e.target.closest('[data-cart-close]')) closeCart();
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    const rem = e.target.closest('[data-remove]');
    if (inc) changeQty(inc.dataset.inc, inc.dataset.size, 1);
    if (dec) changeQty(dec.dataset.dec, dec.dataset.size, -1);
    if (rem) { removeLine(rem.dataset.remove, rem.dataset.size); toast('Removed from cart'); }
    if (e.target.closest('[data-checkout]')) openCheckout();
    if (e.target.closest('[data-promo-apply]')) {
      const input = $('[data-promo-input]', drawer);
      const code = input.value.trim().toUpperCase();
      if (AURORA_CONFIG.promoCodes[code]) {
        promoCode = code;
        save(PROMO_KEY, code);
        renderCart();
        toast(`Promo ${code} applied`);
      } else {
        toast('Unknown promo code');
        input.value = '';
      }
    }
  });
}

function renderCart() {
  ensureDrawer();
  const wrap = $('[data-cart-items]');
  const foot = $('[data-cart-foot]');
  const ship = $('[data-shipping]');
  const count = cartCount();
  $('[data-cart-total-count]').textContent = count;

  if (!count) {
    wrap.innerHTML = `
      <div class="cart-empty">
        <div class="big">🌌</div>
        <b>Your cart is empty</b>
        <span>Add something from the catalog — it glows, we promise.</span>
        <a href="catalog.html" class="btn btn-ghost btn-sm" style="margin-top:10px" data-cart-close-link>Browse catalog</a>
      </div>`;
    foot.hidden = true;
    ship.hidden = true;
    return;
  }

  wrap.innerHTML = cart.map((i) => {
    const p = byId(i.id);
    if (!p) return '';
    return `
    <div class="cart-item">
      <div class="cart-item-thumb">${productMediaHTML(p)}</div>
      <div class="cart-item-info">
        <b>${p.name}</b>
        <span>Size: ${i.size}</span>
        <div class="cart-item-qty">
          <button class="qty-btn" data-dec="${p.id}" data-size="${i.size}" aria-label="Less">−</button>
          <span class="qty-val">${i.qty}</span>
          <button class="qty-btn" data-inc="${p.id}" data-size="${i.size}" aria-label="More">+</button>
        </div>
      </div>
      <div class="cart-item-side">
        <button class="remove-btn" data-remove="${p.id}" data-size="${i.size}" aria-label="Remove">${ICON.trash}</button>
        <b>${fmt(p.price * i.qty)}</b>
      </div>
    </div>`;
  }).join('');

  const sub = cartSubtotal();
  const disc = promoDiscount(sub);
  const total = sub - disc;

  foot.hidden = false;
  $('[data-cart-total]').innerHTML =
    (disc ? `<s>${fmt(sub)}</s>` : '') + fmt(total);
  $('[data-cart-total]').dataset.total = total;

  const dRow = $('[data-discount-row]');
  if (disc) {
    dRow.hidden = false;
    $('[data-promo-label]').textContent = `Promo ${promoCode}`;
    $('[data-discount-val]').textContent = `−${fmt(disc)}`;
  } else {
    dRow.hidden = true;
  }

  const left = AURORA_CONFIG.freeShippingFrom - sub;
  ship.hidden = false;
  const pct = Math.min(100, (sub / AURORA_CONFIG.freeShippingFrom) * 100);
  ship.innerHTML = left > 0
    ? `<b>${fmt(left)}</b> away from free shipping
       <div class="shipping-track"><div class="shipping-fill" style="width:${pct}%"></div></div>`
    : `<b>🚚 Free shipping</b> — unlocked
       <div class="shipping-track"><div class="shipping-fill" style="width:100%"></div></div>`;
}

function openCart() {
  ensureDrawer();
  ensureStore().then(renderCart);
  $('[data-cart-drawer]').classList.add('open');
  $('[data-cart-overlay]').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  const d = $('[data-cart-drawer]');
  if (!d) return;
  d.classList.remove('open');
  $('[data-cart-overlay]').classList.remove('show');
  if (!$('.modal-overlay.show')) document.body.style.overflow = '';
}

/* ---------- Checkout ---------- */

function openCheckout() {
  if (!cartCount()) return;
  const sub = cartSubtotal();
  const disc = promoDiscount(sub);
  const total = sub - disc;
  const list = cart.map((i) => {
    const p = byId(i.id);
    return `<div>${p.name} — ${i.size} × ${i.qty} — ${fmt(p.price * i.qty)}</div>`;
  }).join('');

  openModal(`
    <button class="modal-close" data-modal-close aria-label="Close">${ICON.x}</button>
    <h3>Checkout</h3>
    <p class="modal-sub">Pay on delivery or by link — we'll message you within the hour.</p>
    <div class="checkout-summary">${list}
      <div style="margin-top:8px"><b style="color:var(--text)">Total: ${fmt(total)}</b>${disc ? ` <span style="color:var(--mint)">(−${fmt(disc)} off)</span>` : ''}</div>
    </div>
    <form class="form-grid" data-checkout-form style="margin-top:18px">
      <div class="form-field">
        <label for="co-name">Name</label>
        <input id="co-name" name="name" type="text" placeholder="How should we call you?" required>
      </div>
      <div class="form-field">
        <label for="co-contact">Phone or Telegram</label>
        <input id="co-contact" name="contact" type="text" placeholder="@nickname or +1 555 000-0000" required>
      </div>
      <div class="form-field">
        <label for="co-delivery">Delivery</label>
        <select id="co-delivery" name="delivery">
          <option>Standard courier</option>
          <option>Post</option>
          <option>Express</option>
          <option>Local pickup</option>
        </select>
      </div>
      <div class="form-field">
        <label for="co-note">Note</label>
        <textarea id="co-note" name="note" placeholder="City, address, comments…"></textarea>
      </div>
      <div class="checkout-actions">
        <button type="submit" class="btn btn-grad" style="width:100%">Send order via WhatsApp</button>
        <button type="button" class="btn btn-ghost" style="width:100%" data-send-tg>Message us on Telegram</button>
        <button type="button" class="btn btn-ghost btn-sm" style="width:100%" data-copy-order>Copy order details</button>
        <div class="copy-ok" data-copy-status></div>
      </div>
    </form>
  `);

  const form = $('[data-checkout-form]');
  const orderText = (data) => {
    const lines = cart.map((i, n) => {
      const p = byId(i.id);
      return `${n + 1}) ${p.name} — ${i.size} × ${i.qty} — ${fmt(p.price * i.qty)}`;
    });
    return [
      '🌌 AURORA order', '',
      ...lines, '',
      `Delivery: ${data.delivery}`,
      `Total: ${fmt(total)}`,
      disc ? `Promo: ${promoCode} (−${fmt(disc)})` : '',
      '', `Name: ${data.name}`, `Contact: ${data.contact}`,
      data.note ? `Note: ${data.note}` : '',
    ].filter(Boolean).join('\n');
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    window.open(`https://wa.me/${AURORA_CONFIG.whatsapp}?text=${encodeURIComponent(orderText(data))}`, '_blank');
  });

  $('[data-send-tg]').addEventListener('click', () => {
    if (!form.reportValidity()) return;
    window.open(`https://t.me/${AURORA_CONFIG.telegram}`, '_blank');
  });

  $('[data-copy-order]').addEventListener('click', async () => {
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    const text = orderText(data);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    $('[data-copy-status]').textContent = 'Order details copied ✓';
  });
}

/* ---------- Header ---------- */

function initHeader() {
  const header = $('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', scrollY > 12);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  const burger = $('[data-burger]');
  const menu = $('[data-mobile-menu]');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('a', menu).forEach((a) => a.addEventListener('click', () => {
      menu.classList.remove('open');
      document.body.style.overflow = '';
    }));
  }
}

/* ---------- Scroll reveal ---------- */

function initReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal:not(.in)').forEach((el) => io.observe(el));
}

/* ---------- 3D tilt on cards ---------- */

function initTilt() {
  if (!matchMedia('(hover:hover)').matches) return;
  document.addEventListener('mousemove', (e) => {
    const card = e.target.closest('[data-tilt]');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(800px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-4px)`;
  });
  document.addEventListener('mouseout', (e) => {
    const card = e.target.closest('[data-tilt]');
    if (card && !card.contains(e.relatedTarget)) card.style.transform = '';
  });
}

/* ---------- Cursor spotlight in hero ---------- */

function initSpotlight() {
  const hero = $('.hero');
  if (!hero || !matchMedia('(hover:hover)').matches) return;
  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', `${e.clientX - r.left}px`);
    hero.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}

/* ---------- Global events ---------- */

function initGlobalEvents() {
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) { ensureStore().then(() => quickAdd(add.dataset.add)); return; }

    const fav = e.target.closest('[data-fav]');
    if (fav) {
      toggleFav(fav.dataset.fav);
      if (!favs.includes(fav.dataset.fav)) toast('Removed from favorites');
      else toast('Added to favorites ♥');
      return;
    }

    const qvAdd = e.target.closest('[data-qv-add]');
    if (qvAdd) {
      const size = $('.size-btn.active', $('[data-modal]'));
      addToCart(qvAdd.dataset.qvAdd, size ? size.dataset.size : 'OS');
      closeModal();
      toast('Added to cart');
      openCart();
      return;
    }

    if (e.target.closest('[data-cart-open]')) { e.preventDefault(); openCart(); }
    if (e.target.closest('[data-cart-close-link]')) closeCart();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeCart(); closeModal(); }
  });

  addEventListener('storage', (e) => {
    if (e.key === CART_KEY) {
      cart = load(CART_KEY, []);
      renderCart();
      updateCartBadge();
    }
  });
}

function updateCartBadge() {
  $$('.cart-count').forEach((el) => {
    const n = cartCount();
    el.textContent = n;
    el.classList.toggle('show', n > 0);
  });
}

/* ---------- Boot ---------- */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initReveal();
  initTilt();
  initSpotlight();
  initGlobalEvents();
  updateCartBadge();
  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
  ensureStore(); // прогреваем каталог товаров
});
