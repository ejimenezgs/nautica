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
  const hero = document.querySelector('.hero');
  const introLoading = document.getElementById('introLoading');

  const VIDEO_LOAD_TIMEOUT_MS = 15000;
  let videoSettled = false;
  let videoLoadTimer = 0;

  const markVideoReady = () => {
    if (videoSettled) return;
    videoSettled = true;
    if (videoLoadTimer) window.clearTimeout(videoLoadTimer);
    hero?.classList.add('is-video-ready');
    introLoading?.classList.add('is-hidden');
  };

  const enterLandingWithoutIntro = () => {
    if (videoSettled) return;
    videoSettled = true;
    if (videoLoadTimer) window.clearTimeout(videoLoadTimer);

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'nautica-intro-fallback' }, '*');
    } else if (typeof window.nauticaEnterLanding === 'function') {
      window.nauticaEnterLanding();
    }
  };

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

    let playbackStarted = false;

    const revealOnlyAfterPlayback = () => {
      if (playbackStarted || videoSettled) return;
      playbackStarted = true;

      // `playing` fires only when the browser has actually started rendering
      // frames. Keep the black loader above the video until that point so the
      // visitor never sees the video begin buffering after the spinner ends.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(markVideoReady);
      });
    };

    const handlePlayable = () => {
      startVideo();
    };

    video.addEventListener('playing', revealOnlyAfterPlayback);

    // Some WebKit builds can resume playback without dispatching a fresh
    // `playing` event after the first frame. `timeupdate` is a safe secondary
    // confirmation that playback really advanced.
    video.addEventListener('timeupdate', () => {
      if (video.currentTime > 0.02) revealOnlyAfterPlayback();
    });

    if (video.readyState >= 3) handlePlayable();
    else {
      video.addEventListener('canplay', handlePlayable, { once: true });
    }

    // Force the preload request immediately. The loader remains visible until
    // real playback begins, not merely until metadata/one frame is available.
    try { video.load(); } catch (_) {}

    video.addEventListener('error', enterLandingWithoutIntro, { once: true });
    video.addEventListener('abort', enterLandingWithoutIntro, { once: true });

    videoLoadTimer = window.setTimeout(() => {
      if (!videoSettled) enterLandingWithoutIntro();
    }, VIDEO_LOAD_TIMEOUT_MS);

    // Fallback in case a browser still reaches the media ended state.
    video.addEventListener('ended', () => {
      video.currentTime = 0;
      tryPlay();
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && video.paused) tryPlay();
    });
  } else {
    window.setTimeout(enterLandingWithoutIntro, 0);
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
      sessionStorage.setItem('nautica_dev_access_v2', '1');
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
