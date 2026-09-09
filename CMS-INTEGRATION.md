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
