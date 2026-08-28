(() => {
  const cookieBanner = document.getElementById('cookieBanner');
  const cookieAccept = document.getElementById('cookieAccept');
  const cookieKey = 'nautica_cookie_notice_accepted_v1';

  if (cookieBanner && localStorage.getItem(cookieKey) !== '1') {
    cookieBanner.hidden = false;
  }

  cookieAccept?.addEventListener('click', () => {
    localStorage.setItem(cookieKey, '1');
    cookieBanner.hidden = true;
  });
})();
