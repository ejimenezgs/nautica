(() => {
  const ACCESS_KEY = 'nautica_dev_access_v1';
  const root = document.documentElement;
  const shell = document.getElementById('introShell');
  const frame = document.getElementById('introFrame');

  const hasAccess = () => {
    try {
      return sessionStorage.getItem(ACCESS_KEY) === '1';
    } catch (_) {
      return false;
    }
  };

  const saveAccess = () => {
    try {
      sessionStorage.setItem(ACCESS_KEY, '1');
    } catch (_) {}
  };

  const revealLanding = () => {
    if (!shell || shell.classList.contains('is-leaving')) return;

    saveAccess();
    shell.classList.add('is-leaving');

    window.setTimeout(() => {
      root.classList.remove('intro-pending');
      root.classList.add('intro-passed');

      try {
        frame?.contentWindow?.postMessage({ type: 'nautica-pause-intro-video' }, '*');
      } catch (_) {}

      shell.setAttribute('aria-hidden', 'true');
    }, 520);
  };

  if (hasAccess()) {
    root.classList.remove('intro-pending');
    root.classList.add('intro-passed');
    if (shell) shell.setAttribute('aria-hidden', 'true');
  } else {
    root.classList.add('intro-pending');
  }

  window.addEventListener('message', (event) => {
    if (event?.data?.type === 'nautica-enter') revealLanding();
  });

  // Future ENTER flow can call this same function directly.
  window.nauticaEnterLanding = revealLanding;
})();
