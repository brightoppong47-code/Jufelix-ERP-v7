/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   PRODUCTION PWA SERVICE WORKER

   File:
   service-worker.js

   Version: 3

   + Production cache versioning
   + Removes old caches automatically
   + Network-first HTML
   + Cache-first static assets
   + Offline fallback
   + Safer updates for installed phones
========================================== */


/* ==========================================
   CACHE VERSION
========================================== */

const CACHE_VERSION =
    "v3";


const CACHE_NAME =
    "jufelix-erp-v7-production-" +
    CACHE_VERSION;


/* ==========================================
   CORE FILES
========================================== */

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

    "./branches.html",

    "./users.html",

    "./settings.html",

    "./pdf-preview.html",

    "./manifest.json",


    /* CSS */

    "./assets/css/variables.css",

    "./assets/css/base.css",

    "./assets/css/components.css",

    "./assets/css/style.css",


    /* ICONS */

    "./assets/icons/icon-192.png",

    "./assets/icons/icon-512.png",

    "./assets/icons/icon-maskable-512.png",


    /* CONFIG */

    "./config/app-config.js",

    "./config/firebase-config.js",


    /* CORE */

    "./js/core/storage.js",

    "./js/core/database.js",

    "./js/core/permissions.js",

    "./js/core/auth-guard.js",

    "./js/core/theme.js",

    "./js/core/firebase.js",

    "./js/core/pwa-install.js",


    /* COMPONENTS */

    "./js/components/sidebar.js",

    "./js/components/topbar.js",


    /* APPLICATION */

    "./js/app.js"
];


/* ==========================================
   INSTALL
========================================== */

self.addEventListener(
    "install",
    function (event) {

        console.log(
            "Jufelix ERP Service Worker installing:",
            CACHE_NAME
        );


        event.waitUntil(

            caches
                .open(
                    CACHE_NAME
                )
                .then(
                    async function (
                        cache
                    ) {

                        /*
                         * Cache files one by one.
                         *
                         * One missing optional file
                         * must not break the whole
                         * installation.
                         */

                        for (
                            const file of
                            CORE_FILES
                        ) {

                            try {

                                await cache.add(
                                    file
                                );


                            } catch (
                                error
                            ) {

                                console.warn(
                                    "PWA precache skipped:",
                                    file,
                                    error
                                );
                            }
                        }


                        /*
                         * Activate this service worker
                         * without waiting for older
                         * versions to close.
                         */

                        await self.skipWaiting();


                        console.log(
                            "✅ Jufelix ERP core files cached."
                        );
                    }
                )
        );
    }
);


/* ==========================================
   ACTIVATE
========================================== */

self.addEventListener(
    "activate",
    function (event) {

        console.log(
            "Jufelix ERP Service Worker activating:",
            CACHE_NAME
        );


        event.waitUntil(

            caches
                .keys()
                .then(
                    function (
                        cacheNames
                    ) {

                        return Promise.all(

                            cacheNames
                                .filter(
                                    function (
                                        cacheName
                                    ) {

                                        return (
                                            cacheName !==
                                            CACHE_NAME
                                        );
                                    }
                                )
                                .map(
                                    function (
                                        oldCacheName
                                    ) {

                                        console.log(
                                            "Removing old Jufelix cache:",
                                            oldCacheName
                                        );


                                        return caches.delete(
                                            oldCacheName
                                        );
                                    }
                                )
                        );
                    }
                )
                .then(
                    function () {

                        /*
                         * Immediately control open
                         * Jufelix ERP pages.
                         */

                        return self.clients.claim();
                    }
                )
        );
    }
);


/* ==========================================
   FETCH
========================================== */

self.addEventListener(
    "fetch",
    function (event) {

        const request =
            event.request;


        /*
         * Only handle GET requests.
         */

        if (
            request.method !==
            "GET"
        ) {

            return;
        }


        const requestUrl =
            new URL(
                request.url
            );


        /*
         * Do not interfere with Firebase,
         * CDNs or other external services.
         */

        if (
            requestUrl.origin !==
            self.location.origin
        ) {

            return;
        }


        /*
         * HTML/navigation requests:
         *
         * NETWORK FIRST
         *
         * This ensures newly deployed ERP
         * pages are received quickly.
         */

        if (
            request.mode ===
                "navigate" ||
            request.headers
                .get(
                    "accept"
                )
                ?.includes(
                    "text/html"
                )
        ) {

            event.respondWith(
                networkFirst(
                    request
                )
            );


            return;
        }


        /*
         * Static files:
         *
         * CACHE FIRST, then network.
         */

        event.respondWith(
            cacheFirst(
                request
            )
        );
    }
);


/* ==========================================
   NETWORK FIRST
========================================== */

