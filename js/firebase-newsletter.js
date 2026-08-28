import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  doc,
  getFirestore,
  serverTimestamp,
  setDoc
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const form = document.getElementById("newsletterForm");
const emailInput = document.getElementById("newsletterEmail");
const statusElement = document.getElementById("newsletterStatus");
const submitButton = form?.querySelector('.newsletter__submit');

const normalizeEmail = (value) => value.trim().toLowerCase();

const isValidEmail = (value) => {
  if (!emailInput) return false;
  emailInput.value = value;
  return emailInput.checkValidity();
};

const setStatus = (message, state = '') => {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.classList.remove('is-success', 'is-error');
  if (state) statusElement.classList.add(`is-${state}`);
};

const setSubmitting = (isSubmitting) => {
  if (submitButton) submitButton.disabled = isSubmitting;
  if (emailInput) emailInput.disabled = isSubmitting;
};

async function subscribe(normalizedEmail) {
  const subscriberRef = doc(db, "newsletterSubscribers", normalizedEmail);

  try {
    // First attempt: create the complete subscriber record.
    // With the recommended Firestore rules, this succeeds only for a new document.
    await setDoc(subscriberRef, {
      email: normalizedEmail,
      createdAt: serverTimestamp(),
      source: "Landing",
      status: "active"
    });

    return { existed: false };
  } catch (error) {
    // If the document already exists, the public rule intentionally rejects the
    // full overwrite so its original createdAt cannot be replaced. We then make
    // an idempotent, status-only merge. This also reactivates inactive records.
    if (error?.code !== "permission-denied") throw error;

    await setDoc(subscriberRef, { status: "active" }, { merge: true });
    return { existed: true };
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const normalizedEmail = normalizeEmail(emailInput?.value || "");

  // Temporary development access. This is intentionally not an authentication mechanism.
  if (normalizedEmail === "nautica") {
    try {
      sessionStorage.setItem("nautica_dev_access_v1", "1");
    } catch (_) {}

    form.reset();
    setStatus("");

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "nautica-enter" }, "*");
    }

    return;
  }

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    setStatus("Ingresa un correo electrónico válido.", "error");
    emailInput?.focus();
    return;
  }

  setSubmitting(true);
  setStatus("");

  try {
    const result = await subscribe(normalizedEmail);

    if (result.existed) {
      setStatus("Este correo ya está suscrito a nuestro newsletter.", "success");
    } else {
      setStatus("¡Listo! Tu correo quedó registrado correctamente.", "success");
    }

    // Keep the newsletter open after a real email submission so the visitor
    // can read the result directly beneath the input field.
    form.reset();
  } catch (error) {
    console.error("Newsletter subscription failed:", error);
    setStatus("No pudimos registrar tu correo. Inténtalo de nuevo.", "error");
  } finally {
    setSubmitting(false);
  }
});
