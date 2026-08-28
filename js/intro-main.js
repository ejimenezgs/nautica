(() => {
  const video = document.getElementById('heroVideo');
  const landingView = document.getElementById('landingView');
  const newsletterView = document.getElementById('newsletterView');
  const registerButton = document.getElementById('registerButton');
  const newsletterClose = document.getElementById('newsletterClose');
  const newsletterForm = document.getElementById('newsletterForm');
  const newsletterEmail = document.getElementById('newsletterEmail');
  const newsletterStatus = document.getElementById('newsletterStatus');
  const cookieBanner = document.getElementById('cookieBanner');
  const cookieAccept = document.getElementById('cookieAccept');

  if (video) {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = false;

    const tryPlay = () => {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
    };

    // Native HTML video looping can briefly expose the element background while
    // the decoder seeks from the final frame back to frame 0. Rewind a fraction
    // before the actual end instead, so the visible frame never disappears.
    const LOOP_EARLY_SECONDS = 0.10;
    let loopFrame = 0;

    const seamlessLoop = () => {
      if (
        Number.isFinite(video.duration) &&
        video.duration > LOOP_EARLY_SECONDS &&
        video.currentTime >= video.duration - LOOP_EARLY_SECONDS
      ) {
        video.currentTime = 0;
        if (video.paused) tryPlay();
      }
      loopFrame = window.requestAnimationFrame(seamlessLoop);
    };

    const startVideo = () => {
      tryPlay();
      if (!loopFrame) loopFrame = window.requestAnimationFrame(seamlessLoop);
    };

    if (video.readyState >= 2) startVideo();
    else video.addEventListener('canplay', startVideo, { once: true });

    // Fallback in case a browser still reaches the media ended state.
    video.addEventListener('ended', () => {
      video.currentTime = 0;
      tryPlay();
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && video.paused) tryPlay();
    });
  }

  const openNewsletter = () => {
    landingView?.classList.add('is-hidden');
    newsletterView?.classList.add('is-visible');
    newsletterView?.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => newsletterEmail?.focus(), 420);
  };

  const closeNewsletter = () => {
    newsletterView?.classList.remove('is-visible');
    newsletterView?.setAttribute('aria-hidden', 'true');
    landingView?.classList.remove('is-hidden');
    newsletterStatus.textContent = '';
  };

  registerButton?.addEventListener('click', openNewsletter);
  newsletterClose?.addEventListener('click', closeNewsletter);

  /*
   * TEMPORARY DEVELOPMENT ACCESS
   * Keep this outside the Firebase module so it still works even if the
   * Firebase SDK cannot load or Firestore is temporarily unavailable.
   */
  newsletterForm?.addEventListener('submit', (event) => {
    const normalizedValue = (newsletterEmail?.value || '').trim().toLowerCase();

    if (normalizedValue !== 'nautica') return;

    event.preventDefault();
    event.stopImmediatePropagation();

    newsletterStatus.textContent = '';
    newsletterForm.reset();

    try {
      sessionStorage.setItem('nautica_dev_access_v1', '1');
    } catch (_) {}

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'nautica-enter' }, '*');
    } else if (typeof window.nauticaEnterLanding === 'function') {
      window.nauticaEnterLanding();
    }
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && newsletterView?.classList.contains('is-visible')) closeNewsletter();
  });

  const cookieKey = 'nautica_cookie_notice_accepted_v1';
  if (cookieBanner && localStorage.getItem(cookieKey) !== '1') cookieBanner.hidden = false;

  cookieAccept?.addEventListener('click', () => {
    localStorage.setItem(cookieKey, '1');
    cookieBanner.hidden = true;
  });
})();

// Parent landing may pause the intro video after the intro fades out to save resources.
window.addEventListener('message', (event) => {
  if (event?.data?.type !== 'nautica-pause-intro-video') return;
  const video = document.getElementById('heroVideo');
  if (video && !video.paused) video.pause();
});
