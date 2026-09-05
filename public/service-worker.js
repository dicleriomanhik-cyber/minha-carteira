// AUTODESTRUIÇÃO — este ficheiro substitui a versão antiga do service worker
// (a da app estática, antes de existir o build com Vite). Quem ainda tem essa
// versão antiga presa no telemóvel fica com ela a servir sempre a página em
// cache, para sempre, mesmo depois de publicares código novo — porque essa
// versão antiga intercepta TODOS os pedidos antes de irem à rede, incluindo
// o pedido do próprio HTML/JS novo.
//
// O browser verifica periodicamente se este ficheiro mudou, por fora do SW
// activo (é assim que qualquer service worker se actualiza). Ao instalar esta
// versão nova, ela apaga todas as caches antigas, desliga-se a si própria e
// força a página a recarregar já sem nenhum service worker antigo no meio.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes.map((n) => caches.delete(n)));
      await self.registration.unregister();
      const janelas = await self.clients.matchAll({ type: 'window' });
      janelas.forEach((cliente) => cliente.navigate(cliente.url));
    })()
  );
});
