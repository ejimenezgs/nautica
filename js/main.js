/*
 * Nautica Home front-end
 * El contenido marcado con data-cms-* queda preparado para sustituirse
 * después por la API/panel de Nautica Home sin cambiar la estructura visual.
 */

const slider = document.querySelector('.hero-slider');
const slides = slider ? Array.from(slider.querySelectorAll('[data-hero-slide]')) : [];
const dotsContainer = slider ? slider.querySelector('.hero-dots') : null;

function setActiveHero(index) {
  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle('is-active', slideIndex === index);
  });

  if (dotsContainer) {
    dotsContainer.querySelectorAll('.dot').forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === index);
    });
  }
}

if (dotsContainer && slides.length > 1) {
  dotsContainer.hidden = false;

  slides.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.className = `dot${index === 0 ? ' is-active' : ''}`;
    dot.type = 'button';
    dot.setAttribute('aria-label', `Hero ${index + 1}`);
    dot.addEventListener('click', () => setActiveHero(index));
    dotsContainer.appendChild(dot);
  });
} else if (dotsContainer) {
  dotsContainer.hidden = true;
}

const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');
const mobileCollections = document.querySelector('.mobile-collections');
const mobileSubmenu = document.querySelector('.mobile-submenu');

function closeMobileSubmenu() {
  if (!mobileCollections || !mobileSubmenu) return;
  mobileCollections.setAttribute('aria-expanded', 'false');
  mobileSubmenu.hidden = true;
}

function closeMobileMenu() {
  if (!menuToggle || !mobileNav) return;
  menuToggle.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Abrir menú');
  mobileNav.hidden = true;
  closeMobileSubmenu();
}

if (mobileCollections && mobileSubmenu) {
  mobileCollections.addEventListener('click', () => {
    const willOpen = mobileSubmenu.hidden;
    mobileSubmenu.hidden = !willOpen;
    mobileCollections.setAttribute('aria-expanded', String(willOpen));
  });
}

if (menuToggle && mobileNav) {
  menuToggle.addEventListener('click', () => {
    const willOpen = mobileNav.hidden;
    mobileNav.hidden = !willOpen;
    menuToggle.classList.toggle('is-open', willOpen);
    menuToggle.setAttribute('aria-expanded', String(willOpen));
    menuToggle.setAttribute('aria-label', willOpen ? 'Cerrar menú' : 'Abrir menú');
    if (!willOpen) closeMobileSubmenu();
  });

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMobileMenu);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeMobileMenu();
  });
}


// Section reveal: visible while inside the viewport, hidden again after leaving.
const revealSections = document.querySelectorAll('.reveal-section');

if ('IntersectionObserver' in window && revealSections.length) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('is-visible', entry.isIntersecting);
    });
  }, {
    threshold: 0.18,
    rootMargin: '-4% 0px -4% 0px'
  });

  revealSections.forEach((section) => revealObserver.observe(section));
} else {
  revealSections.forEach((section) => section.classList.add('is-visible'));
}




// Inspiration mosaic: mobile pagination by two-image column.
const inspirationGallery = document.querySelector('.inspiration-gallery');
const inspirationDots = document.querySelector('.inspiration-dots');
const inspirationColumns = inspirationGallery ? Array.from(inspirationGallery.querySelectorAll('[data-inspiration-column]')) : [];

function setActiveInspirationDot(index) {
  if (!inspirationDots) return;
  inspirationDots.querySelectorAll('.inspiration-dot').forEach((dot, dotIndex) => {
    dot.classList.toggle('is-active', dotIndex === index);
  });
}

function buildInspirationDots() {
  if (!inspirationDots || !inspirationColumns.length || inspirationDots.childElementCount) return;
  inspirationColumns.forEach((column, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `inspiration-dot${index === 0 ? ' is-active' : ''}`;
    dot.setAttribute('aria-label', `Grupo de inspiración ${index + 1}`);
    dot.addEventListener('click', () => {
      inspirationGallery.scrollTo({ left: column.offsetLeft - 28, behavior: 'smooth' });
    });
    inspirationDots.appendChild(dot);
  });
}

