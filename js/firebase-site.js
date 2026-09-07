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
  const slide = document.querySelector("[data-hero-slide]");
  if (!slide) return;

  if (hero.imageUrl) {
    slide.style.backgroundImage = `url("${hero.imageUrl.replaceAll('"', '%22')}")`;
  }

  const existingVideo = slide.querySelector(".hero-cms-video");
  if (hero.useVideo === true && typeof hero.videoUrl === "string" && hero.videoUrl.trim()) {
    const video = existingVideo || document.createElement("video");
    video.className = "hero-cms-video";
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
    if (!existingVideo) slide.prepend(video);
    if (video.src !== hero.videoUrl) video.src = hero.videoUrl;
    video.play().catch(() => {});
  } else if (existingVideo) {
    existingVideo.pause();
    existingVideo.remove();
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
    if (image && typeof item.imageUrl === "string" && item.imageUrl.trim()) {
      image.style.backgroundImage = `url("${item.imageUrl.replaceAll('"', '%22')}")`;
      image.classList.add("has-cms-image");
    }
    if (item.link) card.href = safeHref(item.link, card.getAttribute("href") || "#colecciones");
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
  if (cta && about.ctaHref) cta.href = safeHref(about.ctaHref, cta.href);
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
  const cards = Array.from(document.querySelectorAll(".inspiration-card"));
  inspiration.items.forEach((item, index) => {
    const card = cards[index];
    if (!card || !item) return;
    card.classList.toggle("cms-disabled", item.enabled === false);
    const media = card.querySelector(".inspiration-placeholder");
    if (media && item.imageUrl) {
      media.style.backgroundImage = `url("${item.imageUrl.replaceAll('"', '%22')}")`;
      media.classList.add("has-cms-image");
    }
  });
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
  setText("[data-cms-text='home.utility.message']", utility.message);
  setText(".utility-contact", utility.contactLabel);
  setText(".footer-bottom p", footer.copyright);

  const socialMap = {
    facebookUrl: "Facebook",
    instagramUrl: "Instagram",
    whatsappUrl: "WhatsApp"
  };
  Object.entries(socialMap).forEach(([field, label]) => {
    const value = globalSettings[field];
    if (!value) return;
    document.querySelectorAll(`a[aria-label='${label}']`).forEach((link) => {
      link.href = safeHref(value, link.href);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });
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
    applyContent(snapshot.data());
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
