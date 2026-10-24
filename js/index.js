/* ============================================================
   AURORA — home: featured products + hero showcase
   ============================================================ */

'use strict';

function heroShowcase(products) {
  const cards = $$('.hero-visual .float-card');
  if (!cards.length || !products.length) return;
  const picks = [
    products.find((p) => p.badge === 'new') || products[0],
    products.find((p) => p.id !== (products.find((q) => q.badge === 'new') || products[0]).id) || products[1] || products[0],
    products[2] || products[0],
  ];
  cards.forEach((card, i) => {
    if (!picks[i]) return;
    card.innerHTML = productMediaHTML(picks[i], false);
  });
}

function renderFeatured() {
  const grid = $('#featured-grid');
  if (!grid) return;
  const all = AuroraStore.products;
  if (!all.length) return;

  const withBadge = all.filter((p) => p.badge);
  const picks = (withBadge.length >= 4 ? withBadge : all).slice(0, 4);
  grid.innerHTML = picks
    .map((p, i) => productCardHTML(p, i * 0.08))
    .join('');
  initReveal();
}

AuroraStore.load().then(() => {
  renderFeatured();
  heroShowcase(AuroraStore.products);
});
