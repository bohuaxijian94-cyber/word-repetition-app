import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) =>
      e.isDirectory() ? files(`${dir}/${e.name}`) : `${dir}/${e.name}`,
    ),
  );
  return nested.flat();
}
const paths = (await files("dist")).filter((p) => !p.endsWith("/sw.js"));
const hash = createHash("sha256");
for (const path of paths) hash.update(await readFile(path));
const cache = "mon-francais-" + hash.digest("hex").slice(0, 16);
const base = process.env.VITE_BASE_PATH || "/";
if (!base.startsWith("/") || !base.endsWith("/"))
  throw new Error("VITE_BASE_PATH must start and end with /");
const urls = paths.map((p) => base + p.slice(5));
await writeFile(
  "dist/sw.js",
  `const CACHE=${JSON.stringify(cache)};const ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('mon-francais-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window'}).then(windows=>{const match=windows.find(w=>new URL(w.url).pathname.startsWith(${JSON.stringify(base)}));return match?match.focus():clients.openWindow(${JSON.stringify(base)});}));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request,{ignoreVary:true})).then(cached=>cached||fetch(event.request).catch(()=>event.request.mode==='navigate'?caches.match(${JSON.stringify(base + "index.html")}):Response.error())));});
`,
);
console.log("Offline cache generated:", urls.length, "assets");
