import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { doc, getFirestore, onSnapshot } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxtwVNpQ0YaVUgOD045nJU-t2ZRaNv-aA",
  authDomain: "nautica-ca65d.firebaseapp.com",
  projectId: "nautica-ca65d",
  storageBucket: "nautica-ca65d.firebasestorage.app",
  messagingSenderId: "219098262982",
  appId: "1:219098262982:web:211955194cdb7c4a0e56c7",
  measurementId: "G-4P0VM0KCX3"
};

const app = getApps().find((item) => item.name === 'nautica-catalog') || initializeApp(firebaseConfig, 'nautica-catalog');
const db = getFirestore(app);
const homeRef = doc(db, 'siteContent', 'home');
const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

const clean = (v) => String(v ?? '').trim();
const esc = (v) => clean(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalizeCategory = (v) => clean(v).toLowerCase().replace(/\s+/g, '-');

function getCatalog(data = {}) {
  const catalog = data?.sections?.catalog || {};
  const items = Array.isArray(catalog.items) ? catalog.items : [];
  return {
    title: clean(catalog.title) || 'Productos',
    copy: clean(catalog.copy) || 'Descubre las colecciones de Nautica Home.',
    items: items.filter(item => item && item.enabled !== false && (item.id || item.name)).map((item, index) => ({
      id: clean(item.id || item.sku || `product-${index + 1}`),
      name: clean(item.name || item.title || `Producto ${index + 1}`),
      category: normalizeCategory(item.category || ''),
      categoryLabel: clean(item.categoryLabel || item.category || ''),
      price: Math.max(0, Number(item.price) || 0),
      compareAtPrice: Math.max(0, Number(item.compareAtPrice) || 0),
      imageUrl: clean(item.imageUrl || (Array.isArray(item.images) ? item.images[0] : '')),
      images: Array.isArray(item.images) ? item.images.map(clean).filter(Boolean) : [],
      description: clean(item.description),
      material: clean(item.material),
      dimensions: clean(item.dimensions),
      sku: clean(item.sku),
      available: item.available !== false,
      variant: clean(item.variant)
    }))
  };
}

function renderListing(data) {
  const grid = document.querySelector('[data-catalog-grid]');
  if (!grid) return;
  const title = document.querySelector('[data-catalog-title]');
  const copy = document.querySelector('[data-catalog-copy]');
  const filters = document.querySelector('[data-catalog-filters]');
  const empty = document.querySelector('[data-catalog-empty]');
  const catalog = getCatalog(data);
  if (title) title.textContent = catalog.title;
  if (copy) copy.textContent = catalog.copy;

  const params = new URLSearchParams(location.search);
  let selected = normalizeCategory(params.get('categoria') || '');
  const categories = [...new Set(catalog.items.map(i => i.category).filter(Boolean))];
  if (selected && !categories.includes(selected)) selected = '';

  const draw = () => {
    const visible = selected ? catalog.items.filter(i => i.category === selected) : catalog.items;
    grid.innerHTML = '';
    visible.forEach(item => {
      const a = document.createElement('a');
      a.className = 'product-card';
      a.href = `producto.html?id=${encodeURIComponent(item.id)}`;
      const media = item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="${esc(item.name)}">` : '';
      const compare = item.compareAtPrice > item.price ? `<span class="product-card__compare">${money.format(item.compareAtPrice)}</span>` : '';
      a.innerHTML = `<div class="product-card__media">${media}</div><div class="product-card__body"><h2 class="product-card__name">${esc(item.name)}</h2><p class="product-card__price">${money.format(item.price)}${compare}</p></div>`;
      grid.appendChild(a);
    });
    if (empty) empty.hidden = visible.length > 0;
  };

  if (filters) {
    filters.innerHTML = '';
    const entries = [['', 'Todos'], ...categories.map(c => [c, catalog.items.find(i => i.category === c)?.categoryLabel || c])];
    entries.forEach(([value,label]) => {
      const btn = document.createElement('button');
      btn.type='button'; btn.className=`catalog-filter${selected===value?' is-active':''}`; btn.textContent=label;
      btn.addEventListener('click',()=>{
        selected=value;
        filters.querySelectorAll('.catalog-filter').forEach(x=>x.classList.toggle('is-active', x===btn));
        const url = new URL(location.href); if(value) url.searchParams.set('categoria',value); else url.searchParams.delete('categoria'); history.replaceState({},'',url);
        draw();
      });
      filters.appendChild(btn);
    });
  }
  draw();
}

function renderProduct(data) {
  const shell = document.querySelector('[data-product-detail]');
  if (!shell) return;
  const id = clean(new URLSearchParams(location.search).get('id'));
  const catalog = getCatalog(data);
  const item = catalog.items.find(p => p.id === id);
  const missing = document.querySelector('[data-product-missing]');
  if (!item) { shell.hidden = true; if(missing) missing.hidden=false; return; }
  if(missing) missing.hidden=true; shell.hidden=false;

  document.title = `${item.name} | Nautica Home`;
  const title=document.querySelector('[data-product-title]'); if(title) title.textContent=item.name;
  const eyebrow=document.querySelector('[data-product-category]'); if(eyebrow) eyebrow.textContent=item.categoryLabel || item.category || 'NAUTICA HOME';
  const desc=document.querySelector('[data-product-description]'); if(desc) desc.textContent=item.description || 'Diseño Nautica Home para complementar tus espacios.';
  const price=document.querySelector('[data-product-price]'); if(price) price.textContent=money.format(item.price);
  const compare=document.querySelector('[data-product-compare]'); if(compare){ compare.textContent=item.compareAtPrice>item.price?money.format(item.compareAtPrice):''; compare.hidden=!(item.compareAtPrice>item.price); }

  const main=document.querySelector('[data-product-main-image]');
  const thumbs=document.querySelector('[data-product-thumbs]');
  const images=[item.imageUrl,...item.images].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
  if(main){ if(images[0]){main.src=images[0];main.alt=item.name;} else main.removeAttribute('src'); }
  if(thumbs){ thumbs.innerHTML=''; images.forEach((src,index)=>{ const b=document.createElement('button');b.type='button';b.className=`product-thumb${index===0?' is-active':''}`;b.innerHTML=`<img src="${esc(src)}" alt="">`;b.addEventListener('click',()=>{if(main)main.src=src; thumbs.querySelectorAll('.product-thumb').forEach(x=>x.classList.toggle('is-active',x===b));});thumbs.appendChild(b); }); }

  const meta=document.querySelector('[data-product-meta]');
  if(meta){ meta.innerHTML=''; [['SKU',item.sku],['Material',item.material],['Medidas',item.dimensions]].forEach(([k,v])=>{ if(!v)return; const row=document.createElement('div');row.className='product-info__meta-row';row.innerHTML=`<span>${esc(k)}</span><span>${esc(v)}</span>`;meta.appendChild(row); }); }

  const add=document.querySelector('[data-product-add]'); const feedback=document.querySelector('[data-product-feedback]');
  if(add){ add.disabled=!item.available; add.textContent=item.available?'Agregar a bolsa':'No disponible'; add.addEventListener('click',()=>{ window.NauticaCart?.add({id:item.id,name:item.name,price:item.price,imageUrl:item.imageUrl,href:location.href,variant:item.variant}); if(feedback)feedback.textContent='Producto agregado a tu bolsa.'; }); }
}

onSnapshot(homeRef, snap => {
  const data=snap.exists()?snap.data():{};
  renderListing(data);
  renderProduct(data);
}, error => {
  console.error('Catalog CMS unavailable.', error);
  renderListing({}); renderProduct({});
});
