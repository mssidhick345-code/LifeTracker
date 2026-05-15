const CACHE_NAME = "lifetrack-v1";

const urlsToCache = [
  "./",
  "./index.html",
  "./src/styles/base.css",
  "./src/styles/layout.css",
  "./src/styles/planner.css",
  "./src/styles/tasks.css",
  "./src/styles/habits.css",
  "./src/styles/goals.css",
  "./src/styles/dashboard.css",
  "./src/js/app.js"
];

self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching files...");
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});