function updateInspirationDots() {
  if (!inspirationGallery || !inspirationColumns.length || window.innerWidth > 760) return;
  const galleryLeft = inspirationGallery.scrollLeft + 28;
  let nearestIndex = 0;
  let nearestDistance = Infinity;
  inspirationColumns.forEach((column, index) => {
    const distance = Math.abs(column.offsetLeft - galleryLeft);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  setActiveInspirationDot(nearestIndex);
}

buildInspirationDots();
if (inspirationGallery) {
  inspirationGallery.addEventListener('scroll', updateInspirationDots, { passive: true });
}
window.addEventListener('resize', updateInspirationDots);


// Header: transparent over the top of the page, filled after scrolling.
const siteHeader = document.querySelector('.site-header');

function updateHeaderState() {
  if (!siteHeader) return;
  siteHeader.classList.toggle('is-scrolled', window.scrollY > 8);
}

updateHeaderState();
window.addEventListener('scroll', updateHeaderState, { passive: true });

// Keep the mobile menu on a solid background while it is open.
if (menuToggle && siteHeader) {
  const headerMenuObserver = new MutationObserver(() => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    siteHeader.classList.toggle('is-menu-open', expanded);
  });
  headerMenuObserver.observe(menuToggle, { attributes: true, attributeFilter: ['aria-expanded'] });
}


// Newsletter local validation placeholder. Backend connection will be added with the panel/API.
const newsletterForm = document.querySelector('.newsletter-form');
const newsletterEmail = document.querySelector('#newsletter-email');
const newsletterStatus = document.querySelector('.newsletter-status');

if (newsletterForm && newsletterEmail && newsletterStatus) {
  newsletterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = newsletterEmail.value.trim();

    if (!email || !newsletterEmail.checkValidity()) {
      newsletterStatus.textContent = 'Ingresa un correo electrónico válido.';
      newsletterEmail.focus();
      return;
    }

    newsletterStatus.textContent = 'Gracias. Tu correo quedó listo para suscribirse.';
  });
}


// Contact form local validation placeholder; ready for backend/API integration.
const contactForm = document.querySelector('.contact-form');
const contactStatus = document.querySelector('.contact-status');

if (contactForm && contactStatus) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(contactForm);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const message = String(formData.get('message') || '').trim();
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!name || !emailIsValid || !message) {
      contactStatus.textContent = 'Completa nombre, correo válido y mensaje.';
      return;
    }

    contactStatus.textContent = 'Mensaje listo para enviarse.';
  });
}


// v93: section-aware desktop navigation.
// Home starts with no selected item. Productos is a real page link;
// section items become active only while their section is being viewed.
const desktopNavItems = Array.from(document.querySelectorAll('.site-header > .main-nav .nav-item'));
const sectionNavItems = desktopNavItems.filter((item) => item.dataset.navSection);

function clearDesktopNavSelection() {
  desktopNavItems.forEach((item) => item.classList.remove('is-active'));
}

function updateDesktopNavFromScroll() {
  if (!sectionNavItems.length) return;

  const headerHeight = siteHeader ? siteHeader.getBoundingClientRect().height : 0;
  const probeY = headerHeight + Math.max(90, window.innerHeight * 0.28);
  let activeItem = null;

  sectionNavItems.forEach((item) => {
    const section = document.getElementById(item.dataset.navSection);
    if (!section || section.hidden) return;
    const rect = section.getBoundingClientRect();
    if (rect.top <= probeY && rect.bottom > probeY) activeItem = item;
  });

  clearDesktopNavSelection();
  if (activeItem) activeItem.classList.add('is-active');
}

sectionNavItems.forEach((item) => {
  const link = item.querySelector('.nav-link');
  if (!link) return;
  link.addEventListener('click', () => {
    clearDesktopNavSelection();
    item.classList.add('is-active');
  });
});

window.addEventListener('scroll', updateDesktopNavFromScroll, { passive: true });
window.addEventListener('resize', updateDesktopNavFromScroll);
window.addEventListener('load', updateDesktopNavFromScroll);
updateDesktopNavFromScroll();

const categoryViewport = document.querySelector('#category-strip-viewport');
const categoryTrack = document.querySelector('.category-strip__track');
const categoryCards = categoryTrack ? Array.from(categoryTrack.querySelectorAll('.category-card')) : [];
const categoryPrev = document.querySelector('.category-strip__arrow--prev');
const categoryNext = document.querySelector('.category-strip__arrow--next');

function getCategoryCardStep() {
  if (!categoryCards.length) return 0;
  const first = categoryCards[0];
  const second = categoryCards[1];
  if (!second) return first.getBoundingClientRect().width;
  return second.offsetLeft - first.offsetLeft;
}

function updateCategoryArrowState() {
  if (!categoryViewport || !categoryPrev || !categoryNext) return;
  const maxScroll = Math.max(0, categoryViewport.scrollWidth - categoryViewport.clientWidth - 2);
  categoryPrev.disabled = categoryViewport.scrollLeft <= 2;
  categoryNext.disabled = categoryViewport.scrollLeft >= maxScroll;
}

function scrollCategoryTrack(direction) {
  if (!categoryViewport) return;
  const step = getCategoryCardStep();
  if (!step) return;
  categoryViewport.scrollBy({ left: step * direction, behavior: 'smooth' });
}

