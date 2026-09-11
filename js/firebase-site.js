import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp
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

const app = initializeApp(firebaseConfig, "nautica-public-site");
const db = getFirestore(app);
const HOME_DOC = doc(db, "siteContent", "home");
const CONTACT_COLLECTION = "contactMessages";
let utilityRotationTimer = null;
let heroRotationTimer = null;

const setText = (selector, value) => {
  if (typeof value !== "string") return;
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
};

const setImage = (selector, value) => {
  if (typeof value !== "string" || !value.trim()) return;
  const el = document.querySelector(selector);
  if (!el) return;
  if (el.tagName === "IMG") {
    el.src = value;
  } else {
    el.style.backgroundImage = `url("${value.replaceAll('"', '%22')}")`;
  }
};

const safeHref = (value, fallback = "#") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (/^(https?:\/\/|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(trimmed)) return trimmed;
  return fallback;
};

function toggleSection(sectionId, enabled) {
  if (typeof enabled !== "boolean") return;
  const section = document.querySelector(sectionId);
  if (section) section.classList.toggle("cms-disabled", !enabled);

  const id = sectionId.startsWith("#") ? sectionId : `#${sectionId}`;
  document.querySelectorAll(`a[href="${id}"]`).forEach((link) => {
    const navItem = link.closest(".nav-item");
    (navItem || link).classList.toggle("cms-disabled", !enabled);
  });
}

function applyHero(hero = {}) {
  toggleSection(".home-intro", hero.enabled !== false);
  const slider = document.querySelector(".hero-slider");
  const dots = slider?.querySelector(".hero-dots");
  if (!slider) return;
  if (heroRotationTimer) { clearInterval(heroRotationTimer); heroRotationTimer = null; }

  const configured = Array.isArray(hero.banners) && hero.banners.length
    ? hero.banners.filter((item) => item && item.enabled !== false && (item.imageUrl || item.mobileImageUrl))
    : [{ enabled: true, imageUrl: hero.imageUrl || "", mobileImageUrl: hero.mobileImageUrl || "", alt: "Nautica Home" }];
  const banners = configured.length ? configured : [{ imageUrl: hero.imageUrl || "", mobileImageUrl: hero.mobileImageUrl || "", alt: "Nautica Home" }];

  slider.querySelectorAll("[data-hero-slide]").forEach((node) => node.remove());
  banners.forEach((banner, index) => {
    const slide = document.createElement("article");
    slide.className = `hero${index === 0 ? " is-active" : ""}`;
    slide.dataset.heroSlide = "";
    slide.setAttribute("aria-label", banner.alt || `Banner ${index + 1}`);
    const desktop = String(banner.imageUrl || "").trim();
    const mobile = String(banner.mobileImageUrl || desktop).trim();
    if (desktop) slide.style.setProperty("--hero-cms-desktop", `url("${desktop.replaceAll('"', '%22')}")`);
    if (mobile) slide.style.setProperty("--hero-cms-mobile", `url("${mobile.replaceAll('"', '%22')}")`);
    slider.insertBefore(slide, dots || null);
  });

  const slides = Array.from(slider.querySelectorAll("[data-hero-slide]"));
  let activeIndex = 0;
  const activate = (index) => {
    activeIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle("is-active", i === activeIndex));
    dots?.querySelectorAll(".dot").forEach((dot, i) => dot.classList.toggle("is-active", i === activeIndex));
  };

  if (dots) {
    dots.innerHTML = "";
    dots.hidden = slides.length <= 1;
    slides.forEach((_, index) => {
      const dotButton = document.createElement("button");
      dotButton.className = `dot${index === 0 ? " is-active" : ""}`;
      dotButton.type = "button";
      dotButton.setAttribute("aria-label", `Banner ${index + 1}`);
      dotButton.addEventListener("click", () => activate(index));
      dots.appendChild(dotButton);
    });
  }

  if (hero.useVideo === true && typeof hero.videoUrl === "string" && hero.videoUrl.trim() && slides[0]) {
    const video = document.createElement("video");
    video.className = "hero-cms-video";
    video.muted = true; video.defaultMuted = true; video.autoplay = true; video.loop = true; video.playsInline = true; video.preload = "metadata";
    video.src = hero.videoUrl;
    slides[0].prepend(video);
    video.play().catch(() => {});
  }

  if (slides.length > 1) {
    const seconds = Math.min(30, Math.max(3, Number(hero.rotationSeconds) || 6));
    heroRotationTimer = setInterval(() => activate(activeIndex + 1), seconds * 1000);
  }
}

