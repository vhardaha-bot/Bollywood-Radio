/* Bollywood Radio · Vista Hub — service worker */
const CACHE = 'vh-radio-v7';
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
  // Never touch live audio streams, ad or analytics requests — straight to network
  const bypass =
    u.hostname.indexOf('zeno.fm') > -1 || e.request.destination === 'audio' ||
    u.hostname.indexOf('googlesyndication') > -1 || u.hostname.indexOf('doubleclick') > -1 ||
    u.hostname.indexOf('googleadservices') > -1 || u.hostname.indexOf('adtrafficquality') > -1 ||
    u.hostname.indexOf('googletagmanager') > -1 || u.hostname.indexOf('google-analytics') > -1 ||
    u.hostname === 'google.com' || u.hostname.indexOf('.google.com') > -1;
  if (bypass) return;

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
// ── VH Notify Push ─────────────────────────────────────
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) {}
  const title = data.title || '🔔 VH Original';
  const options = {
    body:    data.message || '',
    icon:    data.icon    || '/icon-192.png',
    badge:   data.badge   || '/badge-96.png',
    image:   data.image   || undefined,
    data:    { url: data.url || 'https://vhoriginal.com/' },
    vibrate: [200, 100, 200],
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url)
            ? e.notification.data.url : 'https://vhoriginal.com/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url === url && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
