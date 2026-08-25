/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   PRODUCTION PWA SERVICE WORKER

   File:
   service-worker.js

   ERP Build: 1204
   Service Worker: v4

   COMPLETE REPLACEMENT

   + Production cache versioning
   + Removes previous Jufelix caches
   + Pre-caches ERP pages
   + Pre-caches major local modules
   + Network-first HTML
   + Network-first JS / CSS / JSON
   + Cache-first images/icons
   + Handles ?v= cache-busting safely
   + Offline page fallback
   + Safer installed-app updates
========================================== */


/* ==========================================
   CACHE VERSION
========================================== */

const CACHE_VERSION =
    "v4";


const ERP_BUILD =
    "1204";


const CACHE_PREFIX =
    "jufelix-erp-v7-production-";


const CACHE_NAME =
    CACHE_PREFIX +
    CACHE_VERSION;


/* ==========================================
   CORE APPLICATION FILES
========================================== */

const CORE_FILES = [

    /* ======================================
       ROOT / PAGES
    ====================================== */

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


    /* ======================================
       CSS
    ====================================== */

    "./assets/css/variables.css",

    "./assets/css/base.css",

    "./assets/css/components.css",

    "./assets/css/style.css",


    /* ======================================
       ICONS
    ====================================== */

    "./assets/icons/icon-192.png",

    "./assets/icons/icon-512.png",

    "./assets/icons/icon-maskable-512.png",


    /* ======================================
       CONFIG
    ====================================== */

    "./config/app-config.js",

    "./config/firebase-config.js",


    /* ======================================
       CORE JAVASCRIPT
    ====================================== */

    "./js/core/storage.js",

    "./js/core/database.js",

    "./js/core/permissions.js",

    "./js/core/auth-guard.js",

    "./js/core/theme.js",

    "./js/core/firebase.js",

    "./js/core/pwa-install.js",


    /* ======================================
       COMPONENTS
    ====================================== */

    "./js/components/sidebar.js",

    "./js/components/topbar.js",


    /* ======================================
       MAIN APPLICATION
    ====================================== */

    "./js/app.js",


    /* ======================================
       MODULES
    ====================================== */

    "./js/modules/login.js",

    "./js/modules/dashboard.js",

    "./js/modules/inventory.js",

    "./js/modules/inventory-branch-viewer.js",

    "./js/modules/sales.js",

    "./js/modules/receipt.js",

    "./js/modules/customers.js",

    "./js/modules/suppliers.js",

    "./js/modules/purchases.js",

    "./js/modules/expenses.js",

    "./js/modules/reports.js",

    "./js/modules/payments.js",

    "./js/modules/transfers.js",

    "./js/modules/branches.js",

    "./js/modules/users.js",

    "./js/modules/settings.js",


    /* ======================================
       CLOUD BRIDGES

       Missing optional files will simply be
       skipped during installation.
    ====================================== */

    "./js/cloud/inventory-cloud.js",

    "./js/cloud/sales-cloud.js",

    "./js/cloud/purchases-cloud.js",

    "./js/cloud/customers-cloud.js",

    "./js/cloud/suppliers-cloud.js",

    "./js/cloud/expenses-cloud.js",

    "./js/cloud/reports-cloud.js",

    "./js/cloud/payments-cloud.js",

    "./js/cloud/transfers-cloud.js",

    "./js/cloud/branches-cloud.js",

    "./js/cloud/users-cloud.js"

];


/* ==========================================
   INSTALL
========================================== */

self.addEventListener(
    "install",
    function (event) {

        console.log(
            "Jufelix ERP SW installing:",
            CACHE_NAME,
            "Build:",
            ERP_BUILD
        );


        event.waitUntil(

            installApplicationCache()

        );
    }
);


/* ==========================================
   INSTALL APPLICATION CACHE
========================================== */

async function installApplicationCache() {

    const cache =
        await caches.open(
            CACHE_NAME
        );


    let cachedCount =
        0;


    let skippedCount =
        0;


    /*
     * Cache individually so one optional
     * missing file cannot abort installation.
     */

    for (
        const file of
        CORE_FILES
    ) {

        try {

            const request =
                new Request(
                    file,
                    {
                        cache:
                            "reload"
                    }
                );


            const response =
                await fetch(
                    request
                );


            if (
                !isCacheableResponse(
                    response
                )
            ) {

                skippedCount++;


                console.warn(
                    "PWA precache skipped:",
                    file,
                    "Status:",
                    response.status
                );


                continue;
            }


            await cache.put(
                request,
                response.clone()
            );


            cachedCount++;


        } catch (
            error
        ) {

            skippedCount++;


            console.warn(
                "PWA precache skipped:",
                file,
                error
            );
        }
    }


    console.log(
        "✅ Jufelix ERP precache complete.",
        {
            cached:
                cachedCount,

            skipped:
                skippedCount,

            cache:
                CACHE_NAME,

            build:
                ERP_BUILD
        }
    );


    /*
     * Activate immediately.
     */

    await self.skipWaiting();
}


