/* Bollywood Radio · Vista Hub — service worker */
const CACHE = 'vh-radio-v4';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // Never touch live audio streams or ad requests — let the network handle them directly
  const bypass =
    u.hostname.indexOf('zeno.fm') > -1 || e.request.destination === 'audio' ||
    u.hostname.indexOf('googlesyndication') > -1 || u.hostname.indexOf('doubleclick') > -1 ||
    u.hostname.indexOf('googleadservices') > -1 || u.hostname.indexOf('adtrafficquality') > -1 ||
    u.hostname === 'google.com' || u.hostname.indexOf('.google.com') > -1;
  if (bypass) return;

  // App shell: cache-first; network fallback; offline -> cached index only for page navigations
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (e.request.method === 'GET' && res && res.ok && u.origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => e.request.mode === 'navigate' ? caches.match('./index.html') : new Response('', { status: 504 })))
  );
});
