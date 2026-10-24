/* ============================================================
   AURORA — каталог: фильтры, поиск, сортировка, избранное
   ============================================================ */

'use strict';

const catalogGrid = $('#catalog-grid');
const chipsWrap = $('[data-chips]');
const favsChip = $('[data-favs-chip]');
const resetChip = $('[data-reset]');
const searchInput = $('[data-search]');
const sortSelect = $('[data-sort]');
const countEl = $('[data-count]');

const catalogState = {
  cat: new URLSearchParams(location.search).get('cat') || 'all',
  q: '',
  sort: 'pop',
  onlyFavs: false,
};

/* ---------- Фильтры ---------- */

function renderChips() {
  const counts = { all: window.AURORA_PRODUCTS.length };
  for (const p of window.AURORA_PRODUCTS) {
    counts[p.category] = (counts[p.category] || 0) + 1;
  }
  const chip = (key, label, n) =>
    `<button class="chip ${catalogState.cat === key ? 'active' : ''}" data-cat="${key}">${label}<small>${n}</small></button>`;

  chipsWrap.innerHTML =
    chip('all', 'Всё', counts.all) +
    Object.entries(window.AURORA_CATEGORIES)
      .map(([key, label]) => chip(key, label, counts[key] || 0))
      .join('');
}

function currentList() {
  let list = [...window.AURORA_PRODUCTS];
  if (catalogState.cat !== 'all') {
    list = list.filter((p) => p.category === catalogState.cat);
  }
  if (catalogState.onlyFavs) {
    list = list.filter((p) => favs.includes(p.id));
  }
  if (catalogState.q) {
    const q = catalogState.q.toLowerCase();
    list = list.filter((p) =>
      `${p.name} ${p.desc}`.toLowerCase().includes(q)
    );
  }
  switch (catalogState.sort) {
    case 'asc':
      list.sort((a, b) => a.price - b.price);
      break;
    case 'desc':
      list.sort((a, b) => b.price - a.price);
      break;
    case 'new':
      list.sort((a, b) =>
        (b.badge === 'new') - (a.badge === 'new') || b.rating - a.rating
      );
      break;
    default:
      list.sort((a, b) => b.rating * b.reviews - a.rating * a.reviews);
  }
  return list;
}

function renderCatalog() {
  const list = currentList();
  countEl.textContent = `Найдено: ${list.length}`;

  if (!list.length) {
    catalogGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="big">🔭</div>
        <b>Ничего не нашлось</b>
        <span>Попробуй другой запрос или сбрось фильтры — сияние ещё вернётся.</span>
      </div>`;
    return;
  }

  catalogGrid.innerHTML = list
    .map((p, i) => productCardHTML(p, Math.min(i, 8) * 0.05))
    .join('');
  initReveal();
}

function syncUrl() {
  const url = catalogState.cat === 'all'
    ? location.pathname
    : `${location.pathname}?cat=${catalogState.cat}`;
  history.replaceState(null, '', url);
}

/* ---------- События ---------- */

chipsWrap.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-cat]');
  if (!chip) return;
  catalogState.cat = chip.dataset.cat;
  renderChips();
  renderCatalog();
  syncUrl();
});

favsChip.addEventListener('click', () => {
  catalogState.onlyFavs = !catalogState.onlyFavs;
  favsChip.classList.toggle('active', catalogState.onlyFavs);
  renderCatalog();
});

resetChip.addEventListener('click', () => {
  catalogState.cat = 'all';
  catalogState.q = '';
  catalogState.sort = 'pop';
  catalogState.onlyFavs = false;
  searchInput.value = '';
  sortSelect.value = 'pop';
  favsChip.classList.remove('active');
  renderChips();
  renderCatalog();
  syncUrl();
});

let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    catalogState.q = searchInput.value.trim();
    renderCatalog();
  }, 160);
});

sortSelect.addEventListener('change', () => {
  catalogState.sort = sortSelect.value;
  renderCatalog();
});

/* Перерисовать, если меняли избранное прямо из карточек каталога */
document.addEventListener('aurora:favs', () => {
  if (catalogState.onlyFavs) renderCatalog();
});

/* ---------- Старт ---------- */

renderChips();
renderCatalog();
