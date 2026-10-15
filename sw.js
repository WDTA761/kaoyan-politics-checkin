/* 离线缓存
   - 页面（HTML）：网络优先 → 保证永远是最新版；断网时回退到缓存，照样能用
   - 图标等静态资源：缓存优先 → 秒开
*/
const CACHE = 'zz-kaoyan-2027-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest',
                './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isShell(req, url) {
  return req.mode === 'navigate' ||
         (req.headers.get('accept') || '').indexOf('text/html') >= 0 ||
         url.pathname.endsWith('/') ||
         url.pathname.endsWith('.html') ||
         url.pathname.endsWith('.webmanifest');
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (isShell(req, url)) {
    // 网络优先
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(url.pathname === '/' ? './index.html' : req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // 静态资源：缓存优先
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
