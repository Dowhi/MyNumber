const CACHE_NAME = 'number-match-v17';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
// NOTA: style.css y game.js NO se precachean aquí porque tienen ?v= en la URL
// Se cachean dinámicamente en el fetch

// Install: cachear solo los assets base
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // activar inmediatamente sin esperar
  );
});

// Activate: eliminar TODOS los caches viejos y tomar control
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[SW] Eliminando caché viejo:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim()) // tomar control de todas las pestañas
  );
});

// Fetch: Network first para HTML y archivos con ?v=, Cache first para el resto
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  
  // Para HTML e index → Network first (siempre la versión más reciente)
  const isHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  // Para archivos con versión (?v=) → Network first
  const hasVersion = url.search.includes('v=');

  if (isHTML || hasVersion) {
    // Network first → si falla, caché
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache first → si no está en caché, fetch y guardar
    e.respondWith(
      caches.match(e.request).then((cached) => {
        return cached || fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return networkResponse;
        });
      }).catch(() => caches.match('./index.html'))
    );
  }
});
