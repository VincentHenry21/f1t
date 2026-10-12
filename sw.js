/* F1T v12 service worker: offline-first app shell */
const CACHE = "f1t-v12";
const ASSETS = [
  "./", "./index.html", "./manifest.json",
  "./css/tokens.css", "./css/base.css", "./css/components.css", "./css/screens.css",
  "./js/i18n.js", "./js/i18n12.js", "./js/data.js", "./js/icons.js", "./js/store.js", "./js/firebase.js",
  "./js/ui.js", "./js/score.js", "./js/meals.js", "./js/health.js", "./js/stats.js",
  "./js/coach.js", "./js/workout.js", "./js/report.js", "./js/anatomy.js",
  "./js/auth.js", "./js/app.js",
  "./assets/fonts/f1t-brand.woff2",
  "./assets/icons/icon-192.png", "./assets/icons/icon-512.png",
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone();
    /* never cache error pages: a 404 cached as CSS/JS breaks the app */
    if(res.ok && new URL(e.request.url).origin === location.origin)
      caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match("./index.html"))));
});