/* ==========================================
   ACTIVATE
========================================== */

self.addEventListener(
    "activate",
    function (event) {

        console.log(
            "Jufelix ERP SW activating:",
            CACHE_NAME
        );


        event.waitUntil(

            activateServiceWorker()

        );
    }
);


/* ==========================================
   ACTIVATE SERVICE WORKER
========================================== */

async function activateServiceWorker() {

    const cacheNames =
        await caches.keys();


    await Promise.all(

        cacheNames
            .filter(
                function (
                    cacheName
                ) {

                    /*
                     * Only remove old Jufelix ERP
                     * production caches.
                     *
                     * Do not delete unrelated
                     * caches belonging to another
                     * application.
                     */

                    return (
                        cacheName.startsWith(
                            CACHE_PREFIX
                        ) &&
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


    await self.clients.claim();


    console.log(
        "✅ Jufelix ERP SW active:",
        CACHE_NAME
    );
}


/* ==========================================
   FETCH
========================================== */

self.addEventListener(
    "fetch",
    function (event) {

        const request =
            event.request;


        /*
         * Never interfere with writes.
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
         * Firebase APIs, Google CDN modules,
         * jsDelivr/CDNJS and other external
         * resources remain under normal
         * browser/network handling.
         */

        if (
            requestUrl.origin !==
            self.location.origin
        ) {

            return;
        }


        /* ======================================
           PAGE NAVIGATION
        ====================================== */

        if (
            isNavigationRequest(
                request
            )
        ) {

            event.respondWith(
                networkFirst(
                    request,
                    true
                )
            );


            return;
        }


        /* ======================================
           JS / CSS / JSON

           Network-first ensures that when
           GitHub Pages has a newer production
           file, the user receives it promptly.

           Cached copy remains available offline.
        ====================================== */

        if (
            isUpdateSensitiveAsset(
                requestUrl
            )
        ) {

            event.respondWith(
                networkFirst(
                    request,
                    false
                )
            );


            return;
        }


        /* ======================================
           IMAGES / ICONS / OTHER STATIC FILES
        ====================================== */

        event.respondWith(
            cacheFirst(
                request
            )
        );
    }
);


/* ==========================================
   NAVIGATION DETECTION
========================================== */

function isNavigationRequest(
    request
) {

    if (
        request.mode ===
        "navigate"
    ) {

        return true;
    }


    const accept =
        request.headers.get(
            "accept"
        ) ||
        "";


    return accept.includes(
        "text/html"
    );
}


/* ==========================================
   UPDATE-SENSITIVE ASSETS
========================================== */

function isUpdateSensitiveAsset(
    url
) {

    const pathname =
        String(
            url.pathname ||
            ""
        )
            .toLowerCase();


    return (

        pathname.endsWith(
            ".js"
        ) ||

        pathname.endsWith(
            ".css"
        ) ||

        pathname.endsWith(
            ".json"
        )

    );
}


/* ==========================================
   NETWORK FIRST
========================================== */

async function networkFirst(
    request,
    navigationRequest
) {

    try {

        /*
         * Force browser to revalidate while
         * online instead of relying on an old
         * HTTP cache entry.
         */

        const networkRequest =
            new Request(
                request,
                {
                    cache:
                        "no-cache"
                }
            );


        const response =
            await fetch(
                networkRequest
            );


        if (
            isCacheableResponse(
                response
            )
        ) {

            await saveResponse(
                request,
                response
            );
        }


        return response;


    } catch (
        error
    ) {

        console.log(
            "Network unavailable. Using Jufelix cache:",
            request.url
        );


        /*
         * Exact request first.
         */

        let cachedResponse =
            await caches.match(
                request
            );


        if (
            cachedResponse
        ) {

            return cachedResponse;
        }


        /*
         * Then ignore ?v=xxxx.
         *
         * This allows:
         *
         * sales.js?v=1010
         *
         * to use the precached:
         *
         * sales.js
         *
         * while completely offline.
         */

        cachedResponse =
            await caches.match(
                request,
                {
                    ignoreSearch:
                        true
                }
            );


        if (
            cachedResponse
        ) {

            return cachedResponse;
        }


        if (
            navigationRequest
        ) {

            const offlinePage =
                await getCachedNavigationFallback();


            if (
                offlinePage
            ) {

                return offlinePage;
            }
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

    /*
     * Exact cache match.
     */

    let cachedResponse =
        await caches.match(
            request
        );


    /*
     * Also support cache-busting query strings.
     */

    if (
        !cachedResponse
    ) {

        cachedResponse =
            await caches.match(
                request,
                {
                    ignoreSearch:
                        true
                }
            );
    }


    if (
        cachedResponse
    ) {

        /*
         * Quietly update while online.
         */

        if (
            self.navigator ?
                self.navigator.onLine :
                true
        ) {

            refreshCache(
                request
            );
        }


        return cachedResponse;
    }


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

            await saveResponse(
                request,
                response
            );
        }


        return response;


    } catch (
        error
    ) {

        return createOfflineResponse();
    }
}


/* ==========================================
   SAVE RESPONSE
========================================== */

async function saveResponse(
    request,
    response
) {

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
}


/* ==========================================
   BACKGROUND REFRESH
========================================== */

async function refreshCache(
    request
) {

    try {

        const response =
            await fetch(
                new Request(
                    request,
                    {
                        cache:
                            "no-cache"
                    }
                )
            );


        if (
            !isCacheableResponse(
                response
            )
        ) {

            return;
        }


        await saveResponse(
            request,
            response
        );


    } catch (
        error
    ) {

        /*
         * Cached version remains valid.
         */
    }
}


/* ==========================================
   NAVIGATION FALLBACK
========================================== */

async function getCachedNavigationFallback() {

    /*
     * Prefer the login page because the login
     * module can now restore a remembered
     * offline ERP session.
     */

    let response =
        await caches.match(
            "./login.html",
            {
                ignoreSearch:
                    true
            }
        );


    if (
        response
    ) {

        return response;
    }


    response =
        await caches.match(
            "./index.html",
            {
                ignoreSearch:
                    true
            }
        );


    if (
        response
    ) {

        return response;
    }


    response =
        await caches.match(
            "./",
            {
                ignoreSearch:
                    true
            }
        );


    return response ||
        null;
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
                    box-sizing:
                        border-box;
                }


                body {
                    margin: 0;

                    min-height:
                        100vh;

                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    padding:
                        24px;

                    background:
                        #f5f7fb;

                    font-family:
                        Arial,
                        Helvetica,
                        sans-serif;

                    color:
                        #1f2937;
                }


                .offline-card {
                    width:
                        100%;

                    max-width:
                        460px;

                    padding:
                        32px;

                    border-radius:
                        16px;

                    background:
                        #ffffff;

                    box-shadow:
                        0 8px 28px
                        rgba(
                            0,
                            0,
                            0,
                            .10
                        );

                    text-align:
                        center;
                }


                .offline-icon {
                    font-size:
                        52px;

                    margin-bottom:
                        16px;
                }


                h1 {
                    margin:
                        0 0 12px;

                    color:
                        #2E0B57;

                    font-size:
                        27px;
                }


                p {
                    margin: 0;

                    color:
                        #6b7280;

                    line-height:
                        1.7;
                }


                .build {
                    margin-top:
                        18px;

                    color:
                        #9ca3af;

                    font-size:
                        12px;
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
                    This resource is not yet stored
                    on this device. Reconnect to the
                    internet and open the page once,
                    then try again.
                </p>


                <div class="build">
                    Jufelix ERP v7.0 · Build ${ERP_BUILD}
                </div>

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
                    "text/html; charset=utf-8",

                "Cache-Control":
                    "no-store"
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


        /* ======================================
           ACTIVATE NEW WORKER
        ====================================== */

        if (
            event.data.type ===
            "SKIP_WAITING"
        ) {

            self.skipWaiting();


            return;
        }


        /* ======================================
           VERSION INFORMATION
        ====================================== */

        if (
            event.data.type ===
            "GET_VERSION"
        ) {

            if (
                event.source
            ) {

                event.source.postMessage({

                    type:
                        "JUFELIX_SW_VERSION",

                    cacheName:
                        CACHE_NAME,

                    version:
                        CACHE_VERSION,

                    build:
                        ERP_BUILD
                });
            }


            return;
        }


        /* ======================================
           MANUAL CACHE REFRESH
        ====================================== */

        if (
            event.data.type ===
            "REFRESH_APP_CACHE"
        ) {

            event.waitUntil(

                installApplicationCache()

            );
        }
    }
);


/* ==========================================
   START MESSAGE
========================================== */

console.log(
    "✅ Jufelix ERP Production Service Worker loaded:",
    {
        cache:
            CACHE_NAME,

        serviceWorker:
            CACHE_VERSION,

        build:
            ERP_BUILD
    }
);