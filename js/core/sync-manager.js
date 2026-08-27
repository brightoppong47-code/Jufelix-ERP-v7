/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   GLOBAL OFFLINE SYNC MANAGER

   File:
   js/core/sync-manager.js

   Build: 1205

   + Runs across ERP pages
   + Watches internet connection
   + Watches Firebase Authentication
   + Detects local unsynced sales
   + Loads Sales Cloud when needed
   + Retries safely
   + Uses existing idempotent Sales Cloud logic
========================================== */

(function () {

    "use strict";


    /* ==========================================
       CONSTANTS
    ========================================== */

    const SALES_KEY =
        "jufelix_v7_sales";

    const RETRY_DELAY =
        5000;

    const STARTUP_DELAY =
        2000;


    /* ==========================================
       STATE
    ========================================== */

    let syncing =
        false;

    let syncTimer =
        null;

    let salesCloudLoading =
        false;

    let salesCloudPromise =
        null;


    /* ==========================================
       START
    ========================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeSyncManager
        );

    } else {

        initializeSyncManager();
    }


    /* ==========================================
       INITIALIZE
    ========================================== */

    function initializeSyncManager() {

        console.log(
            "✅ Jufelix Global Sync Manager Build 1205 loaded."
        );


        connectEvents();


        scheduleSync(
            "startup",
            STARTUP_DELAY
        );
    }


    /* ==========================================
       EVENTS
    ========================================== */

    function connectEvents() {

        window.addEventListener(
            "online",
            function () {

                console.log(
                    "🌐 Global Sync: internet restored."
                );


                scheduleSync(
                    "online",
                    1000
                );
            }
        );


        document.addEventListener(
            "jufelix:auth-ready",
            function (
                event
            ) {

                const detail =
                    event.detail ||
                    {};


                if (
                    detail.authenticated ===
                    true
                ) {

                    console.log(
                        "🔐 Global Sync: Firebase Auth ready."
                    );


                    scheduleSync(
                        "auth-ready",
                        500
                    );
                }
            }
        );


        document.addEventListener(
            "jufelix:firebase-ready",
            function (
                event
            ) {

                const detail =
                    event.detail ||
                    {};


                if (
                    detail.authenticated ===
                    true
                ) {

                    scheduleSync(
                        "firebase-ready",
                        800
                    );
                }
            }
        );


        window.addEventListener(
            "focus",
            function () {

                if (
                    navigator.onLine
                ) {

                    scheduleSync(
                        "window-focus",
                        1000
                    );
                }
            }
        );
    }


    /* ==========================================
       SCHEDULE
    ========================================== */

    function scheduleSync(
        reason,
        delay
    ) {

        if (
            !navigator.onLine
        ) {

            return;
        }


        if (
            syncTimer
        ) {

            window.clearTimeout(
                syncTimer
            );
        }


        syncTimer =
            window.setTimeout(
                function () {

                    syncTimer =
                        null;


                    runSync(
                        reason
                    );

                },
                Number(
                    delay ||
                    1000
                )
            );
    }


    /* ==========================================
       RUN SYNC
    ========================================== */

    async function runSync(
        reason
    ) {

        if (
            syncing
        ) {

            return false;
        }


        if (
            !navigator.onLine
        ) {

            return false;
        }


        syncing =
            true;


        console.log(
            "🔄 Global Sync started:",
            reason
        );


        try {

            const firebase =
                await waitForAuthenticatedFirebase(
                    15000
                );


            if (
                !firebase
            ) {

                throw new Error(
                    "Firebase authentication is not ready."
                );
            }


            const sales =
                readArray(
                    SALES_KEY
                );


            if (
                sales.length ===
                0
            ) {

                console.log(
                    "ℹ️ Global Sync: no local sales found."
                );


                return true;
            }


            const salesCloud =
                await ensureSalesCloud();


            if (
                !salesCloud ||
                typeof salesCloud
                    .syncLocal !==
                    "function"
            ) {

                throw new Error(
                    "Sales Cloud sync service is unavailable."
                );
            }


            const result =
                await salesCloud
                    .syncLocal(
                        null,
                        sales
                    );


            console.log(
                "✅ Global Sales Sync complete:",
                result
            );


            document.dispatchEvent(
                new CustomEvent(
                    "jufelix:global-sync-complete",
                    {
                        detail: {

                            type:
                                "sales",

                            successful:
                                result &&
                                result.successful
                                    ? result.successful
                                    : 0,

                            failed:
                                result &&
                                result.failed
                                    ? result.failed
                                    : 0,

                            reason:
                                reason ||
                                ""
                        }
                    }
                )
            );


            if (
                result &&
                result.failed >
                0
            ) {

                scheduleSync(
                    "failed-retry",
                    RETRY_DELAY
                );


                return false;
            }


            return true;


        } catch (
            error
        ) {

            console.warn(
                "Global Sync waiting:",
                error &&
                error.message
                    ? error.message
                    : error
            );


            scheduleSync(
                "error-retry",
                RETRY_DELAY
            );


            return false;


        } finally {

            syncing =
                false;
        }
    }


    /* ==========================================
       WAIT FOR AUTHENTICATED FIREBASE
    ========================================== */

    async function waitForAuthenticatedFirebase(
        timeout
    ) {

        if (
            typeof window
                .waitForJufelixFirebase ===
            "function"
        ) {

            try {

                return await window
                    .waitForJufelixFirebase({

                        requireUser:
                            true,

                        timeout:
                            timeout ||
                            15000
                    });

            } catch (
                error
            ) {

                throw error;
            }
        }


        return new Promise(
            function (
                resolve,
                reject
            ) {

                const started =
                    Date.now();


                function check() {

                    const firebase =
                        window.JufelixFirebase;


                    const user =

                        firebase &&
                        (
                            firebase.user ||

                            (
                                firebase.auth &&
                                firebase.auth
                                    .currentUser
                            )
                        );


                    if (
                        firebase &&
                        firebase.db &&
                        firebase.auth &&
                        user
                    ) {

                        resolve(
                            firebase
                        );


                        return;
                    }


                    if (
                        Date.now() -
                        started >=
                        (
                            timeout ||
                            15000
                        )
                    ) {

                        reject(
                            new Error(
                                "Firebase authentication timed out."
                            )
                        );


                        return;
                    }


                    window.setTimeout(
                        check,
                        100
                    );
                }


                check();
            }
        );
    }


    /* ==========================================
       ENSURE SALES CLOUD
    ========================================== */

    async function ensureSalesCloud() {

        if (
            window.JufelixSalesCloud &&
            typeof window
                .JufelixSalesCloud
                .syncLocal ===
            "function"
        ) {

            return window
                .JufelixSalesCloud;
        }


        if (
            salesCloudPromise
        ) {

            return salesCloudPromise;
        }


        salesCloudPromise =
            new Promise(
                function (
                    resolve,
                    reject
                ) {

                    if (
                        salesCloudLoading
                    ) {

                        return;
                    }


                    salesCloudLoading =
                        true;


                    const existingScript =
                        document.querySelector(
                            'script[data-jufelix-sales-cloud="true"]'
                        );


                    if (
                        existingScript
                    ) {

                        waitForSalesCloud(
                            resolve,
                            reject
                        );


                        return;
                    }


                    const script =
                        document.createElement(
                            "script"
                        );


                    script.type =
                        "module";


                    script.src =
                        "js/cloud/sales-cloud.js?v=708";


                    script.dataset
                        .jufelixSalesCloud =
                        "true";


                    script.addEventListener(
                        "load",
                        function () {

                            waitForSalesCloud(
                                resolve,
                                reject
                            );
                        }
                    );


                    script.addEventListener(
                        "error",
                        function () {

                            salesCloudLoading =
                                false;

                            salesCloudPromise =
                                null;


                            reject(
                                new Error(
                                    "Sales Cloud file could not be loaded."
                                )
                            );
                        }
                    );


                    document.body.appendChild(
                        script
                    );
                }
            );


        try {

            return await salesCloudPromise;


        } finally {

            salesCloudLoading =
                false;
        }
    }


    /* ==========================================
       WAIT FOR SALES CLOUD
    ========================================== */

    function waitForSalesCloud(
        resolve,
        reject
    ) {

        const started =
            Date.now();


        function check() {

            if (
                window.JufelixSalesCloud &&
                typeof window
                    .JufelixSalesCloud
                    .syncLocal ===
                "function"
            ) {

                resolve(
                    window.JufelixSalesCloud
                );


                return;
            }


            if (
                Date.now() -
                started >=
                15000
            ) {

                salesCloudPromise =
                    null;


                reject(
                    new Error(
                        "Sales Cloud did not become ready."
                    )
                );


                return;
            }


            window.setTimeout(
                check,
                100
            );
        }


        check();
    }


    /* ==========================================
       STORAGE
    ========================================== */

    function readArray(
        key
    ) {

        try {

            const value =
                localStorage.getItem(
                    key
                );


            if (
                !value
            ) {

                return [];
            }


            const parsed =
                JSON.parse(
                    value
                );


            return Array.isArray(
                parsed
            )
                ? parsed
                : [];


        } catch (
            error
        ) {

            console.warn(
                "Global Sync storage read failed:",
                key,
                error
            );


            return [];
        }
    }


    /* ==========================================
       PUBLIC API
    ========================================== */

    window.JufelixSyncManager = {

        syncNow:
            function () {

                return runSync(
                    "manual"
                );
            },


        schedule:
            scheduleSync,


        isSyncing:
            function () {

                return syncing;
            }
    };


})();