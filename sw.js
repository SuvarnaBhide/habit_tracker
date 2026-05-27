const CACHE_NAME = "habit-tracker-v1";

const urlsToCache = [
    "/habit_tracker/",
    "/habit_tracker/index.html",
    "/habit_tracker/styles.css",
    "/habit_tracker/app.js",
    "/habit_tracker/manifest.json"
];

self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );

    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );

    self.clients.claim();
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request)
                    .then(networkResponse => {
                        return caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(
                                    event.request,
                                    networkResponse.clone()
                                );
                                return networkResponse;
                            });
                    });
            })
    );
});