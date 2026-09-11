(() => {
  const list = document.querySelector('[data-bag-list]');
  const empty = document.querySelector('[data-bag-empty]');
  const layout = document.querySelector('[data-bag-layout]');
  const countEl = document.querySelector('[data-bag-items-count]');
  const subtotalEl = document.querySelector('[data-bag-subtotal]');
  const totalEl = document.querySelector('[data-bag-total]');
  const checkout = document.querySelector('[data-bag-checkout]');

  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function render() {
    const items = window.NauticaCart?.read() || [];
    const quantity = items.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);
    const subtotal = items.reduce((sum, item) => sum + Math.max(0, Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1), 0);

    if (countEl) countEl.textContent = quantity === 1 ? '1 producto' : `${quantity} productos`;
    if (subtotalEl) subtotalEl.textContent = money.format(subtotal);
    if (totalEl) totalEl.textContent = money.format(subtotal);

    const hasItems = items.length > 0;
    if (empty) empty.hidden = hasItems;
    if (layout) layout.hidden = !hasItems;
    if (!list) return;
    list.innerHTML = '';

    items.forEach((item) => {
      const row = document.createElement('article');
      row.className = 'bag-item';
      const productHref = escapeHtml(item.href && item.href !== '#' ? item.href : `producto.html?sku=${encodeURIComponent(item.code || item.sku || item.id)}`);
      const img = item.imageUrl
        ? `<a class="bag-item__media-link" href="${productHref}" aria-label="Ver ${escapeHtml(item.name)}"><img class="bag-item__image" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}"></a>`
        : `<a class="bag-item__media-link" href="${productHref}" aria-label="Ver ${escapeHtml(item.name)}"><div class="bag-item__image" aria-hidden="true"></div></a>`;
      row.innerHTML = `${img}<div><h2 class="bag-item__title"><a href="${productHref}">${escapeHtml(item.name)}</a></h2>${item.variant ? `<p class="bag-item__variant">${escapeHtml(item.variant)}</p>` : ''}<p class="bag-item__price">${money.format(Number(item.price) || 0)}</p><div class="bag-item__controls"><button type="button" data-dec aria-label="Reducir cantidad">−</button><span>${Math.max(1, Number(item.quantity) || 1)}</span><button type="button" data-inc aria-label="Aumentar cantidad">+</button></div></div><button class="bag-item__remove" type="button" data-remove>Eliminar</button>`;
      row.querySelector('[data-dec]')?.addEventListener('click', () => window.NauticaCart.setQuantity(item.id, (Number(item.quantity) || 1) - 1, item.variant));
      row.querySelector('[data-inc]')?.addEventListener('click', () => window.NauticaCart.setQuantity(item.id, (Number(item.quantity) || 1) + 1, item.variant));
      row.querySelector('[data-remove]')?.addEventListener('click', () => window.NauticaCart.remove(item.id, item.variant));
      list.appendChild(row);
    });
  }


  window.addEventListener('nautica:cart-change', render);
  render();
})();