async function networkFirst(
    request
) {

    try {

        const response =
            await fetch(
                request
            );


        if (
            isCacheableResponse(
                response
            )
        ) {

            const cache =
                await caches.open(
                    CACHE_NAME
                );


            await cache.put(
                request,
                response.clone()
            );
        }


        return response;


    } catch (
        error
    ) {

        console.warn(
            "Network unavailable, checking cache:",
            request.url
        );


        const cachedResponse =
            await caches.match(
                request
            );


        if (
            cachedResponse
        ) {

            return cachedResponse;
        }


        /*
         * Try index.html as a last HTML
         * fallback.
         */

        const indexPage =
            await caches.match(
                "./index.html"
            );


        if (
            indexPage
        ) {

            return indexPage;
        }


        return createOfflineResponse();
    }
}


/* ==========================================
   CACHE FIRST
========================================== */

async function cacheFirst(
    request
) {

    const cachedResponse =
        await caches.match(
            request
        );


    if (
        cachedResponse
    ) {

        /*
         * Refresh cached asset quietly
         * in the background.
         */

        refreshCache(
            request
        );


        return cachedResponse;
    }


    try {

        const networkResponse =
            await fetch(
                request
            );


        if (
            isCacheableResponse(
                networkResponse
            )
        ) {

            const cache =
                await caches.open(
                    CACHE_NAME
                );


            await cache.put(
                request,
                networkResponse.clone()
            );
        }


        return networkResponse;


    } catch (
        error
    ) {

        return createOfflineResponse();
    }
}


/* ==========================================
   BACKGROUND CACHE REFRESH
========================================== */

async function refreshCache(
    request
) {

    try {

        const response =
            await fetch(
                request
            );


        if (
            !isCacheableResponse(
                response
            )
        ) {

            return;
        }


        const cache =
            await caches.open(
                CACHE_NAME
            );


        await cache.put(
            request,
            response.clone()
        );


    } catch (
        error
    ) {

        /*
         * Ignore background refresh errors.
         * Cached version remains usable.
         */
    }
}


/* ==========================================
   CACHEABLE RESPONSE
========================================== */

function isCacheableResponse(
    response
) {

    return Boolean(

        response &&

        response.status ===
            200 &&

        response.type !==
            "error"

    );
}


/* ==========================================
   OFFLINE RESPONSE
========================================== */

function createOfflineResponse() {

    return new Response(

        `
        <!DOCTYPE html>

        <html lang="en">

        <head>

            <meta charset="UTF-8">

            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            >

            <meta
                name="theme-color"
                content="#2E0B57"
            >

            <title>
                Jufelix ERP Offline
            </title>

            <style>

                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    min-height: 100vh;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    padding: 24px;

                    background: #f5f7fb;

                    font-family:
                        Arial,
                        Helvetica,
                        sans-serif;

                    color: #1f2937;
                }

                .offline-card {
                    width: 100%;
                    max-width: 460px;

                    padding: 32px;

                    border-radius: 16px;

                    background: #ffffff;

                    box-shadow:
                        0 8px 28px
                        rgba(0,0,0,.10);

                    text-align: center;
                }

                .offline-icon {
                    font-size: 52px;

                    margin-bottom: 16px;
                }

                h1 {
                    margin:
                        0 0 12px;

                    color: #2E0B57;

                    font-size: 27px;
                }

                p {
                    margin: 0;

                    color: #6b7280;

                    line-height: 1.7;
                }

            </style>

        </head>

        <body>

            <main class="offline-card">

                <div class="offline-icon">
                    📡
                </div>

                <h1>
                    Jufelix ERP is Offline
                </h1>

                <p>
                    This page has not yet been cached
                    on this device. Connect to the
                    internet and open it once, then it
                    can be available offline.
                </p>

            </main>

        </body>

        </html>
        `,

        {
            status:
                503,

            statusText:
                "Offline",

            headers: {

                "Content-Type":
                    "text/html; charset=utf-8"
            }
        }
    );
}


/* ==========================================
   MESSAGE HANDLING
========================================== */

self.addEventListener(
    "message",
    function (event) {

        if (
            !event.data
        ) {

            return;
        }


        /*
         * Allows the application to manually
         * activate an updated service worker.
         */

        if (
            event.data.type ===
            "SKIP_WAITING"
        ) {

            self.skipWaiting();
        }


        /*
         * Useful for debugging/version checks.
         */

        if (
            event.data.type ===
            "GET_VERSION"
        ) {

            event.source?.postMessage({

                type:
                    "JUFELIX_SW_VERSION",

                cacheName:
                    CACHE_NAME,

                version:
                    CACHE_VERSION
            });
        }
    }
);


console.log(
    "✅ Jufelix ERP Production Service Worker loaded:",
    CACHE_NAME
);