if (categoryPrev) {
  categoryPrev.addEventListener('click', () => scrollCategoryTrack(-1));
}
if (categoryNext) {
  categoryNext.addEventListener('click', () => scrollCategoryTrack(1));
}
if (categoryViewport) {
  categoryViewport.addEventListener('scroll', updateCategoryArrowState, { passive: true });
  window.addEventListener('resize', updateCategoryArrowState);
  setTimeout(updateCategoryArrowState, 0);
}
categoryCards.forEach((card) => {
  card.addEventListener('click', () => {
    categoryCards.forEach((item) => item.classList.remove('is-active'));
    card.classList.add('is-active');
  });
});

// v72: keep the desktop category carousel vertically centered in the
// remaining visible space below the hero. Mobile keeps the approved 75/25 split.
function updateDesktopCategoryZoneHeight() {
  const categoryStrip = document.querySelector('.category-strip');
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero-slider');
  const firstCard = document.querySelector('.category-card');

  if (!categoryStrip || !header || !hero) return;

  if (window.matchMedia('(max-width: 760px)').matches) {
    categoryStrip.style.removeProperty('min-height');
    return;
  }

  const headerHeight = header.getBoundingClientRect().height;
  const heroHeight = hero.getBoundingClientRect().height;
  const cardHeight = firstCard ? firstCard.getBoundingClientRect().height : 0;
  const minimumComfortHeight = Math.max(208, cardHeight + 48);
  const remainingViewport = window.innerHeight - headerHeight - heroHeight;
  const targetHeight = Math.max(minimumComfortHeight, remainingViewport);

  categoryStrip.style.minHeight = `${Math.round(targetHeight)}px`;
}

updateDesktopCategoryZoneHeight();
window.addEventListener('load', updateDesktopCategoryZoneHeight);
window.addEventListener('resize', updateDesktopCategoryZoneHeight, { passive: true });


// v90 Inspiration infinite loop: duplicate the existing columns after CMS has
// had a chance to hydrate their images, then wrap scroll position seamlessly.
function initInspirationInfiniteLoop() {
  const gallery = document.querySelector('.inspiration-gallery');
  if (!gallery || gallery.dataset.loopReady === '1') return;
  const originals = Array.from(gallery.querySelectorAll('[data-inspiration-column]:not(.cms-empty-column)'));
  if (originals.length < 2) return;

  originals.forEach((column) => {
    const clone = column.cloneNode(true);
    clone.removeAttribute('data-inspiration-column');
    clone.dataset.inspirationClone = '1';
    clone.setAttribute('aria-hidden', 'true');
    gallery.appendChild(clone);
  });

  gallery.dataset.loopReady = '1';
  let paused = false;
  let timer = null;

  const firstClone = gallery.querySelector('[data-inspiration-clone]');
  const getLoopWidth = () => firstClone ? firstClone.offsetLeft - originals[0].offsetLeft : 0;
  const getStep = () => {
    const first = originals[0];
    const second = originals[1];
    return second ? second.offsetLeft - first.offsetLeft : first.getBoundingClientRect().width;
  };

  const normalize = () => {
    const loopWidth = getLoopWidth();
    if (!loopWidth) return;
    if (gallery.scrollLeft >= loopWidth - 2) gallery.scrollLeft -= loopWidth;
  };

  const advance = () => {
    if (paused || document.hidden) return;
    normalize();
    const step = getStep();
    if (!step) return;
    gallery.scrollBy({ left: step, behavior: 'smooth' });
    window.setTimeout(normalize, 650);
  };

  const start = () => {
    if (timer) clearInterval(timer);
    timer = setInterval(advance, 3200);
  };

  gallery.addEventListener('mouseenter', () => { paused = true; });
  gallery.addEventListener('mouseleave', () => { paused = false; });
  gallery.addEventListener('touchstart', () => { paused = true; }, { passive: true });
  gallery.addEventListener('touchend', () => { paused = false; window.setTimeout(normalize, 100); }, { passive: true });
  gallery.addEventListener('scroll', () => { if (!gallery.matches(':hover')) window.setTimeout(normalize, 180); }, { passive: true });
  window.addEventListener('resize', normalize, { passive: true });
  start();
}

window.NauticaInitInspirationLoop = initInspirationInfiniteLoop;

function scheduleInspirationInfiniteLoop() {
  const start = () => window.setTimeout(initInspirationInfiniteLoop, 120);
  if (document.documentElement.dataset.cmsReady) { start(); return; }
  const observer = new MutationObserver(() => {
    if (!document.documentElement.dataset.cmsReady) return;
    observer.disconnect();
    start();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-cms-ready'] });
  // Fallback for pages/environments where the CMS module is unavailable.
  window.setTimeout(() => { observer.disconnect(); initInspirationInfiniteLoop(); }, 2200);
}
window.addEventListener('load', scheduleInspirationInfiniteLoop);
