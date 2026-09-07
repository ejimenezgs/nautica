import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { doc, getDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBxtwVNpQ0YaVUgOD045nJU-t2ZRaNv-aA',
  authDomain: 'nautica-ca65d.firebaseapp.com',
  projectId: 'nautica-ca65d',
  storageBucket: 'nautica-ca65d.firebasestorage.app',
  messagingSenderId: '219098262982',
  appId: '1:219098262982:web:211955194cdb7c4a0e56c7',
  measurementId: 'G-4P0VM0KCX3'
};

const app = initializeApp(firebaseConfig, 'nautica-search-page');
const db = getFirestore(app);
const form = document.querySelector('[data-search-form]');
const input = document.querySelector('[data-search-input]');
const status = document.querySelector('[data-search-status]');
const resultsEl = document.querySelector('[data-search-results]');

const fallback = [
  { type: 'Productos', title: 'Indoor', copy: 'Colección para espacios interiores.', href: 'index.html#colecciones' },
  { type: 'Productos', title: 'Outdoor', copy: 'Colección para exterior.', href: 'index.html#colecciones' },
  { type: 'Productos', title: 'Bedroom', copy: 'Colección para recámara.', href: 'index.html#colecciones' },
  { type: 'Productos', title: 'Sanitary', copy: 'Colección para baño.', href: 'index.html#colecciones' },
  { type: 'Productos', title: 'Decor', copy: 'Decoración Nautica Home.', href: 'index.html#colecciones' },
  { type: 'Productos', title: 'Lighting', copy: 'Iluminación Nautica Home.', href: 'index.html#colecciones' },
  { type: 'Sección', title: 'Nosotros', copy: 'Conoce Nautica Home.', href: 'index.html#nosotros' },
  { type: 'Sección', title: 'Tiendas', copy: 'Dónde encontrar Nautica Home.', href: 'index.html#tiendas' },
  { type: 'Sección', title: 'Inspiración', copy: 'Inspiración y contenido visual.', href: 'index.html#inspiracion' },
  { type: 'Sección', title: 'Contacto', copy: 'Ponte en contacto con Nautica Home.', href: 'index.html#contacto' }
];

function text(value) { return typeof value === 'string' ? value.trim() : ''; }

function buildIndex(data = {}) {
  const sections = data.sections || {};
  const out = [];
  const products = sections.products || {};
  (Array.isArray(products.items) ? products.items : []).forEach((item) => {
    if (!item || item.enabled === false) return;
    out.push({ type: 'Productos', title: text(item.label) || 'Producto', copy: 'Categoría de producto Nautica Home.', href: text(item.link) || 'index.html#colecciones' });
  });

  const sectionDefs = [
    ['about', 'Nosotros', 'index.html#nosotros'],
    ['retailers', 'Tiendas', 'index.html#tiendas'],
    ['inspiration', 'Inspiración', 'index.html#inspiracion'],
    ['newsletter', 'Newsletter', 'index.html#newsletter'],
    ['contact', 'Contacto', 'index.html#contacto']
  ];
  sectionDefs.forEach(([key, fallbackTitle, href]) => {
    const section = sections[key] || {};
    if (section.enabled === false) return;
    out.push({
      type: 'Sección',
      title: text(section.title) || fallbackTitle,
      copy: text(section.copy || section.paragraph1 || section.description),
      href
    });
  });

  const retailers = sections.retailers || {};
  (Array.isArray(retailers.items) ? retailers.items : []).forEach((item) => {
    if (!item || item.enabled === false || !text(item.name)) return;
    out.push({ type: 'Tienda', title: text(item.name), copy: 'Distribuidor Nautica Home.', href: 'index.html#tiendas' });
  });
  return out.length ? out : fallback;
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function render(items, query) {
  resultsEl.innerHTML = '';
  if (!query) {
    status.textContent = 'Escribe algo para buscar en Nautica Home.';
    return;
  }
  const q = normalize(query);
  const matches = items.filter((item) => normalize(`${item.type} ${item.title} ${item.copy}`).includes(q));
  status.textContent = matches.length === 1 ? '1 resultado' : `${matches.length} resultados`;
  if (!matches.length) {
    resultsEl.innerHTML = '<div class="empty-state"><h2>No encontramos resultados</h2><p>Prueba con otra palabra o explora las categorías desde la página principal.</p><a class="utility-button utility-button--secondary" href="index.html#colecciones">Ver productos</a></div>';
    return;
  }
  matches.forEach((item) => {
    const a = document.createElement('a');
    a.className = 'search-result';
    a.href = item.href || 'index.html';
    a.innerHTML = `<span class="search-result__type"></span><div><h2 class="search-result__title"></h2><p class="search-result__copy"></p></div><span class="search-result__arrow">→</span>`;
    a.querySelector('.search-result__type').textContent = item.type;
    a.querySelector('.search-result__title').textContent = item.title;
    a.querySelector('.search-result__copy').textContent = item.copy || '';
    resultsEl.appendChild(a);
  });
}

let searchIndex = fallback;
try {
  const snap = await getDoc(doc(db, 'siteContent', 'home'));
  if (snap.exists()) searchIndex = buildIndex(snap.data());
} catch (error) {
  console.warn('Search CMS unavailable; using fallback index.', error);
}

const params = new URLSearchParams(location.search);
const initial = params.get('q') || '';
input.value = initial;
render(searchIndex, initial);

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = input.value.trim();
  const url = new URL(location.href);
  if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
  history.replaceState({}, '', url);
  render(searchIndex, query);
});
