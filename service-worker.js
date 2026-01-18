const CACHE_NAME = 'smart-agricola-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://dkozrkzoghhylgvddkze.supabase.co/storage/v1/object/public/SMART%20CALDA/LOGO.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

// Instalação: Cache dos arquivos estáticos essenciais (Shell da aplicação)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Força o SW a ativar imediatamente
  self.skipWaiting();
});

// Ativação: Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Garante que o SW controle todas as abas abertas imediatamente
  return self.clients.claim();
});

// Interceptação de Requisições (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Estratégia Network Only para APIs (Supabase, Cloud Functions)
  // Não queremos cachear dados da planilha ou chamadas de envio de email
  // Nota: O logo do Supabase está em ASSETS_TO_CACHE, então ele será pego pelo cache first abaixo se a URL corresponder
  if ((url.href.includes('supabase.co') && !url.href.includes('LOGO.png')) || url.href.includes('cloudfunctions.net')) {
    return;
  }

  // 2. Estratégia Stale-While-Revalidate para o restante
  // Tenta servir do cache primeiro, mas atualiza o cache em background se houver rede
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Se tiver no cache, retorna ele
      if (cachedResponse) {
        // Opcional: Atualizar o cache em background (Stale-while-revalidate)
        // Isso garante que na próxima visita o usuário tenha a versão mais nova
        fetch(event.request).then((networkResponse) => {
           if(networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => {
                 cache.put(event.request, networkResponse.clone());
              });
           }
        }).catch(() => { /* Falha silenciosa na atualização em background */ });

        return cachedResponse;
      }

      // Se não tiver no cache, busca na rede
      return fetch(event.request).then((response) => {
        // Verifica se a resposta é válida
        if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
          return response;
        }

        // Clona a resposta para salvar no cache
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});