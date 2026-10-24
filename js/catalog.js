/* ============================================================
   AURORA — catalog: filters, search, sorting, favorites
   ============================================================ */

'use strict';

const catalogGrid = $('#catalog-grid');
const chipsWrap = $('[data-chips]');
const favsChip = $('[data-favs-chip]');
const resetChip = $('[data-reset]');
const searchInput = $('[data-search]');
const sortSelect = $('[data-sort]');
const countEl = $('[data-count]');
const demoNote = $('[data-demo-note]');

const catalogState = {
  cat: new URLSearchParams(location.search).get('cat') || 'all',
  q: '',
  sort: 'pop',
  onlyFavs: false,
};

/* ---------- Filters ---------- */

function renderChips() {
  const counts = { all: AuroraStore.products.length };
  for (const p of AuroraStore.products) {
    counts[p.category] = (counts[p.category] || 0) + 1;
  }
  const chip = (key, label, n) =>
    `<button class="chip ${catalogState.cat === key ? 'active' : ''}" data-cat="${key}">${label}<small>${n}</small></button>`;

  chipsWrap.innerHTML =
    chip('all', 'All', counts.all) +
    Object.entries(AuroraStore.categories)
      .map(([key, label]) => chip(key, label, counts[key] || 0))
      .join('');
}

function currentList() {
  let list = [...AuroraStore.products];
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
      list.sort((a, b) => (b.rating || 0) * (b.reviews || 0) - (a.rating || 0) * (a.reviews || 0));
  }
  return list;
}

function renderCatalog() {
  const list = currentList();
  countEl.textContent = `${list.length} item${list.length === 1 ? '' : 's'}`;

  if (!list.length) {
    catalogGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="big">🔭</div>
        <b>Nothing found</b>
        <span>Try another search or reset the filters — the glow will return.</span>
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

/* ---------- Events ---------- */

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

/* Re-render if favorites changed on this page */
document.addEventListener('aurora:favs', () => {
  if (catalogState.onlyFavs) renderCatalog();
});

/* ---------- Boot ---------- */

AuroraStore.load().then(() => {
  if (AuroraStore.demo && demoNote) demoNote.hidden = false;
  renderChips();
  renderCatalog();
});
