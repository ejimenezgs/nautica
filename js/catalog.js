import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  collection,
  getDocs,
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxtwVNpQ0YaVUgOD045nJU-t2ZRaNv-aA",
  authDomain: "nautica-ca65d.firebaseapp.com",
  projectId: "nautica-ca65d",
  storageBucket: "nautica-ca65d.firebasestorage.app",
  messagingSenderId: "219098262982",
  appId: "1:219098262982:web:211955194cdb7c4a0e56c7",
  measurementId: "G-4P0VM0KCX3"
};

const DEFAULT_API_URL = "https://segel-erp.vercel.app/api/catalogo";
const app = getApps().find((item) => item.name === "nautica-catalog") || initializeApp(firebaseConfig, "nautica-catalog");
const db = getFirestore(app);
const overridesRef = collection(db, "catalogProductOverrides");
const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

let catalogCache = null;
let loadPromise = null;

const clean = (value) => String(value ?? "").trim();
const normalizeKey = (value) => clean(value).toUpperCase();
const normalizeCategory = (value) => clean(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
const escapeHtml = (value) => clean(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function firstDefined(source, aliases) {
  if (!source || typeof source !== "object") return undefined;
  for (const key of aliases) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== null && source[key] !== undefined && source[key] !== "") {
      return source[key];
    }
  }
  return undefined;
}

function numberValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  // Supports values such as "$ 12,990.00", "12990", "12.990,00".
  const stripped = raw.replace(/[^0-9,.-]/g, "");
  if (!stripped) return null;
  let normalized = stripped;
  const lastComma = stripped.lastIndexOf(",");
  const lastDot = stripped.lastIndexOf(".");
  if (lastComma > lastDot && lastComma >= 0) {
    normalized = stripped.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = stripped.replace(/,/g, "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function arrayValue(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}

function productArrayCandidate(candidate) {
  if (Array.isArray(candidate)) return candidate;
  if (!candidate || typeof candidate !== "object") return null;
  const values = Object.values(candidate);
  if (values.length && values.every((item) => item && typeof item === "object" && !Array.isArray(item))) return values;
  return null;
}

function extractApiItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const directCandidates = [
    payload.products,
    payload.productos,
    payload.items,
    payload.catalogo,
    payload.data,
    payload.results,
    payload.result
  ];
  for (const candidate of directCandidates) {
    const items = productArrayCandidate(candidate);
    if (items) return items;
  }

  if (payload.data && typeof payload.data === "object") {
    const nestedCandidates = [
      payload.data.products,
      payload.data.productos,
      payload.data.items,
      payload.data.catalogo,
      payload.data.results
    ];
    for (const candidate of nestedCandidates) {
      const items = productArrayCandidate(candidate);
      if (items) return items;
    }
  }

  // Some APIs expose a keyed product object instead of an array.
  return productArrayCandidate(payload) || [];
}

export function normalizeProduct(raw) {
  if (!raw || typeof raw !== "object") return null;

  const code = clean(firstDefined(raw, [
    "codigo", "código", "code", "sku", "SKU", "clave", "idProducto", "productId",
    "codigoProducto", "codigo_producto", "productCode", "itemCode", "item_code"
  ]));
  if (!code) return null;

  const internalId = clean(firstDefined(raw, [
    "id", "_id", "idProducto", "productId", "productoId", "itemId", "inventoryId"
  ])) || code;
  const name = clean(firstDefined(raw, [
    "nombre", "name", "nombreProducto", "productName", "producto", "descripcionCorta", "shortDescription"
  ])) || code;
  const category = clean(firstDefined(raw, [
    "categoria", "category", "categoriaNombre", "categoryName", "familia", "family", "departamento", "department"
  ]));
  const subcategory = clean(firstDefined(raw, [
    "subcategoria", "subcategory", "subCategoria", "subcategoriaNombre", "subcategoryName", "subfamilia", "subfamily"
  ]));
  const price = numberValue(firstDefined(raw, [
    "precio", "price", "precioBase", "basePrice", "precioVenta", "sellingPrice", "salePrice", "precio_publico"
  ]));
  const stock = numberValue(firstDefined(raw, [
    "stock", "existencia", "existencias", "inventory", "inventario", "cantidadDisponible", "availableQuantity", "qty", "quantity", "stockTotal"
  ]));
  const imageUrl = clean(firstDefined(raw, [
    "imageUrl", "imagenUrl", "imagenURL", "image", "imagen", "foto", "photo", "urlImagen", "image_url"
  ]));
  const description = clean(firstDefined(raw, [
    "description", "descripcion", "descripción", "descripcionLarga", "longDescription", "detalle", "details"
  ]));
  const variants = arrayValue(firstDefined(raw, ["variants", "variantes", "options", "opciones", "presentaciones"]));

  // API data is authoritative for these fields. Missing price/stock remain null;
  // they are never replaced with invented values or Firestore editorial data.
  return {
    id: internalId,
    code,
    name,
    category,
    subcategory,
    price,
    stock,
    imageUrl,
    description,
    variants,
    raw
  };
}

function mergeOverride(apiProduct, override = {}) {
  const promoCandidate = numberValue(override.promoPrice);
  const promoPrice = promoCandidate !== null && promoCandidate >= 0 ? promoCandidate : null;

  return {
    ...apiProduct,
    // Explicitly preserve ERP-controlled fields.
    id: apiProduct.id,
    code: apiProduct.code,
    price: apiProduct.price,
    stock: apiProduct.stock,
    raw: apiProduct.raw,

    displayName: clean(override.customName) || apiProduct.name,
    displayDescription: clean(override.customDescription) || apiProduct.description,
    displayCategory: clean(override.customCategory) || apiProduct.category,
    displaySubcategory: clean(override.customSubcategory) || apiProduct.subcategory,
    promoPrice,
    imageUrl: clean(override.imageUrl) || apiProduct.imageUrl,
    imageAlt: clean(override.imageAlt) || clean(override.customName) || apiProduct.name,
    hidden: override.hidden === true,
    featured: override.featured === true,
    override
  };
}

function statusRank(product) {
  const stock = product.stock;
  if (typeof stock !== "number" || !Number.isFinite(stock)) return 3;
  if (stock > 4) return 0;
  if (stock > 0) return 1;
  return 2;
}

function stockLabel(product) {
  const rank = statusRank(product);
  if (rank === 0) return { label: "Disponible", className: "is-available" };
  if (rank === 1) return { label: "¡Poco stock!", className: "is-low" };
  if (rank === 2) return { label: "Agotado", className: "is-out" };
  return { label: "", className: "is-unknown" };
}

function effectivePrice(product) {
  if (product.promoPrice !== null && product.price !== null && product.promoPrice < product.price) return product.promoPrice;
  return product.price;
}

function sortProducts(products) {
  return [...products].sort((a, b) => {
    const statusDelta = statusRank(a) - statusRank(b);
    if (statusDelta !== 0) return statusDelta;
    return a.displayName.localeCompare(b.displayName, "es", { sensitivity: "base" });
  });
}

async function resolveCatalogApiUrl() {
  const fromData = (data) => clean(data?.catalog?.apiUrl || data?.sections?.catalog?.apiUrl);
  const existing = fromData(window.NauticaSiteContent);
  if (existing) return existing;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("nautica:sitecontent", onContent);
      resolve(value || DEFAULT_API_URL);
    };
    const onContent = (event) => finish(fromData(event.detail));
    window.addEventListener("nautica:sitecontent", onContent, { once: true });
    window.setTimeout(() => finish(fromData(window.NauticaSiteContent)), 1500);
  });
}

