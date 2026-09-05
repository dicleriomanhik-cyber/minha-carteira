import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Esta app já teve uma versão anterior, sem build, com um service-worker.js
// próprio ("minha-carteira-v2") que guardava a página em cache para sempre.
// Quem instalou essa versão antes desta migração para Vite fica com esse
// service worker antigo a controlar o telemóvel indefinidamente — ele nunca
// se substitui sozinho. Por isso, antes de registar o novo, procuramos e
// removemos qualquer registo/cache que não pertença à versão actual.
async function limparVersaoAntiga() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registos = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registos
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || '';
          return url && !url.endsWith('/sw.js');
        })
        .map((r) => r.unregister())
    );
    if ('caches' in window) {
      const nomes = await caches.keys();
      await Promise.all(
        nomes
          .filter((n) => n !== 'google-fonts-cache' && !n.includes('workbox'))
          .map((n) => caches.delete(n))
      );
    }
  } catch {
    // Não bloqueia o arranque da app se isto falhar por qualquer razão.
  }
}

limparVersaoAntiga().finally(() => {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Verifica a cada minuto se há uma versão nova publicada, mesmo que
      // a pessoa deixe a app aberta o dia inteiro sem a fechar.
      setInterval(() => registration.update(), 60 * 1000);
    },
  });
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
