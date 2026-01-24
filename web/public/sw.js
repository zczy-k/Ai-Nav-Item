const CACHE_NAME = 'con-nav-item-v3';
const RUNTIME_CACHE = 'con-nav-runtime-v3';
const ICON_CACHE = 'con-nav-icons-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

const ICON_PATTERNS = [
  '/api/icon',
  'api.xinac.net/icon',
  'www.google.com/s2/favicons',
  'icon.horse/icon',
  'favicon.im',
  'api.afmax.cn'
];

function isIconRequest(url) {
  return ICON_PATTERNS.some(pattern => url.includes(pattern));
}

// 安装事件 - 预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => 
            cacheName !== CACHE_NAME && 
            cacheName !== RUNTIME_CACHE && 
            cacheName !== ICON_CACHE
          )
          .map(cacheName => {
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch 事件 - 网络优先策略（导航站需要最新数据）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.protocol === 'chrome-extension:') {
    return;
  }

  if (isIconRequest(request.url)) {
    event.respondWith(
      caches.open(ICON_CACHE).then(cache => {
        return cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            return new Response('', { status: 404 });
          });
        });
      })
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          return response;
        })
        .catch(() => {
          return new Response(JSON.stringify({ error: '网络连接失败，请检查网络' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.open(RUNTIME_CACHE).then(cache => {
      return cache.match(request).then(cachedResponse => {
        const fetchPromise = fetch(request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          return cachedResponse;
        });

        return cachedResponse || fetchPromise;
      });
    })
  );
});

// 消息事件 - 支持手动更新
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