function applyCategories(products = {}) {
  toggleSection("#colecciones", products.enabled !== false);
  if (!Array.isArray(products.items)) return;
  const cards = Array.from(document.querySelectorAll(".category-card"));
  products.items.forEach((item, index) => {
    const card = cards[index];
    if (!card || !item) return;
    card.classList.toggle("cms-disabled", item.enabled === false);
    const label = card.querySelector(".category-card__label");
    if (label && typeof item.label === "string" && item.label.trim()) label.textContent = item.label;
    const image = card.querySelector(".category-card__image");
    if (image) {
      const imageUrl = typeof item.imageUrl === "string" ? item.imageUrl.trim() : "";
      if (imageUrl) {
        // Older layout CSS uses !important background declarations on the category
        // placeholders. Set the CMS image itself as !important so Firestore remains
        // the source of truth and a newly uploaded cPanel asset actually replaces it.
        image.style.setProperty(
          "background-image",
          `url("${imageUrl.replaceAll('"', '%22')}")`,
          "important"
        );
        image.classList.add("has-cms-image");
      } else {
        image.style.removeProperty("background-image");
        image.classList.remove("has-cms-image");
      }
    }
    // Category cards are navigation into the real Productos page. Do not let a
    // legacy CMS link (for example #colecciones) override the catalog route.
    const categoryKey = (card.dataset.category || "").trim();
    if (categoryKey) {
      card.href = `productos.html?categoria=${encodeURIComponent(categoryKey)}`;
    } else if (item.link) {
      card.href = safeHref(item.link, "productos.html");
    }
  });
}

function applyAbout(about = {}) {
  toggleSection("#nosotros", about.enabled !== false);
  setText("[data-cms-text='home.about.kicker']", about.kicker);
  setText("[data-cms-text='home.about.title']", about.title);
  setText("[data-cms-text='home.about.paragraph1']", about.paragraph1);
  setText("[data-cms-text='home.about.paragraph2']", about.paragraph2);
  setText("[data-cms-text='home.about.cta']", about.ctaLabel);
  setImage("[data-cms-image='home.about.image']", about.imageUrl);
  const cta = document.querySelector("[data-cms-text='home.about.cta']");
  // About CTA is a fixed commerce route. Keep CMS text editable, but do not let
  // a legacy anchor/hash override the real Productos page.
  if (cta) cta.href = "productos.html";
}

const retailerKeys = ["bedbath", "sams", "costco", "liverpool", "mercadolibre", "amazon", "homedepot", "cityclub"];
function applyRetailers(retailers = {}) {
  toggleSection("#tiendas", retailers.enabled !== false);
  setText("[data-cms-text='home.retailers.kicker']", retailers.kicker);
  setText("[data-cms-text='home.retailers.title']", retailers.title);
  setText("[data-cms-text='home.retailers.copy']", retailers.copy);
  if (!Array.isArray(retailers.items)) return;
  retailers.items.forEach((item, index) => {
    const key = retailerKeys[index];
    const card = key ? document.querySelector(`[data-cms-item='home.retailers.${key}']`) : null;
    if (!card || !item) return;
    card.classList.toggle("cms-disabled", item.enabled === false);
    const img = card.querySelector("img");
    if (img && item.logoUrl) img.src = item.logoUrl;
    if (item.name) {
      card.setAttribute("aria-label", item.name);
      if (img) img.alt = item.name;
    }
  });
}

