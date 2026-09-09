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

const CATEGORY_ALIASES = new Map([
  ["indoor", "interior"],
  ["interior", "interior"],
  ["outdoor", "exterior"],
  ["exterior", "exterior"],
  ["bedroom", "habitacion"],
  ["habitacion", "habitacion"],
  ["recamara", "habitacion"],
  ["sanitary", "bano"],
  ["bathroom", "bano"],
  ["bano", "bano"],
  ["decor", "decoracion"],
  ["decoracion", "decoracion"],
  ["lighting", "iluminacion"],
  ["iluminacion", "iluminacion"]
]);

const canonicalCategory = (value) => {
  const normalized = normalizeCategory(value);
  return CATEGORY_ALIASES.get(normalized) || normalized;
};

const normalizeSubcategory = (value) => normalizeCategory(value);
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


function imageUrlFromValue(value) {
  if (!value) return "";
  if (typeof value === "string") return clean(value);
  if (typeof value !== "object") return "";
  return clean(firstDefined(value, [
    "url", "src", "href", "imageUrl", "imagenUrl", "imagenURL", "image", "imagen", "foto", "photo", "urlImagen", "image_url"
  ]));
}

function extractProductImages(raw, variants = []) {
  const candidates = [];
  const push = (value) => {
    const url = imageUrlFromValue(value);
    if (url) candidates.push(url);
  };
  const pushMany = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (typeof entry === "string") push(entry);
        else if (entry && typeof entry === "object") {
          push(entry);
          ["images", "imagenes", "photos", "fotos", "gallery", "galeria"].forEach((key) => {
            if (Array.isArray(entry[key])) entry[key].forEach(push);
          });
        }
      });
      return;
    }
    if (typeof value === "object") {
      Object.values(value).forEach((entry) => {
        if (Array.isArray(entry)) entry.forEach(push);
        else push(entry);
      });
      return;
    }
    push(value);
  };

  [
    "images", "imagenes", "imageUrls", "imagenesUrl", "imagenesURL",
    "photos", "fotos", "gallery", "galeria", "media", "multimedia",
    "productImages", "imagenesProducto", "imagenes_producto", "archivos"
  ].forEach((key) => pushMany(raw?.[key]));

  variants.forEach((variant) => {
    push(variant);
    ["images", "imagenes", "photos", "fotos", "gallery", "galeria", "media"].forEach((key) => pushMany(variant?.[key]));
  });

  return candidates.filter((url, index, all) => all.indexOf(url) === index);
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
  const images = extractProductImages(raw, variants);
  if (imageUrl && !images.includes(imageUrl)) images.unshift(imageUrl);

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
    images,
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
    images: apiProduct.images,

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

function renderListingSkeleton(count = 8) {
  const grid = document.querySelector("[data-catalog-grid]");
  if (!grid) return;
  grid.innerHTML = Array.from({ length: count }, () => `
    <article class="product-card product-card--skeleton" aria-hidden="true">
      <div class="product-card__media skeleton-block"></div>
      <div class="product-card__body">
        <span class="skeleton-line skeleton-line--short"></span>
        <span class="skeleton-line"></span>
        <span class="skeleton-line skeleton-line--price"></span>
      </div>
    </article>`).join("");
}