async function loadOverrides() {
  const snapshot = await getDocs(overridesRef);
  const map = new Map();
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const explicitCode = clean(firstDefined(data, ["code", "sku", "codigo", "clave"]));
    const code = explicitCode || docSnap.id;
    if (!code) return;
    map.set(normalizeKey(code), { ...data, __docId: docSnap.id });
  });
  return map;
}

async function fetchApiProducts(apiUrl) {
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`ERP_HTTP_${response.status}`);
  const payload = await response.json();
  const rawItems = extractApiItems(payload);
  if (!rawItems.length) return [];
  return rawItems.map(normalizeProduct).filter(Boolean);
}

async function loadCatalog({ force = false } = {}) {
  if (catalogCache && !force) return catalogCache;
  if (loadPromise && !force) return loadPromise;

  loadPromise = (async () => {
    const apiUrl = await resolveCatalogApiUrl();

    // One ERP request + one collection read. Both happen in parallel.
    // If overrides fail, fail closed so hidden/editorial state is never bypassed.
    const [apiResult, overrideResult] = await Promise.allSettled([
      fetchApiProducts(apiUrl),
      loadOverrides()
    ]);

    if (apiResult.status !== "fulfilled") {
      throw new Error(`ERP_UNAVAILABLE:${apiResult.reason?.message || "unknown"}`);
    }
    if (overrideResult.status !== "fulfilled") {
      throw new Error(`OVERRIDES_UNAVAILABLE:${overrideResult.reason?.message || "unknown"}`);
    }

    const overrides = overrideResult.value;
    const merged = apiResult.value.map((product) => mergeOverride(product, overrides.get(normalizeKey(product.code)) || {}));
    const visible = sortProducts(merged.filter((product) => product.hidden !== true));

    catalogCache = {
      apiUrl,
      items: visible,
      totalFromApi: apiResult.value.length,
      overrideCount: overrides.size
    };
    return catalogCache;
  })();

  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

function setListingState(state, message = "") {
  const status = document.querySelector("[data-catalog-status]");
  const grid = document.querySelector("[data-catalog-grid]");
  const filters = document.querySelector("[data-catalog-filters]");
  if (status) {
    status.dataset.state = state;
    status.hidden = state === "success";
    const text = status.querySelector("[data-catalog-status-text]");
    if (text) text.textContent = message;
    const retry = status.querySelector("[data-catalog-retry]");
    if (retry) retry.hidden = state !== "error";
  }
  if (grid) grid.hidden = state === "loading" || state === "error";
  if (filters) filters.hidden = state === "loading" || state === "error";
}

function renderPriceHtml(product) {
  const base = product.price;
  const promo = product.promoPrice !== null && base !== null && product.promoPrice < base ? product.promoPrice : null;
  if (promo !== null) {
    return `<span class="product-card__promo">${money.format(promo)}</span><span class="product-card__compare">${money.format(base)}</span>`;
  }
  return `<span>${base !== null ? money.format(base) : "Precio no disponible"}</span>`;
}

function renderListing(catalog) {
  const grid = document.querySelector("[data-catalog-grid]");
  if (!grid) return;
  const filters = document.querySelector("[data-catalog-filters]");
  const empty = document.querySelector("[data-catalog-empty]");

  const params = new URLSearchParams(location.search);
  let selected = normalizeCategory(params.get("categoria") || "");
  const categories = [...new Map(
    catalog.items
      .filter((item) => item.displayCategory)
      .map((item) => [normalizeCategory(item.displayCategory), item.displayCategory])
  ).entries()];

  if (selected && !categories.some(([key]) => key === selected)) selected = "";

  const draw = () => {
    const visible = selected
      ? catalog.items.filter((item) => normalizeCategory(item.displayCategory) === selected)
      : catalog.items;

    grid.innerHTML = "";
    visible.forEach((item) => {
      const availability = stockLabel(item);
      const card = document.createElement("a");
      card.className = "product-card";
      card.href = `producto.html?sku=${encodeURIComponent(item.code)}`;
      const media = item.imageUrl
        ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.imageAlt)}" loading="lazy">`
        : `<span class="product-card__placeholder" aria-hidden="true"></span>`;
      card.innerHTML = `
        <div class="product-card__media">${media}</div>
        <div class="product-card__body">
          ${availability.label ? `<span class="product-stock ${availability.className}">${escapeHtml(availability.label)}</span>` : ""}
          <h2 class="product-card__name">${escapeHtml(item.displayName)}</h2>
          <p class="product-card__price">${renderPriceHtml(item)}</p>
        </div>`;
      grid.appendChild(card);
    });

    if (empty) {
      empty.hidden = visible.length > 0;
      empty.textContent = selected ? "No hay productos para esta categoría." : "No hay productos disponibles.";
    }
  };

  if (filters) {
    filters.innerHTML = "";
    const entries = [["", "Todos"], ...categories];
    entries.forEach(([value, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `catalog-filter${selected === value ? " is-active" : ""}`;
      button.textContent = label;
      button.addEventListener("click", () => {
        selected = value;
        filters.querySelectorAll(".catalog-filter").forEach((node) => node.classList.toggle("is-active", node === button));
        const url = new URL(location.href);
        if (value) url.searchParams.set("categoria", value); else url.searchParams.delete("categoria");
        history.replaceState({}, "", url);
        draw();
      });
      filters.appendChild(button);
    });
  }

  draw();
  setListingState("success");
}

