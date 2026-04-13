// Minimal Service Worker to pass Chrome's PWA install criteria
self.addEventListener('install', (e) => {
    e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    // Just a basic pass-through
    // Since this is a Next.js static export + Firestore, caching strategy can be complex,
    // so we rely on standard browser cache and Firestore's offline persistence.
    e.respondWith(fetch(e.request));
});
