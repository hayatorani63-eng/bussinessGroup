const CACHE_NAME = 'attendance-pro-v1';
const urlsToCache = [
  './index.html',
  './app.js',
  './manifest.json',
  // TailwindのCDN版もキャッシュ対象に含める場合（任意）
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  // インストール時にキャッシュを生成して静的ファイルを保存
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // GETリクエストのみキャッシュを参照し、API等のPOSTはそのままネットワークへ送る
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュがあれば返し、なければネットワークへ（オフライン時はindex.htmlを返すフォールバック）
        return response || fetch(event.request).catch(() => caches.match('./index.html'));
      })
  );
});

self.addEventListener('activate', (event) => {
  // 古いバージョンのキャッシュを削除
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
