/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   PWA SERVICE WORKER

   File:
   service-worker.js
========================================== */

const CACHE_NAME =
    "jufelix-erp-v7-cache-v1";


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

self.addEventListener(
    "install",
    function (event) {

        event.waitUntil(

            caches
                .open(
                    CACHE_NAME
                )
                .then(
                    function (cache) {

                        return cache.addAll(
                            CORE_FILES
                        );

                    }
                )
                .then(
                    function () {

                        return self.skipWaiting();

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

        event.waitUntil(

            caches
                .keys()
                .then(
                    function (cacheNames) {

                        return Promise.all(

                            cacheNames
                                .filter(
                                    function (cacheName) {

                                        return (
                                            cacheName !==
                                            CACHE_NAME
                                        );

                                    }
                                )
                                .map(
                                    function (cacheName) {

                                        return caches.delete(
                                            cacheName
                                        );

                                    }
                                )

                        );

                    }
                )
                .then(
                    function () {

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

        if (
            event.request.method !==
            "GET"
        ) {

            return;

        }


        const requestUrl =
            new URL(
                event.request.url
            );


        /*
         * Do not cache external CDN files
         * aggressively.
         */

        if (
            requestUrl.origin !==
            self.location.origin
        ) {

            return;

        }


        event.respondWith(

            fetch(
                event.request
            )
                .then(
                    function (networkResponse) {

                        const responseClone =
                            networkResponse.clone();


                        caches
                            .open(
                                CACHE_NAME
                            )
                            .then(
                                function (cache) {

                                    cache.put(
                                        event.request,
                                        responseClone
                                    );

                                }
                            );


                        return networkResponse;

                    }
                )
                .catch(
                    function () {

                        return caches
                            .match(
                                event.request
                            )
                            .then(
                                function (cachedResponse) {

                                    if (
                                        cachedResponse
                                    ) {

                                        return cachedResponse;

                                    }


                                    /*
                                     * HTML fallback.
                                     */

                                    if (
                                        event.request.headers
                                            .get(
                                                "accept"
                                            )
                                            ?.includes(
                                                "text/html"
                                            )
                                    ) {

                                        return caches.match(
                                            "./index.html"
                                        );

                                    }


                                    return Response.error();

                                }
                            );

                    }
                )

        );

    }
);