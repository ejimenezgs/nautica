(() => {
  const form = document.querySelector('#checkout-form');
  const summary = document.querySelector('[data-checkout-summary]');
  const error = document.querySelector('[data-checkout-error]');
  const submit = document.querySelector('[data-checkout-submit]');
  const addressWrap = document.querySelector('[data-checkout-address]');
  if (!form || !summary) return;

  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
  const items = () => window.NauticaCart?.read?.() || [];

  function renderSummary() {
    const cartItems = items();
    if (!cartItems.length) {
      summary.innerHTML = '<div class="checkout-empty">Tu bolsa está vacía. <a href="productos.html">Ver productos</a></div>';
      if (submit) submit.disabled = true;
      return 0;
    }
    if (submit) submit.disabled = false;
    const total = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1), 0);
    summary.innerHTML = `
      <div class="checkout-summary-head"><span>Tu pedido</span><a href="bolsa.html">Editar bolsa</a></div>
      <div class="checkout-summary-items">
        ${cartItems.map(item => {
          const href = item.href && item.href !== '#' ? item.href : `producto.html?sku=${encodeURIComponent(item.code || item.sku || item.id)}`;
          return `<a class="checkout-summary-item" href="${escapeHtml(href)}">
            ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}">` : '<span class="checkout-summary-image"></span>'}
            <span class="checkout-summary-copy"><strong>${escapeHtml(item.name)}</strong>${item.variant ? `<small>${escapeHtml(item.variant)}</small>` : ''}<small>Cantidad: ${Math.max(1, Number(item.quantity) || 1)}</small></span>
            <span>${money.format((Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1))}</span>
          </a>`;
        }).join('')}
      </div>
      <div class="checkout-summary-total"><span>Total</span><strong>${money.format(total)}</strong></div>`;
    return total;
  }

  function updateAddress() {
    const delivery = form.elements.delivery?.value === 'delivery';
    if (addressWrap) addressWrap.hidden = !delivery;
    if (form.elements.address) form.elements.address.required = delivery;
  }

  function whatsappBase() {
    const configured = window.NauticaSiteContent?.globalSettings?.whatsappUrl;
    if (configured) return String(configured).split('?')[0];
    return 'https://wa.me/525513004665';
  }

  form.elements.delivery?.addEventListener('change', updateAddress);
  window.addEventListener('nautica:cart-change', renderSummary);
  window.addEventListener('nautica:sitecontent', () => {});

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (error) error.textContent = '';
    if (!form.reportValidity()) return;
    const cartItems = items();
    if (!cartItems.length) {
      if (error) error.textContent = 'Tu bolsa está vacía.';
      return;
    }
    const data = new FormData(form);
    const customer = {
      name: `${data.get('name') || ''} ${data.get('lastName') || ''}`.trim(),
      phone: String(data.get('phone') || '').trim(),
      email: String(data.get('email') || '').trim(),
      postalCode: String(data.get('postalCode') || '').trim(),
      delivery: data.get('delivery') === 'delivery' ? 'Envío a domicilio' : 'Recoger',
      address: String(data.get('address') || '').trim(),
      comments: String(data.get('comments') || '').trim()
    };
    const total = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1), 0);
    const lines = cartItems.map(item => `• ${Math.max(1, Number(item.quantity) || 1)} × ${item.name} (${item.code || item.sku || item.id}) — ${money.format((Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1))}`);
    const addressLine = customer.delivery === 'Envío a domicilio' ? `\nDirección: ${customer.address}` : '';
    const commentsLine = customer.comments ? `\nComentarios: ${customer.comments}` : '';
    const text = `Hola, quiero finalizar mi compra en Nautica Home.\n\n${lines.join('\n')}\n\nTotal: ${money.format(total)}\nEntrega: ${customer.delivery}\nCódigo postal: ${customer.postalCode}${addressLine}\nCliente: ${customer.name}\nTeléfono: ${customer.phone}\nCorreo: ${customer.email}${commentsLine}`;
    const url = `${whatsappBase()}?text=${encodeURIComponent(text)}`;
    window.location.href = url;
  });

  updateAddress();
  renderSummary();
})();