function setListingState(state, message = "") {
  const status = document.querySelector("[data-catalog-status]");
  const grid = document.querySelector("[data-catalog-grid]");
  const filters = document.querySelector("[data-catalog-filters]");
  const subfilters = document.querySelector("[data-catalog-subfilters]");
  const empty = document.querySelector("[data-catalog-empty]");
  if (state === "loading") renderListingSkeleton();
  if (status) {
    status.dataset.state = state;
    status.hidden = state === "success";
    const text = status.querySelector("[data-catalog-status-text]");
    if (text) text.textContent = message;
    const retry = status.querySelector("[data-catalog-retry]");
    if (retry) retry.hidden = state !== "error";
  }
  if (grid) grid.hidden = state === "error";
  if (filters) filters.hidden = state === "loading" || state === "error";
  if (subfilters && (state === "loading" || state === "error")) subfilters.hidden = true;
  if (empty && (state === "loading" || state === "error")) empty.hidden = true;
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
  let selectedCategory = canonicalCategory(params.get("categoria") || "");
  let selectedSubcategory = normalizeSubcategory(params.get("subcategoria") || "");

  // Build categories/subcategories once from the already merged visible catalog.
  // customCategory/customSubcategory are already reflected by display* fields.
  const categoryMap = new Map();
  catalog.items.forEach((item) => {
    if (!item.displayCategory) return;
    const key = canonicalCategory(item.displayCategory);
    if (!key) return;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        key,
        label: item.displayCategory,
        subcategories: new Map()
      });
    }
    if (item.displaySubcategory) {
      const subKey = normalizeSubcategory(item.displaySubcategory);
      if (subKey && !categoryMap.get(key).subcategories.has(subKey)) {
        categoryMap.get(key).subcategories.set(subKey, item.displaySubcategory);
      }
    }
  });

  const categories = [...categoryMap.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "es", { sensitivity: "base" })
  );
  categories.forEach((category) => {
    category.subcategories = new Map(
      [...category.subcategories.entries()].sort((a, b) =>
        a[1].localeCompare(b[1], "es", { sensitivity: "base" })
      )
    );
  });

  const syncUrl = () => {
    const url = new URL(location.href);
    if (selectedCategory) url.searchParams.set("categoria", selectedCategory);
    else url.searchParams.delete("categoria");
    if (selectedCategory && selectedSubcategory) url.searchParams.set("subcategoria", selectedSubcategory);
    else url.searchParams.delete("subcategoria");
    history.replaceState({}, "", url);
  };

  const filteredItems = () => catalog.items.filter((item) => {
    if (selectedCategory && canonicalCategory(item.displayCategory) !== selectedCategory) return false;
    if (selectedSubcategory && normalizeSubcategory(item.displaySubcategory) !== selectedSubcategory) return false;
    return true;
  });

  const drawProducts = () => {
    const visible = filteredItems();
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
      empty.textContent = "No hay productos disponibles.";
    }
  };

  const renderSubcategories = () => {
    // v99: subcategories now live inside each category dropdown, mirroring the
    // main navbar. Keep the old container hidden for backwards-compatible HTML.
    const submenu = document.querySelector("[data-catalog-subfilters]");
    if (submenu) {
      submenu.innerHTML = "";
      submenu.hidden = true;
    }
  };

  const renderFilters = () => {
    if (!filters) return;
    filters.innerHTML = "";
    filters.classList.add("catalog-nav-filters");

    const closeMenus = (except = null) => {
      filters.querySelectorAll(".catalog-filter-item.is-open").forEach((item) => {
        if (item !== except) item.classList.remove("is-open");
      });
    };

    const allItem = document.createElement("div");
    allItem.className = `catalog-filter-item${!selectedCategory ? " is-active" : ""}`;
    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = "catalog-filter";
    allButton.textContent = "Todo";
    allButton.addEventListener("click", () => {
      selectedCategory = "";
      selectedSubcategory = "";
      syncUrl();
      renderFilters();
      drawProducts();
    });
    allItem.appendChild(allButton);
    filters.appendChild(allItem);

    categories.forEach((category) => {
      const item = document.createElement("div");
      item.className = `catalog-filter-item${selectedCategory === category.key ? " is-active" : ""}`;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "catalog-filter";
      button.textContent = category.label;
      button.setAttribute("aria-haspopup", category.subcategories.size ? "true" : "false");
      button.setAttribute("aria-expanded", "false");

      if (category.subcategories.size) {
        const menu = document.createElement("div");
        menu.className = "catalog-filter-menu";
        menu.setAttribute("role", "menu");
        menu.setAttribute("aria-label", `Subcategorías de ${category.label}`);

        const addOption = (value, text) => {
          const option = document.createElement("button");
          option.type = "button";
          option.className = `catalog-filter-menu__option${selectedCategory === category.key && selectedSubcategory === value ? " is-active" : ""}`;
          option.textContent = text;
          option.setAttribute("role", "menuitem");
          option.addEventListener("click", (event) => {
            event.stopPropagation();
            selectedCategory = category.key;
            selectedSubcategory = value;
            syncUrl();
            renderFilters();
            drawProducts();
          });
          menu.appendChild(option);
        };

        addOption("", "Todo");
        category.subcategories.forEach((text, value) => addOption(value, text));
        item.appendChild(menu);

        item.addEventListener("mouseenter", () => {
          closeMenus(item);
          item.classList.add("is-open");
          button.setAttribute("aria-expanded", "true");
        });
        item.addEventListener("mouseleave", () => {
          item.classList.remove("is-open");
          button.setAttribute("aria-expanded", "false");
        });
      }

      button.addEventListener("click", (event) => {
        const isMobile = window.matchMedia("(max-width: 760px)").matches;
        const hasSubs = category.subcategories.size > 0;
        const alreadySelected = selectedCategory === category.key;

        selectedCategory = category.key;
        selectedSubcategory = "";
        syncUrl();
        drawProducts();

        if (isMobile && hasSubs) {
          event.stopPropagation();
          const wasOpen = item.classList.contains("is-open");
          closeMenus(item);
          item.classList.toggle("is-open", !wasOpen);
          button.setAttribute("aria-expanded", String(!wasOpen));
          filters.querySelectorAll(".catalog-filter-item").forEach((node) => node.classList.toggle("is-active", node === item));
        } else {
          renderFilters();
        }
      });

      item.insertBefore(button, item.firstChild);
      filters.appendChild(item);
    });

    renderSubcategories();
  };

  renderFilters();
  drawProducts();
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

  const codeEl = document.querySelector("[data-product-code]");
  if (codeEl) codeEl.textContent = item.code;

  const breadcrumbName = document.querySelector("[data-product-breadcrumb-name]");
  if (breadcrumbName) breadcrumbName.textContent = item.displayName;
  const categoryLink = document.querySelector("[data-product-category-link]");
  if (categoryLink) {
    categoryLink.textContent = item.displaySubcategory || item.displayCategory || "Productos";
    const categoryValue = item.displayCategory || item.category || "";
    categoryLink.href = categoryValue
      ? `productos.html?categoria=${encodeURIComponent(canonicalCategory(categoryValue))}`
      : "productos.html";
  }

  const desc = document.querySelector("[data-product-description]");
  if (desc) desc.textContent = item.displayDescription || "—";

  const raw = item.raw || {};
  const materialValue = clean(firstDefined(raw, [
    "material", "materials", "materiales", "materialPrincipal", "material_principal", "composicion", "composition"
  ]));
  const measureValue = clean(firstDefined(raw, [
    "medidas", "measures", "measurements", "dimensiones", "dimensions", "dimension", "size", "tamano", "tamaño"
  ]));
  const materials = document.querySelector("[data-product-materials]");
  if (materials) materials.textContent = materialValue || "—";
  const measures = document.querySelector("[data-product-measures]");
  if (measures) measures.textContent = measureValue || "—";

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
  const galleryMore = document.querySelector("[data-product-gallery-more]");
  const overrideImage = clean(item.override?.imageUrl);
  const apiImages = Array.isArray(item.images) ? item.images : [];
  const fallbackExtracted = extractProductImages(item.raw || {}, item.variants || []);
  const images = [overrideImage, ...apiImages, ...fallbackExtracted, item.imageUrl]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
  if (main) {
    if (images[0]) { main.src = images[0]; main.alt = item.imageAlt; }
    else { main.removeAttribute("src"); main.alt = item.imageAlt; }
  }
  if (galleryMore) {
    galleryMore.innerHTML = "";
    images.slice(1).forEach((src, index) => {
      const figure = document.createElement("figure");
      figure.className = "product-gallery__item";
      figure.innerHTML = `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.imageAlt)}" loading="lazy">`;
      figure.addEventListener("click", () => {
        if (!main) return;
        const previous = main.src;
        main.src = src;
        const image = figure.querySelector("img");
        if (image && previous) image.src = previous;
      });
      galleryMore.appendChild(figure);
    });
  }

  const colorSection = document.querySelector("[data-product-color-section]");
  const swatches = document.querySelector("[data-product-swatches]");
  if (swatches) swatches.innerHTML = "";
  const colors = [];
  item.variants.forEach((variant) => {
    const label = clean(firstDefined(variant, ["colorName", "nombreColor", "color", "colour", "tono", "nombre"]));
    const hex = clean(firstDefined(variant, ["colorHex", "hex", "hexColor", "codigoColor", "colourHex"]));
    if (!label && !hex) return;
    const key = `${label}|${hex}`.toLowerCase();
    if (!colors.some((entry) => entry.key === key)) colors.push({ key, label: label || hex, hex });
  });
  if (colorSection) colorSection.hidden = !colors.length;
  if (swatches && colors.length) {
    colors.forEach((color, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `product-swatch${index === 0 ? " is-active" : ""}${color.hex && /^#?[0-9a-f]{3,8}$/i.test(color.hex) ? "" : " product-swatch--text"}`;
      button.setAttribute("aria-label", color.label);
      if (color.hex && /^#?[0-9a-f]{3,8}$/i.test(color.hex)) {
        const value = color.hex.startsWith("#") ? color.hex : `#${color.hex}`;
        button.style.setProperty("--swatch", value);
      } else {
        button.textContent = color.label;
      }
      button.addEventListener("click", () => {
        swatches.querySelectorAll(".product-swatch").forEach((node) => node.classList.toggle("is-active", node === button));
      });
      swatches.appendChild(button);
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
  if (retry) {
    catalogCache = null;
    boot({ force: true });
    return;
  }

});

boot();
