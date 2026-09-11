(() => {
  const form = document.querySelector('#checkout-form');
  const summary = document.querySelector('[data-checkout-summary]');
  const error = document.querySelector('[data-checkout-error]');
  const submit = document.querySelector('[data-checkout-submit]');
  const addressWrap = document.querySelector('[data-checkout-address]');
  const stripeBanner = document.querySelector('[data-checkout-stripe-banner]');
  const modeNote = document.querySelector('[data-checkout-mode-note]');
  if (!form || !summary || !submit) return;

  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
  const items = () => window.NauticaCart?.read?.() || [];
  const normalizePostal = (value) => String(value || '').replace(/\D/g, '').slice(0, 5);
  const validPostal = (value) => /^\d{5}$/.test(normalizePostal(value));
  const isCdmxPostal = (value) => { const n = Number(normalizePostal(value)); return validPostal(value) && n >= 1000 && n <= 16999; };
  const isEdomexPostal = (value) => { const n = Number(normalizePostal(value)); return validPostal(value) && n >= 50000 && n <= 57999; };
  const supportsStripe = (value) => isCdmxPostal(value) || isEdomexPostal(value);

  function renderSummary() {
    const cartItems = items();
    if (!cartItems.length) {
      summary.innerHTML = '<div class="checkout-empty">Tu bolsa está vacía. <a href="productos.html">Ver productos</a></div>';
      submit.disabled = true;
      return 0;
    }
    submit.disabled = false;
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
      <div class="checkout-summary-total"><span>Total estimado</span><strong>${money.format(total)}</strong></div>`;
    return total;
  }

  function updateAddress() {
    const delivery = form.elements.delivery?.value === 'delivery';
    if (addressWrap) addressWrap.hidden = !delivery;
    if (form.elements.address) form.elements.address.required = delivery;
  }

  function whatsappBase() {
    const settings = window.NauticaSiteContent?.globalSettings || {};
    const number = String(settings.whatsappNumber || '').replace(/\D/g, '');
    if (number) return `https://wa.me/${number}`;
    const configured = settings.whatsappUrl;
    return configured ? String(configured).split('?')[0] : 'https://wa.me/525581297704';
  }

  function updateCheckoutMode() {
    const postalInput = form.elements.postalCode;
    const postal = normalizePostal(postalInput?.value);
    if (postalInput && postalInput.value !== postal) postalInput.value = postal;
    const ready = validPostal(postal);
    const stripe = ready && supportsStripe(postal);
    if (!ready) {
      submit.textContent = 'Pagar';
      submit.classList.remove('is-whatsapp');
      if (stripeBanner) stripeBanner.hidden = true;
      if (modeNote) { modeNote.hidden = false; modeNote.textContent = 'Ingresa tu código postal para definir el método de compra.'; }
      return;
    }
    if (stripe) {
      submit.textContent = 'Pagar';
      submit.classList.remove('is-whatsapp');
      if (stripeBanner) stripeBanner.hidden = false;
      if (modeNote) { modeNote.hidden = true; modeNote.textContent = ''; }
    } else {
      submit.textContent = 'Cotizar por WhatsApp';
      submit.classList.add('is-whatsapp');
      if (stripeBanner) stripeBanner.hidden = true;
      if (modeNote) { modeNote.hidden = false; modeNote.textContent = 'Fuera de CDMX y Estado de México, el envío se cotiza por WhatsApp.'; }
    }
  }

  async function startStripeCheckout(customer, cartItems) {
    submit.disabled = true;
    submit.textContent = 'Preparando pago…';
    const response = await fetch('api/create-checkout-session.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer,
        items: cartItems.map(item => ({
          code: String(item.code || item.sku || item.id || ''),
          quantity: Math.max(1, Number(item.quantity) || 1)
        }))
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url) throw new Error(payload.error || 'No fue posible iniciar el pago con Stripe.');
    window.location.assign(payload.url);
  }

  function startWhatsappQuote(customer, cartItems) {
    const total = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1), 0);
    const lines = cartItems.map(item => `• ${Math.max(1, Number(item.quantity) || 1)} × ${item.name} (${item.code || item.sku || item.id}) — ${money.format((Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1))}`);
    const addressLine = customer.delivery === 'Envío a domicilio' ? `\nDirección: ${customer.address}` : '';
    const text = `Hola, quiero cotizar mi compra en Nautica Home.\n\n${lines.join('\n')}\n\nTotal estimado: ${money.format(total)}\nEntrega: ${customer.delivery}\nCódigo postal: ${customer.postalCode}${addressLine}\nCliente: ${customer.name}\nTeléfono: ${customer.phone}\nCorreo: ${customer.email}`;
    window.location.href = `${whatsappBase()}?text=${encodeURIComponent(text)}`;
  }

  form.elements.delivery?.addEventListener('change', updateAddress);
  form.elements.postalCode?.addEventListener('input', updateCheckoutMode);
  form.elements.postalCode?.addEventListener('blur', updateCheckoutMode);
  window.addEventListener('nautica:cart-change', renderSummary);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (error) error.textContent = '';
    if (!form.reportValidity()) return;
    const cartItems = items();
    if (!cartItems.length) { if (error) error.textContent = 'Tu bolsa está vacía.'; return; }
    const data = new FormData(form);
    const postalCode = normalizePostal(data.get('postalCode'));
    if (!validPostal(postalCode)) { if (error) error.textContent = 'Ingresa un código postal válido de 5 números.'; return; }
    const customer = {
      name: `${data.get('name') || ''} ${data.get('lastName') || ''}`.trim(),
      phone: String(data.get('phone') || '').trim(),
      email: String(data.get('email') || '').trim(),
      postalCode,
      delivery: data.get('delivery') === 'delivery' ? 'Envío a domicilio' : 'Recoger',
      address: String(data.get('address') || '').trim()
    };
    try {
      if (supportsStripe(postalCode)) await startStripeCheckout(customer, cartItems);
      else startWhatsappQuote(customer, cartItems);
    } catch (err) {
      console.error('Checkout error:', err);
      if (error) error.textContent = err?.message || 'No fue posible procesar la compra.';
      submit.disabled = false;
      updateCheckoutMode();
    }
  });

  const params = new URLSearchParams(location.search);
  if (params.get('stripe') === 'cancel' && error) error.textContent = 'El pago fue cancelado. Puedes intentarlo nuevamente.';
  updateAddress();
  updateCheckoutMode();
  renderSummary();
})();
