/* ============================================================
   AURORA — админ-панель: вход, CRUD товаров, загрузка фото
   ============================================================ */

'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const fmt = (n) => AuroraStore.fmt(n);

const state = {
  authed: false,
  caps: { kv: false, r2: false, password: false },
  products: [],
};

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: opts.body && !(opts.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : undefined,
    ...opts,
    body: opts.body && !(opts.body instanceof FormData)
      ? JSON.stringify(opts.body)
      : opts.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* ---------- Toast ---------- */

function toast(msg, isErr = false) {
  const wrap = document.createElement('div');
  wrap.className = 'toast-wrap';
  wrap.style.position = 'fixed';
  wrap.innerHTML = `
    <div class="toast" ${isErr ? 'style="border-color:rgba(251,113,133,.5)"' : ''}>
      <span class="t-ico">${isErr ? '⚠️' : '✓'}</span>${msg}
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 3400);
}

/* ---------- Иконки ---------- */

const ICONS = {
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
  edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>',
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
};

function phClass(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 997;
  return 'ph-' + (h % 4);
}

/* Цвет: объект {name, hex, images[]} (старый формат — строка-hex). hex опционален */
function normColor(c) {
  if (typeof c === 'string') return { name: c, hex: c, images: [] };
  return {
    name: (c && c.name) || '',
    hex: (c && c.hex) || '',
    images: (c && Array.isArray(c.images)) ? c.images : [],
  };
}

function thumbHTML(p) {
  return p.image
    ? `<img src="${p.image}" alt="">`
    : `<div class="ph ${phClass(p.id)}"><span>${(p.name || '?').charAt(0).toUpperCase()}</span></div>`;
}

/* ============================================================
   Вью 1: вход / настройка
   ============================================================ */

function setupNote() {
  const { caps: c } = state;
  const missing = [];
  if (!c.kv) missing.push('KV namespace bound as <code>PRODUCTS</code>');
  if (!c.media) missing.push('photo storage: R2 bucket bound as <code>MEDIA</code> (or KV <code>MEDIA_KV</code>)');
  if (!c.password) missing.push('environment variables <code>ADMIN_PASSWORD</code> and <code>SESSION_SECRET</code>');
  if (!missing.length) return '';
  return `
    <div class="admin-note">
      <b>Not configured yet.</b> Do these steps in the Cloudflare dashboard once (details in README.md):
      <ol class="setup-steps"><li>${missing.join('</li><li>')}</li></ol>
    </div>`;
}

function renderLogin() {
  $('#admin-root').innerHTML = `
    <div class="admin-card admin-login">
      ${setupNote()}
      <h1 style="font-size:1.5rem; margin-bottom:8px">Admin sign in</h1>
      <p style="color:var(--muted); margin-bottom:24px; font-size:.94rem">Manage products, upload photos and publish to the storefront.</p>
      <form class="form-grid" data-login-form>
        <div class="form-field">
          <label for="pw">Admin password</label>
          <input id="pw" name="password" type="password" placeholder="••••••••" required autofocus>
        </div>
        <button type="submit" class="btn btn-grad" style="width:100%">Sign in</button>
        <p data-login-error style="color:#fb7185; font-size:.86rem; text-align:center; min-height:1.2em"></p>
      </form>
    </div>`;

  $('[data-login-form]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', e.target);
    btn.disabled = true;
    $('[data-login-error]').textContent = '';
    try {
      const password = $('#pw').value;
      await api('/api/login', { method: 'POST', body: { password } });
      await boot();
    } catch (err) {
      $('[data-login-error]').textContent = err.message;
      btn.disabled = false;
    }
  });
}

/* ============================================================
   Вью 2: редактор каталога
   ============================================================ */

function renderEditor() {
  $('#admin-root').innerHTML = `
    <div class="admin-card">
      <div class="admin-head">
        <div>
          <h1>Products</h1>
          <p style="color:var(--muted); font-size:.9rem">${state.products.length} item(s) live on the storefront</p>
        </div>
        <button class="btn btn-grad" data-add-product>${ICONS.plus} Add product</button>
      </div>
      ${state.products.length ? `
      <div style="overflow-x:auto">
        <table class="admin-table">
          <thead><tr>
            <th>Photo</th><th>Name</th><th>Price</th><th>Category</th><th>Badge</th><th></th>
          </tr></thead>
          <tbody>
            ${state.products.map((p, i) => `
              <tr>
                <td><div class="admin-thumb">${thumbHTML(p)}</div></td>
                <td style="font-weight:700">${p.name}</td>
                <td><b>${fmt(p.price)}</b></td>
                <td style="color:var(--muted)">${AuroraStore.categories[p.category] || p.category}</td>
                <td>${p.badge ? `<span class="badge badge-${p.badge}">${p.badge}</span>` : '<span style="color:var(--muted-2)">—</span>'}</td>
                <td>
                  <div class="admin-actions">
                    <button class="icon-btn" style="width:38px;height:38px" data-edit="${i}" aria-label="Edit">${ICONS.edit}</button>
                    <button class="icon-btn" style="width:38px;height:38px" data-delete="${i}" aria-label="Delete">${ICONS.trash}</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `
      <div class="empty-state">
        <div class="big">✨</div>
        <b>No products yet</b>
        <span>Add your first product — it appears on the storefront instantly.</span>
      </div>`}
    </div>`;

  $('[data-add-product]').addEventListener('click', () => openForm(null));
  $$('[data-edit]').forEach((b) => b.addEventListener('click', () => openForm(state.products[Number(b.dataset.edit)])));
  $$('[data-delete]').forEach((b) => b.addEventListener('click', async () => {
    const p = state.products[Number(b.dataset.delete)];
    if (!confirm(`Delete “${p.name}” from the store?`)) return;
    state.products = state.products.filter((x) => x.id !== p.id);
    await saveProducts();
    renderEditor();
  }));
}

async function saveProducts() {
  try {
    const data = await api('/api/products', { method: 'PUT', body: { products: state.products } });
    state.products = data.products;
    toast('Saved & published ✓');
  } catch (err) {
    toast(err.message, true);
  }
}

/* ---------- Форма товара ---------- */

function openForm(product) {
  const p = product
    ? { ...product, colors: (product.colors || []).map(normColor) }
    : {
        id: `p_${Math.random().toString(36).slice(2, 10)}`,
        name: '', price: 0, oldPrice: null, badge: '',
        category: 'tops', rating: 5, reviews: 0,
        image: '', desc: '', sizes: [], colors: [],
      };
  const isNew = !product;

  openModal(`
    <button class="modal-close" data-modal-close aria-label="Close">${ICONS.x}</button>
    <h3>${isNew ? 'New product' : 'Edit product'}</h3>
    <p class="modal-sub">${isNew ? 'It goes live right after you hit Save.' : 'Changes go live right after you hit Save.'}</p>
    <form class="form-grid" data-product-form>
      <div class="form-field full">
        <label>Photo (JPG/PNG/WebP, up to 5 MB)</label>
        <label class="upload-box" data-upload-box>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" data-file-input>
          <div data-upload-preview>${p.image ? `<img src="${p.image}" alt="">` : `<div class="ph ${phClass(p.id)}"><span>?</span></div>`}</div>
          <span data-upload-status>${state.caps.media ? 'Click to upload a photo, or paste an image URL below' : '⚠️ Photo storage not configured — paste an image URL below instead'}</span>
        </label>
      </div>
      <div class="form-field full">
        <label for="f-image">…or image URL</label>
        <input id="f-image" name="image" type="text" value="${p.image || ''}" placeholder="https://… or /img/…">
      </div>
      <div class="form-field" style="grid-column:1/-1">
        <label for="f-name">Name *</label>
        <input id="f-name" name="name" type="text" value="${p.name}" required maxlength="120">
      </div>
      <div class="form-field">
        <label for="f-price">Price *</label>
        <input id="f-price" name="price" type="number" min="0" step="0.01" value="${p.price}" required>
      </div>
      <div class="form-field">
        <label for="f-cat">Category</label>
        <select id="f-cat" name="category">
          ${Object.entries(AuroraStore.categories).map(([k, v]) =>
            `<option value="${k}" ${p.category === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-field">
        <label for="f-badge">Badge</label>
        <select id="f-badge" name="badge">
          <option value="" ${!p.badge ? 'selected' : ''}>None</option>
          <option value="new" ${p.badge === 'new' ? 'selected' : ''}>New</option>
          <option value="hit" ${p.badge === 'hit' ? 'selected' : ''}>Hot</option>
        </select>
      </div>
      <div class="form-field">
        <label for="f-sizes">Sizes (comma-separated)</label>
        <input id="f-sizes" name="sizes" type="text" value="${(p.sizes || []).join(', ')}" placeholder="S, M, L, XL">
      </div>
      <div class="form-field full">
        <label>Color variants (optional — each color shows its own photos on the product page)</label>
        <div class="variants-block" data-variants></div>
        <button type="button" class="btn btn-ghost btn-sm" data-add-variant style="margin-top:10px">+ Add color</button>
      </div>
      <div class="form-field">
        <label for="f-rating">Rating (0–5)</label>
        <input id="f-rating" name="rating" type="number" min="0" max="5" step="0.1" value="${p.rating}">
      </div>
      <div class="form-field">
        <label for="f-reviews">Reviews count</label>
        <input id="f-reviews" name="reviews" type="number" min="0" value="${p.reviews}">
      </div>
      <div class="form-field full">
        <label for="f-desc">Description</label>
        <textarea id="f-desc" name="desc" placeholder="Fabric, fit, details…">${p.desc || ''}</textarea>
      </div>
      <div class="full" style="display:flex; gap:10px">
        <button type="submit" class="btn btn-grad" style="flex:1">Save product</button>
        <button type="button" class="btn btn-ghost" data-cancel>Cancel</button>
      </div>
    </form>
  `);

  const modal = $('[data-modal]');
  modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-cancel]')) closeModal();
  });

  // Загрузка фото
  const fileInput = $('[data-file-input]', modal);
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const status = $('[data-upload-status]', modal);
    status.textContent = 'Uploading…';
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await api('/api/upload', { method: 'POST', body: fd });
      p.image = data.url;
      $('#f-image', modal).value = data.url;
      $('[data-upload-preview]', modal).innerHTML = `<img src="${data.url}" alt="">`;
      status.textContent = 'Uploaded ✓ — don\'t forget to Save';
    } catch (err) {
      status.textContent = `⚠️ ${err.message}`;
    }
  });

  /* ---------- Редактор цветовых вариантов ---------- */

  function renderVariants() {
    const wrap = $('[data-variants]', modal);
    if (!wrap) return;
    wrap.innerHTML = p.colors.map((c, vi) => `
      <div class="variant-row" data-vi="${vi}">
        <div class="variant-head">
          <input class="v-name" type="text" value="${c.name.replace(/"/g, '&quot;')}" placeholder="Color name (Black, Navy, Aquamarin…)" data-v-name>
          <button type="button" class="icon-btn" style="width:38px;height:38px" data-v-del title="Remove this color">${ICONS.trash}</button>
        </div>
        <div class="v-thumbs" data-v-thumbs>
          ${c.images.map((u, ii) => `
            <div class="v-thumb"><img src="${u}" alt=""><button type="button" data-v-img-del="${ii}" title="Remove photo">×</button></div>`).join('')}
          <label class="v-add-img" title="Upload photos for this color" ${state.caps.media ? '' : 'style="display:none"'}>
            +<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple data-v-file>
          </label>
        </div>
        <div class="v-url">
          <input type="text" placeholder="…or paste a photo URL for this color" data-v-url>
          <button type="button" data-v-url-add aria-label="Add photo URL">+</button>
        </div>
      </div>`).join('');
  }

  const variantsBlock = $('[data-variants]', modal);
  variantsBlock.addEventListener('click', async (e) => {
    const row = e.target.closest('.variant-row');
    if (!row) return;
    const vi = Number(row.dataset.vi);
    const c = p.colors[vi];
    if (!c) return;

    if (e.target.closest('[data-v-del]')) {
      p.colors.splice(vi, 1);
      renderVariants();
      return;
    }
    const imgDel = e.target.closest('[data-v-img-del]');
    if (imgDel) {
      c.images.splice(Number(imgDel.dataset.vImgDel), 1);
      renderVariants();
      return;
    }
    const urlAdd = e.target.closest('[data-v-url-add]');
    if (urlAdd) {
      const input = $('[data-v-url]', row);
      const url = input.value.trim();
      if (url && c.images.length < 6) {
        c.images.push(url);
        renderVariants();
      }
      return;
    }
  });

  variantsBlock.addEventListener('input', (e) => {
    const row = e.target.closest('.variant-row');
    if (!row) return;
    const vi = Number(row.dataset.vi);
    const c = p.colors[vi];
    if (!c) return;
    if (e.target.matches('[data-v-name]')) c.name = e.target.value;
    if (e.target.matches('[data-v-hex]')) c.hex = e.target.value;
  });

  variantsBlock.addEventListener('change', async (e) => {
    const row = e.target.closest('.variant-row');
    if (!row || !e.target.matches('[data-v-file]')) return;
    const vi = Number(row.dataset.vi);
    const c = p.colors[vi];
    if (!c) return;
    const files = [...e.target.files].slice(0, 10 - c.images.length);
    if (!files.length) return;
    const status = $('[data-upload-status]', modal);
    let done = 0;
    for (const file of files) {
      status.textContent = `Uploading photo ${++done}/${files.length}…`;
      try {
        const fd = new FormData();
        fd.append('file', file);
        const data = await api('/api/upload', { method: 'POST', body: fd });
        c.images.push(data.url);
      } catch (err) {
        status.textContent = `⚠️ ${err.message}`;
        renderVariants();
        return;
      }
    }
    status.textContent = 'Uploaded ✓ — don\'t forget to Save';
    renderVariants();
  });

  $('[data-add-variant]', modal).addEventListener('click', () => {
    if (p.colors.length >= 20) { toast('Max 20 colors per product', true); return; }
    p.colors.push({ name: '', hex: '#9b9bb0', images: [] });
    renderVariants();
  });

  renderVariants();

  $('[data-product-form]', modal).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const image = String(f.get('image') || '').trim();
    const next = {
      id: p.id,
      name: String(f.get('name') || '').trim(),
      price: Number(f.get('price')) || 0,
      oldPrice: null,
      badge: f.get('badge') || null,
      category: f.get('category'),
      rating: Number(f.get('rating')) || 0,
      reviews: Number(f.get('reviews')) || 0,
      image,
      desc: String(f.get('desc') || '').trim(),
      sizes: String(f.get('sizes') || '').split(',').map((s) => s.trim()).filter(Boolean),
      colors: p.colors.filter((c) => c.name || c.hex || c.images.length),
    };
    const idx = state.products.findIndex((x) => x.id === p.id);
    if (idx >= 0) state.products[idx] = next;
    else state.products.unshift(next);
    await saveProducts();
    closeModal();
    renderEditor();
  });
}

/* ---------- Модалки (локальные, как во витрине) ---------- */

function openModal(html) {
  let overlay = $('[data-modal-overlay]');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('data-modal-overlay', '');
    overlay.innerHTML = '<div class="modal" data-modal style="width:min(680px,100%)"></div>';
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
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

/* ---------- Boot ---------- */

async function boot() {
  try {
    const s = await api('/api/session');
    state.authed = s.authed;
    state.caps = s.configured || state.caps;
  } catch {
    state.authed = false;
    state.caps = { kv: false, r2: false, password: false };
  }
  $('[data-logout]').hidden = !state.authed;

  if (!state.authed) {
    renderLogin();
    return;
  }
  try {
    const data = await api('/api/products');
    state.products = data.products || [];
  } catch (err) {
    state.products = [];
    toast(err.message, true);
  }
  renderEditor();
}

$('[data-logout]').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' }).catch(() => {});
  await boot();
});

boot();
