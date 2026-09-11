# Nautica Home v83 — Firestore CMS + Contact Messages

Base inspeccionada: `nautica-home-v82-footer-legal-links.zip`.

## Integración
- `js/firebase-site.js` escucha `siteContent/home` en tiempo real.
- Si Firestore no existe/falla o un campo está vacío, se conserva el contenido HTML actual.
- El formulario de Contacto crea documentos en `contactMessages`.
- Intro temporal, newsletter, cookies, SEO, navegación y responsive permanecen separados.

## Firebase
Proyecto existente: `nautica-ca65d`.
Publica `firestore.rules` (mismo contenido que el entregado con Nautica Panel v3).


## v84 — contenido rotativo
- `utility.messages[]`: mensajes activos de barra superior y `utility.rotationSeconds`.
- `sections.hero.banners[]`: banners con `imageUrl`, `mobileImageUrl`, `alt`, `enabled` y `sections.hero.rotationSeconds`.
- Se mantienen `utility.message` y `sections.hero.imageUrl` como compatibilidad/fallback.
- La fuente de verdad continúa siendo `siteContent/home`; no cambia Firebase ni el storage en cPanel.


## Utility pages v85
- `buscar.html`: búsqueda sobre contenido público actual de `siteContent/home`, con fallback local.
- `bolsa.html`: bolsa persistente en `localStorage` (`nautica_cart_v1`) y API global `window.NauticaCart` para futuras páginas de producto.
- Perfil: muestra modal `Coming soon`; todavía no existe una página de cuenta.


## v90 Products / Product pages

`productos.html` and `producto.html` read an optional catalog from the existing public document `siteContent/home`, under `sections.catalog.items`. No new Firestore collection or rules are required. If the catalog is absent, the pages show an empty state. Expected optional item fields: `id`, `name`, `category`, `categoryLabel`, `price`, `compareAtPrice`, `imageUrl`, `images`, `description`, `material`, `dimensions`, `sku`, `available`, `variant`, `enabled`.


## v93 navegación
- La Home no marca Productos por defecto.
- Nosotros, Tiendas, Inspiración y Contacto se marcan según la sección visible.
- Productos navega a `productos.html`; en móvil también es enlace directo.

## v95 – filtros de catálogo

- Las cards de categorías del Home siempre navegan a `productos.html?categoria=...`; un link legacy guardado en CMS ya no puede devolverlas a `#colecciones`.
- `productos.html` resuelve aliases Indoor/Interior, Outdoor/Exterior, Bedroom/Habitación, Sanitary/Baño, Decor/Decoración y Lighting/Iluminación.
- Las categorías y subcategorías se construyen dinámicamente con `displayCategory` / `displaySubcategory`, por lo que respetan overrides editoriales sin inventar taxonomía.
- Al seleccionar una categoría se despliega su menú de subcategorías, incluyendo `Todo`.
- Si la categoría/subcategoría seleccionada no tiene productos visibles, se muestra `No hay productos disponibles.`.

## v96 product detail UI
- `producto.html` now follows the Casa Glick product-detail information hierarchy (breadcrumb, large gallery, sticky information sheet, mobile information tabs) while retaining Nautica Home typography, colors, header/footer, ERP catalog and cart integration.
- Product category active filters use the Nautica navy rectangle with white text.

## v97 storefront UX
- Productos renders a visual skeleton grid while Segel ERP + Firestore overrides load.
- Producto follows the Casa Glick information hierarchy (gallery, code, title, description, color when available, materials, measures, price/stock, add-to-bag) while retaining Nautica styling and ERP/Firebase catalog logic.
- Removed the redundant SKU/category metadata block below product information.
- Home sections use soft CSS scroll snapping so major sections settle cleanly beneath the sticky navigation.


## v98 Producto gallery
La galeria de producto consume todas las imagenes expuestas por el ERP (arrays/objetos comunes como images, imagenes, gallery, galeria, fotos y media), ademas de imagenes de variantes. La imagen editorial override sigue teniendo prioridad visual.


## v99 navigation refinements
- Productos usa navegación de categorías estilo navbar con subcategorías desplegables derivadas del catálogo real.
- El CTA de Nosotros apunta de forma fija a `productos.html`.
- La Home usa navegación vertical por gesto para asentar la siguiente/anterior sección en desktop y móvil.


## v100 – navegación de catálogo

- El menú Productos del navbar incluye `Todo` antes de las categorías.
- Los nombres dinámicos de categorías y subcategorías en `productos.html` se normalizan visualmente a capitalización editorial (por ejemplo `Interior`, no `INTERIOR`) sin modificar los valores reales usados para filtrar el catálogo.


## v102
- Product detail color is rendered as a visual swatch, with ERP hex when available and a neutral/common-color fallback otherwise.
- Numeric ERP availability is displayed next to price.
- Global WhatsApp floating shortcut added across public pages and remains compatible with `globalSettings.whatsappUrl`.

## v105 Checkout regional
- CDMX CP 01000-16999 and Estado de Mexico CP 50000-57999 use hosted Stripe Checkout.
- Other Mexican postal codes continue by WhatsApp for shipping quotation.
- Stripe secret stays outside public_html in private/nautica-home.php; see private-config.example.php.
- The checkout backend re-reads Segel ERP and public catalogProductOverrides before creating Stripe line items; browser prices are not trusted.

## v106 · WhatsApp configurable

La web prioriza `siteContent/home.globalSettings.whatsappNumber`. Se normaliza a dígitos y se usa como `https://wa.me/NUMERO`.

Compatibilidad: si el campo no existe, usa `globalSettings.whatsappUrl`; si tampoco existe, el fallback es `525581297704`.
