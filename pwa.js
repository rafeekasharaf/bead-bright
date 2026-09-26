(() => {
  const installButton = document.getElementById('install-app');
  const status = document.getElementById('offline-status');
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let promptEvent;
  installButton.hidden = standalone();
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    promptEvent = event;
    installButton.hidden = standalone();
  });
  window.addEventListener('appinstalled', () => { promptEvent = null; installButton.hidden = true; });
  installButton.addEventListener('click', async () => {
    if (promptEvent) {
      const event = promptEvent;
      promptEvent = null;
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === 'accepted') installButton.hidden = true;
      return;
    }
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    document.getElementById('install-instructions').textContent = ios
      ? 'In Safari or Chrome, tap Share (or the menu, then Share), choose Add to Home Screen, keep Open as Web App turned on if shown, then tap Add.'
      : 'Open your browser menu and choose Install app or Add to Home screen. If neither appears, try this page in Chrome or Edge.';
    document.getElementById('install-help').showModal();
  });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', {updateViaCache: 'none'});
        await navigator.serviceWorker.ready;
        const refreshStatus = () => { status.textContent = navigator.onLine ? 'Ready for offline practice' : 'Offline · Keep practicing'; };
        refreshStatus();
        window.addEventListener('online', refreshStatus);
        window.addEventListener('offline', refreshStatus);
      } catch { status.textContent = 'Offline setup unavailable. You can still practice online.'; }
    });
  }
})();