function applyInspiration(inspiration = {}) {
  toggleSection("#inspiracion", inspiration.enabled !== false);
  setText("[data-cms-text='home.inspiration.kicker']", inspiration.kicker);
  setText("[data-cms-text='home.inspiration.title']", inspiration.title);
  setText("[data-cms-text='home.inspiration.copy']", inspiration.copy);
  if (!Array.isArray(inspiration.items)) return;

  const gallery = document.querySelector(".inspiration-gallery");
  if (!gallery) return;

  // Remove prior loop clones before rebuilding the active mosaic.
  gallery.querySelectorAll("[data-inspiration-clone]").forEach((node) => node.remove());
  gallery.dataset.loopReady = "0";

  const cards = Array.from(gallery.querySelectorAll(".inspiration-card"));
  const activeItems = inspiration.items.filter((item) =>
    item && item.enabled !== false && typeof item.imageUrl === "string" && item.imageUrl.trim()
  );

  // Compact active images to the front so disabled/empty CMS slots never leave holes.
  cards.forEach((card, index) => {
    const item = activeItems[index];
    const media = card.querySelector(".inspiration-placeholder");
    if (!item) {
      card.classList.add("cms-disabled");
      if (media) {
        media.style.removeProperty("background-image");
        media.classList.remove("has-cms-image");
      }
      return;
    }

    card.classList.remove("cms-disabled");
    if (media) {
      media.style.backgroundImage = `url("${item.imageUrl.trim().replaceAll('"', '%22')}")`;
      media.classList.add("has-cms-image");
    }
  });

  // Hide columns that no longer contain active cards; if a last odd item remains,
  // let that column collapse instead of reserving a blank second slot.
  gallery.querySelectorAll("[data-inspiration-column]").forEach((column) => {
    const visibleCards = Array.from(column.querySelectorAll(".inspiration-card:not(.cms-disabled)"));
    column.classList.toggle("cms-empty-column", visibleCards.length === 0);
    column.classList.toggle("cms-single-item", visibleCards.length === 1);
  });

  // Let the loop initializer rebuild against the compacted active set.
  window.setTimeout(() => {
    if (typeof window.NauticaInitInspirationLoop === "function") {
      window.NauticaInitInspirationLoop();
    }
  }, 60);
}

function applyNewsletter(newsletter = {}) {
  toggleSection("#newsletter", newsletter.enabled !== false);
  setText("[data-cms-text='home.newsletter.kicker']", newsletter.kicker);
  setText("[data-cms-text='home.newsletter.title']", newsletter.title);
  setText("[data-cms-text='home.newsletter.copy']", newsletter.copy);
  setText("[data-cms-text='home.newsletter.legal']", newsletter.legal);
  setImage("[data-cms-image='home.newsletter.image']", newsletter.imageUrl);
}

function applyContact(contact = {}) {
  toggleSection("#contacto", contact.enabled !== false);
  setText("[data-cms-text='home.contact.kicker']", contact.kicker);
  setText("[data-cms-text='home.contact.title']", contact.title);
  setText("[data-cms-text='home.contact.copy']", contact.copy);
}

