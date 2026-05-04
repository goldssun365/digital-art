/* ══════════════════════════════════════════
   디지털화방 Service Worker
   - 오프라인 지원
   - PWA 설치 가능하게 함
   - 캐시 기반 빠른 로딩
   ══════════════════════════════════════════ */

const CACHE_NAME = 'digital-art-v7.7';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
];

// 설치 시: 핵심 파일들을 캐시에 저장
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 캐시 열림:', CACHE_NAME);
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] 캐시 실패:', err))
  );
});

// 활성화 시: 옛 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] 옛 캐시 삭제:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// 요청 처리: 네트워크 우선, 실패 시 캐시
self.addEventListener('fetch', (event) => {
  // POST 요청 등은 패스
  if (event.request.method !== 'GET') return;

  // 외부 API 요청은 캐시 안 함 (Gemini, Pixabay 등)
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 성공 응답은 캐시에 저장
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 가져오기
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('./index.html');
        });
      })
  );
});
