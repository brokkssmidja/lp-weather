const C='lpw-v2',FILES=['./','index.html','app.js','forecast.js','manifest.json','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!=='lpw-api').map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
 if(u.hostname==='api.weather.gov'){e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open('lpw-api').then(c=>c.put(e.request,cp));}return r;}).catch(()=>caches.match(e.request).then(m=>m||Response.error())));return;}
 if(u.origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request)));});
