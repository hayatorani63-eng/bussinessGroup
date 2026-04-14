/**
 * Attendance Pro — Service Worker
 * Network-First strategy: always fetch fresh from network, fallback to cache offline
 */

const CACHE_NAME = 'attendance-pro-v4';
const STATIC_ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon.svg'
];

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting(); // 即座に新しいSWを有効化
});

// Activate: 古いキャッシュを全て削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // 全クライアントをすぐに新SWで制御
});

// Fetch: Network-First（常にネットワーク優先、オフラインのみキャッシュ）
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 外部リクエスト（GAS、Fontsなど）はSWを介さずそのまま通す
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // ネットワーク成功 → キャッシュを更新してレスポンスを返す
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // オフライン時のみキャッシュにフォールバック
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
