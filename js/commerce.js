(() => {
  const CART_KEY = 'nautica_cart_v1';

  function readCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function normalizeItem(item = {}) {
    const id = String(item.id || item.sku || item.name || '').trim();
    if (!id) throw new Error('El producto necesita un id.');
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const price = Math.max(0, Number(item.price) || 0);
    return {
      id,
      name: String(item.name || id),
      price,
      quantity,
      imageUrl: String(item.imageUrl || ''),
      href: String(item.href || '#'),
      variant: String(item.variant || '')
    };
  }

  function writeCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateBadges();
    window.dispatchEvent(new CustomEvent('nautica:cart-change', { detail: { items } }));
    return items;
  }

  function add(item) {
    const next = normalizeItem(item);
    const items = readCart();
    const existing = items.find((entry) => entry.id === next.id && String(entry.variant || '') === next.variant);
    if (existing) existing.quantity = Math.max(1, Number(existing.quantity) || 1) + next.quantity;
    else items.push(next);
    return writeCart(items);
  }

  function remove(id, variant = '') {
    return writeCart(readCart().filter((item) => !(item.id === id && String(item.variant || '') === String(variant || ''))));
  }

  function setQuantity(id, quantity, variant = '') {
    const value = Math.max(0, Math.floor(Number(quantity) || 0));
    const items = readCart();
    const item = items.find((entry) => entry.id === id && String(entry.variant || '') === String(variant || ''));
    if (!item) return items;
    if (value <= 0) return remove(id, variant);
    item.quantity = value;
    return writeCart(items);
  }

  function clear() { return writeCart([]); }

  function count() {
    return readCart().reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);
  }

  function updateBadges() {
    const total = count();
    document.querySelectorAll('[data-cart-count]').forEach((badge) => {
      badge.textContent = String(total);
      badge.hidden = total === 0;
    });
  }

  function ensureComingSoonModal() {
    let modal = document.querySelector('[data-coming-soon-modal]');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'coming-soon';
    modal.hidden = true;
    modal.dataset.comingSoonModal = '';
    modal.innerHTML = `
      <div class="coming-soon__card" role="dialog" aria-modal="true" aria-labelledby="comingSoonTitle">
        <button class="coming-soon__close" type="button" aria-label="Cerrar">×</button>
        <p class="coming-soon__eyebrow">NAUTICA HOME</p>
        <h2 class="coming-soon__title" id="comingSoonTitle">Coming soon</h2>
        <p class="coming-soon__copy">El acceso a perfil estará disponible próximamente.</p>
      </div>`;
    document.body.appendChild(modal);
    const close = () => { modal.hidden = true; document.body.style.overflow = ''; };
    modal.querySelector('.coming-soon__close')?.addEventListener('click', close);
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) close(); });
    return modal;
  }

  function showComingSoon() {
    const modal = ensureComingSoonModal();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector('.coming-soon__close')?.focus();
  }

  document.addEventListener('click', (event) => {
    const profile = event.target.closest('[data-profile-trigger]');
    if (!profile) return;
    event.preventDefault();
    showComingSoon();
  });

  window.NauticaCart = { read: readCart, add, remove, setQuantity, clear, count, key: CART_KEY };
  updateBadges();
  window.addEventListener('storage', (event) => { if (event.key === CART_KEY) updateBadges(); });
})();
