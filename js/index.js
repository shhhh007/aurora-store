/* ============================================================
   AURORA — главная страница: витрина хитов
   ============================================================ */

'use strict';

const featuredGrid = document.getElementById('featured-grid');

if (featuredGrid) {
  const featured = [
    'hoodie-polyarnaya',
    'tee-cherny-led',
    'sweater-metel',
    'cargo-tuman',
  ];
  featuredGrid.innerHTML = featured
    .map((id, i) => productCardHTML(byId(id), i * 0.08))
    .join('');
}
