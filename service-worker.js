const CACHE_NAME = "lingxi-paper-horse-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./story-data.js",
  "./visuals.js",
  "./game.js",
  "./manifest.webmanifest",
  "./icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || cache.match("./index.html");
  }
}

async function cachedAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const refresh = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || refresh;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const acceptsHtml = event.request.mode === "navigate" || event.request.headers.get("accept")?.includes("text/html");
  event.respondWith(acceptsHtml ? networkFirst(event.request) : cachedAsset(event.request));
});
