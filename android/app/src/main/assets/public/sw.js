// PWABuilder Workbox Offline Service Worker
const CACHE = "pwabuilder-offline-v1";
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/launchericon-48x48.png',
        '/launchericon-72x72.png',
        '/launchericon-96x96.png',
        '/launchericon-144x144.png',
        '/launchericon-192x192.png',
        '/launchericon-512x512.png',
        '/icon-192.png',
        '/icon-512.png',
        '/maskable-icon-512.png',
        '/icon.svg'
      ]);
    })
  );
  self.skipWaiting();
});

if (typeof workbox !== 'undefined' && workbox.navigationPreload && workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

if (typeof workbox !== 'undefined') {
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image' || request.destination === 'script' || request.destination === 'style' || request.destination === 'font',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: CACHE
    })
  );
}

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResp = await event.preloadResponse;
        if (preloadResp) {
          return preloadResp;
        }
        const networkResp = await fetch(event.request);
        return networkResp;
      } catch (error) {
        const cache = await caches.open(CACHE);
        const cachedResp = await cache.match('/index.html') || await cache.match('/');
        return cachedResp;
      }
    })());
  }
});
