/* F1T service worker · cache-first app shell */
const CACHE = "f1t-v9.4";
const SHELL = ["./","./index.html","./manifest.webmanifest","./css/style.css",
  "./js/i18n.js","./js/data.js","./js/icons.js","./js/analysis.js","./js/coach.js","./js/workout.js","./js/env.js","./js/firebase.js","./js/app.js"];
self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener("fetch", e=>{
  if(e.request.method!=="GET") return;
  e.respondWith(caches.match(e.request).then(hit=>hit || fetch(e.request).then(res=>{
    const copy=res.clone();
    if(new URL(e.request.url).origin===location.origin) caches.open(CACHE).then(c=>c.put(e.request,copy));
    return res;
  }).catch(()=>caches.match("./index.html"))));
});
