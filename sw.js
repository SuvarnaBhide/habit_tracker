self.addEventListener("install", event => {
    event.waitUntil(
        caches.open("hello-cache").then(cache => {
            return cache.addAll([
                "/",
                "/index.html",
                "/manifest.json"
            ]);
        })
    );
});