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
