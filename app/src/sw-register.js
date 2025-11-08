if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .catch(async error => {
        const offline = navigator.onLine === false;
        const networkErrorNames = new Set(['AbortError', 'NetworkError']);
        const message = typeof error?.message === 'string' ? error.message : '';
        const isNetworkFailure =
          offline ||
          (typeof error === 'object' && error !== null && networkErrorNames.has(error.name)) ||
          /(?:offline|network)/i.test(message);

        if (isNetworkFailure) {
          console.warn('Service worker registration failed due to network issues; keeping existing worker', error);
          return;
        }

        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        } finally {
          const url = new URL(window.location.href);
          url.searchParams.set('no-sw', Date.now().toString());
          window.location.replace(url.toString());
        }
      });
  });
}
