/* ============================================================
   AURORA — страница товара: галерея, выбор цвета и размера
   ============================================================ */

'use strict';

const productRoot = $('#product-root');
const productId = new URLSearchParams(location.search).get('id');

let sel = { color: null, size: null, img: null };

function currentImages(p) {
  const colors = colorsOf(p);
  /* Выбран цвет — показываем его фото (или главное, если у цвета нет своих) */
  if (sel.color) {
    const c = colors.find((x) => x.name === sel.color);
    if (c && c.images.length) return c.images;
    return p.image ? [p.image] : [];
  }
  /* Без выбранного цвета — только главное фото товара (одна фотка) */
  return p.image ? [p.image] : [];
}

function thumbHTML(p) {
  const c = colorsOf(p).find((x) => x.name === sel.color);
  const hex = c ? c.hex : null;
  return hex
    ? `<div class="ph ${phClass(p.id)}"><span style="background:none; color:${hex}; -webkit-text-fill-color:${hex}">${(p.name || '?').charAt(0).toUpperCase()}</span></div>`
    : `<div class="ph ${phClass(p.id)}"><span>${(p.name || '?').charAt(0).toUpperCase()}</span></div>`;
}

function galleryHTML(p) {
  const imgs = currentImages(p);
  if (!sel.img) sel.img = imgs[0] || null;
  const main = sel.img
    ? `<img src="${sel.img}" alt="${p.name}" width="900" height="1125">`
    : thumbHTML(p);
  const thumbs = imgs.length
    ? imgs.map((u) => `
        <button class="thumb ${u === sel.img ? 'active' : ''}" data-thumb="${u}" aria-label="Photo">
          <img src="${u}" alt="" loading="lazy">
        </button>`).join('')
    : '';
  return `
    <div class="gallery-main" data-gmain>${main}</div>
    ${thumbs ? `<div class="thumbs" data-gthumbs>${thumbs}</div>` : ''}`;
}

function colorsHTML(p) {
  const colors = colorsOf(p);
  if (!colors.length) return '';
  return `
    <label class="qv-label">Color${sel.color ? ` — <span data-color-name style="color:var(--text)">${sel.color}</span>` : ' — <span data-color-name style="color:var(--text)">Main</span>'}</label>
    <div class="swatches" data-colors>
      <button class="swatch ${!sel.color ? 'active' : ''}" data-color="" title="Main product photo">
        <i class="swatch-all"></i>Main
      </button>
      ${colors.map((c) => `
        <button class="swatch ${c.name === sel.color ? 'active' : ''}" data-color="${c.name}">
          ${c.hex ? `<i style="--c:${c.hex}"></i>` : ''}${c.name}
        </button>`).join('')}
    </div>`;
}

function sizesHTML(p) {
  const sizes = p.sizes || ['OS'];
  if (!sel.size) sel.size = sizes[Math.floor(sizes.length / 2)];
  return `
    <label class="qv-label">Size</label>
    <div class="size-picker">
      ${sizes.map((s) => `<button class="size-btn ${s === sel.size ? 'active' : ''}" data-size="${s}">${s}</button>`).join('')}
    </div>`;
}

function renderProduct() {
  const p = byId(productId);
  if (!p) {
    productRoot.innerHTML = `
      <div class="empty-state">
        <div class="big">🔭</div>
        <b>Product not found</b>
        <span>It may have been removed — the catalog still has plenty.</span>
        <a class="btn btn-ghost btn-sm" href="catalog.html" style="margin-top:14px">To the catalog</a>
      </div>`;
    return;
  }

  document.title = `${p.name} — AURORA`;
  /* Изначально цвет не выбран: галерея показывает главное фото товара */
  if (sel.color === undefined) sel.color = null;
  if (sel.color && !colorsOf(p).some((c) => c.name === sel.color)) sel.color = null;

  const badge = p.badge ? `<span class="badge badge-${p.badge}">${badgeLabel[p.badge] || p.badge}</span>` : '';
  const rating = p.reviews
    ? `<div class="results-count" style="margin-top:8px">★ ${p.rating} · ${p.reviews} reviews</div>`
    : '';

  productRoot.innerHTML = `
    <div class="product-view">
      <div class="gallery" data-gallery>${galleryHTML(p)}</div>
      <div class="product-info">
        <div class="product-badges" style="position:static; margin-bottom:14px; display:flex">${badge}</div>
        <span class="product-cat">${catLabel(p.category)}</span>
        <h1 class="h-md" style="margin:10px 0 4px">${p.name}</h1>
        ${rating}
        <div class="price" style="margin:18px 0 20px"><b style="font-size:1.6rem">${fmt(p.price)}</b></div>
        <p style="color:var(--muted); margin-bottom:26px">${p.desc || ''}</p>
        ${colorsHTML(p)}
        ${sizesHTML(p)}        <button class="btn btn-grad" style="width:100%; margin-top:26px" data-add-full="${p.id}">Add to cart — ${fmt(p.price)}</button>
        <div style="margin-top:18px; color:var(--muted-2); font-size:.85rem; display:grid; gap:6px">
          <span>✓ Quality checked before shipping</span>
          <span>🚚 Average delivery ~2 weeks · Free shipping over ${fmt(AURORA_CONFIG.freeShippingFrom)}</span>
          <span>↩ 14-day returns, no questions asked</span>
        </div>
      </div>
    </div>`;

  bindProductEvents(p);
}

function bindProductEvents(p) {
  productRoot.addEventListener('click', (e) => {
    /* Цвет */
    const sw = e.target.closest('[data-color]');
    if (sw) {
      sel.color = sw.dataset.color;
      sel.img = null;
      $('[data-color-name]', productRoot).textContent = sel.color;
      $$('[data-color]', productRoot).forEach((b) => b.classList.toggle('active', b.dataset.color === sel.color));
      $('[data-gallery]', productRoot).innerHTML = galleryHTML(p);
      return;
    }
    /* Размер */
    const sb = e.target.closest('.size-btn');
    if (sb) {
      sel.size = sb.dataset.size;
      $$('.size-btn', productRoot).forEach((b) => b.classList.remove('active'));
      sb.classList.add('active');
      return;
    }
    /* Миниатюра галереи */
    const th = e.target.closest('[data-thumb]');
    if (th) {
      sel.img = th.dataset.thumb;
      $('[data-gallery]', productRoot).innerHTML = galleryHTML(p);
      return;
    }
    /* В корзину */
    if (e.target.closest('[data-add-full]')) {
      addToCart(p.id, sel.size || 'OS', 1, sel.color);
      toast('Added to cart');
      openCart();
    }
  });
}

AuroraStore.load().then(renderProduct);
