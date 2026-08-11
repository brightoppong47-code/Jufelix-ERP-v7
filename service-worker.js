/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   PWA SERVICE WORKER
========================================== */

const CACHE_NAME = "jufelix-erp-v7-cache-v2";

const CORE_FILES = [
    "./",
    "./index.html",
    "./login.html",
    "./dashboard.html",
    "./inventory.html",
    "./sales.html",
    "./customers.html",
    "./suppliers.html",
    "./purchases.html",
    "./expenses.html",
    "./reports.html",
    "./payments.html",
    "./transfers.html",
    "./pdf-preview.html",
    "./manifest.json",

    "./assets/css/variables.css",
    "./assets/css/base.css",
    "./assets/css/components.css",
    "./assets/css/style.css",

    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png",
    "./assets/icons/icon-maskable-512.png",

    "./js/core/storage.js",
    "./js/core/permissions.js",
    "./js/core/auth-guard.js",
    "./js/core/theme.js",

    "./js/components/sidebar.js",
    "./js/components/topbar.js"
];


/* ==========================================
   INSTALL
========================================== */

self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {

            for (const file of CORE_FILES) {

                try {
                    await cache.add(file);
                } catch (error) {
                    console.warn(
                        "Could not precache:",
                        file,
                        error
                    );
                }

            }

            await self.skipWaiting();
        })
    );

});


/* ==========================================
   ACTIVATE
========================================== */

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys().then(cacheNames => {

            return Promise.all(

                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))

            );

        }).then(() => self.clients.claim())

    );

});


/* ==========================================
   FETCH
========================================== */

self.addEventListener("fetch", event => {

    if (event.request.method !== "GET") {
        return;
    }

    const requestUrl = new URL(event.request.url);

    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    event.respondWith(

        fetch(event.request)

            .then(networkResponse => {

                if (
                    networkResponse &&
                    networkResponse.status === 200
                ) {

                    const responseClone =
                        networkResponse.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {

                            cache.put(
                                event.request,
                                responseClone
                            );

                        });

                }

                return networkResponse;

            })

            .catch(async () => {

                const cachedResponse =
                    await caches.match(event.request);

                if (cachedResponse) {
                    return cachedResponse;
                }

                const accept =
                    event.request.headers.get("accept") || "";

                if (accept.includes("text/html")) {

                    const indexPage =
                        await caches.match("./index.html");

                    if (indexPage) {
                        return indexPage;
                    }

                }

                return new Response(
                    "You are offline and this resource is not cached.",
                    {
                        status: 503,
                        statusText: "Offline",
                        headers: {
                            "Content-Type":
                                "text/plain; charset=utf-8"
                        }
                    }
                );

            })

    );

});