function applyGlobal(globalSettings = {}, utility = {}, footer = {}) {
  if (utilityRotationTimer) { clearInterval(utilityRotationTimer); utilityRotationTimer = null; }
  const messageEl = document.querySelector("[data-cms-text='home.utility.message']");
  const messages = Array.isArray(utility.messages)
    ? utility.messages.filter((item) => item && item.enabled !== false && typeof item.text === "string" && item.text.trim())
    : [];
  const fallbackMessage = typeof utility.message === "string" ? utility.message : "";
  const activeMessages = messages.length ? messages.map((item) => item.text.trim()) : (fallbackMessage ? [fallbackMessage] : []);
  let messageIndex = 0;
  if (messageEl && activeMessages.length) {
    messageEl.textContent = activeMessages[0];
    if (activeMessages.length > 1) {
      const seconds = Math.min(30, Math.max(2, Number(utility.rotationSeconds) || 5));
      utilityRotationTimer = setInterval(() => {
        messageIndex = (messageIndex + 1) % activeMessages.length;
        messageEl.classList.add("is-changing");
        setTimeout(() => { messageEl.textContent = activeMessages[messageIndex]; messageEl.classList.remove("is-changing"); }, 140);
      }, seconds * 1000);
    }
  }
  setText(".utility-contact", utility.contactLabel);
  setText(".footer-bottom p", footer.copyright);
  const socialMap = { facebookUrl: "Facebook", instagramUrl: "Instagram" };
  Object.entries(socialMap).forEach(([field, label]) => {
    const value = globalSettings[field];
    if (!value) return;
    document.querySelectorAll(`a[aria-label='${label}']`).forEach((link) => {
      link.href = safeHref(value, link.href);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });
  });

  const whatsappNumber = String(globalSettings.whatsappNumber || "").replace(/\D/g, "");
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : safeHref(globalSettings.whatsappUrl, "https://wa.me/525581297704");
  document.querySelectorAll(`a[aria-label='WhatsApp']`).forEach((link) => {
    link.href = whatsappHref;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
}

function applyContent(data = {}) {
  const sections = data.sections || {};
  applyGlobal(data.globalSettings || {}, data.utility || {}, data.footer || {});
  applyHero(sections.hero || {});
  applyCategories(sections.products || {});
  applyAbout(sections.about || {});
  applyRetailers(sections.retailers || {});
  applyInspiration(sections.inspiration || {});
  applyNewsletter(sections.newsletter || {});
  applyContact(sections.contact || {});
  document.documentElement.dataset.cmsReady = "1";
}

onSnapshot(HOME_DOC, (snapshot) => {
  if (!snapshot.exists()) {
    document.documentElement.dataset.cmsReady = "fallback";
    return;
  }
  try {
    const siteContent = snapshot.data();
    window.NauticaSiteContent = siteContent;
    window.dispatchEvent(new CustomEvent("nautica:sitecontent", { detail: siteContent }));
    applyContent(siteContent);
  } catch (error) {
    console.error("Nautica CMS render failed; keeping HTML fallback.", error);
    document.documentElement.dataset.cmsReady = "fallback";
  }
}, (error) => {
  console.error("Nautica CMS unavailable; keeping HTML fallback.", error);
  document.documentElement.dataset.cmsReady = "fallback";
});

const contactForm = document.querySelector(".contact-form");
const contactStatus = document.querySelector(".contact-status");
const contactButton = contactForm?.querySelector(".contact-submit");

if (contactForm && contactStatus) {
  // Runs in capture phase so it replaces the old local placeholder submit handler.
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const formData = new FormData(contactForm);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const phone = String(formData.get("phone") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const emailInput = contactForm.querySelector("[name='email']");

    if (!name || !email || !message || !emailInput?.checkValidity()) {
      contactStatus.textContent = "Completa nombre, correo válido y mensaje.";
      return;
    }

    if (name.length > 120 || email.length > 254 || phone.length > 40 || message.length > 3000) {
      contactStatus.textContent = "Revisa la longitud de los datos ingresados.";
      return;
    }

    if (contactButton) contactButton.disabled = true;
    contactStatus.textContent = "Enviando…";

    try {
      await addDoc(collection(db, CONTACT_COLLECTION), {
        name,
        email,
        phone,
        message,
        source: "nauticahome.com.mx",
        status: "unread",
        createdAt: serverTimestamp()
      });
      contactForm.reset();
      contactStatus.textContent = "Gracias. Recibimos tu mensaje y te contactaremos pronto.";
    } catch (error) {
      console.error("Contact message failed:", error);
      contactStatus.textContent = "No pudimos enviar tu mensaje. Inténtalo de nuevo.";
    } finally {
      if (contactButton) contactButton.disabled = false;
    }
  }, true);
}
