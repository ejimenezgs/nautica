import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
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

const app = getApps().find((entry) => entry.name === 'nautica-search-overlay') || initializeApp(firebaseConfig, 'nautica-search-overlay');
const db = getFirestore(app);
const overlay = document.querySelector('[data-search-overlay]');
const input = document.querySelector('[data-search-overlay-input]');
const closeBtn = document.querySelector('[data-search-overlay-close]');
const status = document.querySelector('[data-search-overlay-status]');
const results = document.querySelector('[data-search-overlay-results]');
const triggers = document.querySelectorAll('[data-search-trigger]');

const fallback = [
  { type:'Producto', title:'Indoor', imageUrl:'', href:'#colecciones' },
  { type:'Producto', title:'Outdoor', imageUrl:'', href:'#colecciones' },
  { type:'Producto', title:'Bedroom', imageUrl:'', href:'#colecciones' },
  { type:'Producto', title:'Sanitary', imageUrl:'', href:'#colecciones' },
  { type:'Producto', title:'Decor', imageUrl:'', href:'#colecciones' },
  { type:'Producto', title:'Lighting', imageUrl:'', href:'#colecciones' }
];

let index = fallback;
let loaded = false;

function clean(v){ return typeof v === 'string' ? v.trim() : ''; }
function normalize(v){ return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }

function buildIndex(data = {}) {
  const sections = data.sections || {};
  const out = [];
  const products = sections.products || {};
  (Array.isArray(products.items) ? products.items : []).forEach((item) => {
    if (!item || item.enabled === false) return;
    out.push({
      type: 'Producto',
      title: clean(item.label) || 'Producto',
      copy: clean(item.description || item.copy),
      imageUrl: clean(item.imageUrl),
      href: clean(item.link) || '#colecciones'
    });
  });
  const retailers = sections.retailers || {};
  (Array.isArray(retailers.items) ? retailers.items : []).forEach((item) => {
    if (!item || item.enabled === false || !clean(item.name)) return;
    out.push({ type:'Tienda', title:clean(item.name), copy:'Dónde encontrar Nautica Home', imageUrl:clean(item.logoUrl), href:'#tiendas' });
  });
  const defs = [
    ['about','Nosotros','#nosotros'],
    ['inspiration','Inspiración','#inspiracion'],
    ['newsletter','Newsletter','#newsletter'],
    ['contact','Contacto','#contacto']
  ];
  defs.forEach(([key, fallbackTitle, href]) => {
    const section = sections[key] || {};
    if (section.enabled === false) return;
    out.push({ type:'Sección', title:clean(section.title) || fallbackTitle, copy:clean(section.copy || section.paragraph1 || section.description), imageUrl:clean(section.imageUrl), href });
  });
  return out.length ? out : fallback;
}

async function ensureIndex() {
  if (loaded) return;
  loaded = true;
  try {
    const snap = await getDoc(doc(db, 'siteContent', 'home'));
    if (snap.exists()) index = buildIndex(snap.data());
  } catch (err) {
    console.warn('Inline search CMS unavailable; using fallback.', err);
  }
}

function render(query) {
  results.innerHTML = '';
  const q = normalize(query.trim());
  if (!q) {
    status.textContent = 'Escribe para buscar.';
    return;
  }
  const matches = index.filter((item) => normalize(`${item.type} ${item.title} ${item.copy || ''}`).includes(q));
  status.textContent = matches.length === 1 ? '1 resultado' : `${matches.length} resultados`;
  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'search-overlay__empty';
    empty.textContent = 'No encontramos resultados para tu búsqueda.';
    results.appendChild(empty);
    return;
  }
  matches.forEach((item) => {
    const card = document.createElement('a');
    card.className = 'search-overlay-card';
    card.href = item.href || '#';
    const media = document.createElement('div');
    media.className = 'search-overlay-card__media';
    if (item.imageUrl) media.style.backgroundImage = `url("${item.imageUrl.replaceAll('"','%22')}")`;
    const title = document.createElement('p');
    title.className = 'search-overlay-card__title';
    title.textContent = item.title;
    const meta = document.createElement('p');
    meta.className = 'search-overlay-card__meta';
    meta.textContent = item.type;
    card.append(media, title, meta);
    card.addEventListener('click', close);
    results.appendChild(card);
  });
}

async function open() {
  await ensureIndex();
  overlay.hidden = false;
  document.body.classList.add('search-open');
  input.value = '';
  render('');
  requestAnimationFrame(() => input.focus());
}
function close() {
  overlay.hidden = true;
  document.body.classList.remove('search-open');
}

triggers.forEach((trigger) => trigger.addEventListener('click', (event) => { event.preventDefault(); open(); }));
closeBtn?.addEventListener('click', close);
overlay?.addEventListener('click', (event) => {
  if (event.target === overlay) close();
});
input?.addEventListener('input', () => render(input.value));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && overlay && !overlay.hidden) close();
});