function setProductState(state, message = "") {
  const detail = document.querySelector("[data-product-detail]");
  const missing = document.querySelector("[data-product-missing]");
  if (state === "loading") {
    if (detail) detail.hidden = true;
    if (missing) { missing.hidden = false; missing.textContent = "Cargando producto..."; }
  } else if (state === "error") {
    if (detail) detail.hidden = true;
    if (missing) { missing.hidden = false; missing.textContent = message || "No se pudo cargar el producto."; }
  } else if (state === "missing") {
    if (detail) detail.hidden = true;
    if (missing) { missing.hidden = false; missing.textContent = "Este producto no está disponible o no está publicado."; }
  } else {
    if (detail) detail.hidden = false;
    if (missing) missing.hidden = true;
  }
}

function renderProduct(catalog) {
  const shell = document.querySelector("[data-product-detail]");
  if (!shell) return;
  const params = new URLSearchParams(location.search);
  const requestedCode = clean(params.get("sku") || params.get("code") || params.get("id"));
  const item = catalog.items.find((product) => normalizeKey(product.code) === normalizeKey(requestedCode));
  if (!item) {
    setProductState("missing");
    return;
  }

  setProductState("success");
  document.title = `${item.displayName} | Nautica Home`;

  const title = document.querySelector("[data-product-title]");
  if (title) title.textContent = item.displayName;
  const eyebrow = document.querySelector("[data-product-category]");
  if (eyebrow) eyebrow.textContent = item.displaySubcategory || item.displayCategory || "NAUTICA HOME";
  const desc = document.querySelector("[data-product-description]");
  if (desc) desc.textContent = item.displayDescription || "";

  const price = document.querySelector("[data-product-price]");
  const compare = document.querySelector("[data-product-compare]");
  const hasPromo = item.promoPrice !== null && item.price !== null && item.promoPrice < item.price;
  if (price) price.textContent = hasPromo ? money.format(item.promoPrice) : (item.price !== null ? money.format(item.price) : "Precio no disponible");
  if (compare) {
    compare.textContent = hasPromo ? money.format(item.price) : "";
    compare.hidden = !hasPromo;
  }

  const stock = stockLabel(item);
  const stockEl = document.querySelector("[data-product-stock]");
  if (stockEl) {
    stockEl.textContent = stock.label;
    stockEl.className = `product-stock ${stock.className}`;
    stockEl.hidden = !stock.label;
  }

  const main = document.querySelector("[data-product-main-image]");
  const thumbs = document.querySelector("[data-product-thumbs]");
  const variantImages = item.variants
    .map((variant) => clean(firstDefined(variant, ["imageUrl", "imagenUrl", "image", "imagen", "foto"])))
    .filter(Boolean);
  const images = [item.imageUrl, ...variantImages].filter(Boolean).filter((value, index, array) => array.indexOf(value) === index);
  if (main) {
    if (images[0]) { main.src = images[0]; main.alt = item.imageAlt; }
    else { main.removeAttribute("src"); main.alt = item.imageAlt; }
  }
  if (thumbs) {
    thumbs.innerHTML = "";
    images.forEach((src, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `product-thumb${index === 0 ? " is-active" : ""}`;
      button.innerHTML = `<img src="${escapeHtml(src)}" alt="">`;
      button.addEventListener("click", () => {
        if (main) main.src = src;
        thumbs.querySelectorAll(".product-thumb").forEach((node) => node.classList.toggle("is-active", node === button));
      });
      thumbs.appendChild(button);
    });
  }

  const meta = document.querySelector("[data-product-meta]");
  if (meta) {
    meta.innerHTML = "";
    [["SKU", item.code], ["Categoría", item.displayCategory], ["Subcategoría", item.displaySubcategory]].forEach(([label, value]) => {
      if (!value) return;
      const row = document.createElement("div");
      row.className = "product-info__meta-row";
      row.innerHTML = `<span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span>`;
      meta.appendChild(row);
    });
  }

  const add = document.querySelector("[data-product-add]");
  const feedback = document.querySelector("[data-product-feedback]");
  const outOfStock = typeof item.stock === "number" && item.stock <= 0;
  const salePrice = effectivePrice(item);
  if (add) {
    add.disabled = outOfStock || salePrice === null;
    add.textContent = outOfStock ? "Agotado" : "Agregar a bolsa";
    add.onclick = () => {
      if (outOfStock || salePrice === null) return;
      window.NauticaCart?.add({
        id: item.code,
        code: item.code,
        sku: item.code,
        name: item.displayName,
        price: salePrice,
        basePrice: item.price,
        imageUrl: item.imageUrl,
        href: `producto.html?sku=${encodeURIComponent(item.code)}`,
        variant: ""
      });
      if (feedback) feedback.textContent = "Producto agregado a tu bolsa.";
    };
  }
}

async function boot({ force = false } = {}) {
  const isListing = Boolean(document.querySelector("[data-catalog-grid]"));
  const isDetail = Boolean(document.querySelector("[data-product-detail]"));
  if (!isListing && !isDetail) return;

  if (isListing) setListingState("loading", "Cargando productos...");
  if (isDetail) setProductState("loading");

  try {
    const catalog = await loadCatalog({ force });
    if (isListing) {
      if (!catalog.items.length) {
        renderListing(catalog);
        const empty = document.querySelector("[data-catalog-empty]");
        if (empty) { empty.hidden = false; empty.textContent = "No hay productos disponibles."; }
      } else {
        renderListing(catalog);
      }
    }
    if (isDetail) renderProduct(catalog);
  } catch (error) {
    console.error("Nautica catalog load failed:", error);
    if (isListing) setListingState("error", "No se pudieron cargar los productos.");
    if (isDetail) setProductState("error", "No se pudo cargar el producto.");
  }
}

document.addEventListener("click", (event) => {
  const retry = event.target.closest("[data-catalog-retry]");
  if (!retry) return;
  catalogCache = null;
  boot({ force: true });
});

boot();
