(() => {
  const app = window.Telegram?.WebApp;
  if (!app?.initData) return;
  app.ready();
  app.expand();
  try {
    app.setHeaderColor('#eefafa');
    app.setBackgroundColor('#eefafa');
  } catch (_) { /* Older Telegram clients retain their own chrome. */ }
  document.documentElement.classList.add('inside-telegram');
})();
