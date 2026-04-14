/**
 * Mancala Service Worker
 * Enables offline play and PWA installability.
 */

const CACHE_NAME = 'mancala-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/game.js',
  './js/ai.js',
  './js/ui.js',
  './manifest.json',
  './icons/icon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&f[]=satoshi@400,500,700&display=swap',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache what we can — font CDN may fail, that's ok
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => cached);
    })
  );
});
