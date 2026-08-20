/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   CUSTOMERS CLOUD BRIDGE

   COMPLETE REPLACEMENT

   File:
   js/cloud/customers-cloud.js

   + Waits for Firebase initialization
   + Waits for Firebase Authentication
   + Saves customers to Firestore
   + Uploads existing local customers
   + Updates customer records
   + Deletes customer records
   + Prevents overlapping syncs
========================================== */

(function () {

    "use strict";


    /* ==========================================
       CONSTANTS
    ========================================== */

    const CUSTOMERS_KEY =
        "jufelix_v7_customers";


    const COLLECTION_NAME =
        "customers";


    /* ==========================================
       STATE
    ========================================== */

    let firestoreTools =
        null;


    let syncTimer =
        null;


    let syncRunning =
        false;


    let syncAgain =
        false;


    /* ==========================================
       LOAD FIRESTORE SDK
    ========================================== */

    async function getFirestoreTools() {

        if (firestoreTools) {

            return firestoreTools;
        }


        firestoreTools =
            await import(
                "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
            );


        return firestoreTools;
    }


    /* ==========================================
       WAIT FOR FIREBASE

       IMPORTANT:
       Do not only wait for db.

       Firestore rules may require the
       Firebase authenticated user.
    ========================================== */

    async function getFirebase() {

        /*
         * Preferred method from the newer
         * js/core/firebase.js
         */

        if (
            typeof window
                .waitForJufelixFirebase ===
            "function"
        ) {

            return await window
                .waitForJufelixFirebase({

                    requireUser:
                        true,

                    timeout:
                        20000
                });
        }


        /*
         * Compatibility fallback.
         */

        return new Promise(
            function (
                resolve,
                reject
            ) {

                const started =
                    Date.now();


                function check() {

                    const firebase =
                        window
                            .JufelixFirebase;


                    if (
                        firebase &&
                        firebase.error
                    ) {

                        reject(
                            firebase.error
                        );

                        return;
                    }


                    if (
                        firebase &&
                        firebase.db &&
                        firebase.auth &&
                        firebase.authReady &&
                        firebase.user
                    ) {

                        resolve(
                            firebase
                        );

                        return;
                    }


                    if (
                        Date.now() -
                        started >
                        20000
                    ) {

                        reject(
                            new Error(
                                "Firebase Authentication is not ready."
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
       CLEAN FIRESTORE DATA
    ========================================== */

    function cleanData(
        value
    ) {

        if (
            value ===
            undefined
        ) {

            return null;
        }


        if (
            value ===
                null ||
            typeof value !==
                "object"
        ) {

            return value;
        }


        if (
            Array.isArray(
                value
            )
        ) {

            return value.map(
                cleanData
            );
        }


        const result =
            {};


        Object.keys(
            value
        ).forEach(
            function (
                key
            ) {

                if (
                    value[
                        key
                    ] !==
                    undefined
                ) {

                    result[
                        key
                    ] =
                        cleanData(
                            value[
                                key
                            ]
                        );
                }
            }
        );


        return result;
    }


    /* ==========================================
       NORMALIZE CUSTOMER
    ========================================== */

    function normalizeCustomer(
        customer
    ) {

        if (
            !customer ||
            !customer.id
        ) {

            throw new Error(
                "Customer ID is missing."
            );
        }


        return {

            ...cleanData(
                customer
            ),

            id:
                String(
                    customer.id
                ),

            name:
                String(
                    customer.name ||
                    customer.fullName ||
                    ""
                ),

            phone:
                String(
                    customer.phone ||
                    ""
                ),

            email:
                String(
                    customer.email ||
                    ""
                ),

            branchId:
                String(
                    customer.branchId ||
                    "head-office"
                ),

            branchName:
                String(
                    customer.branchName ||
                    "Head Office"
                ),

            type:
                String(
                    customer.type ||
                    "retail"
                ),

            status:
                String(
                    customer.status ||
                    "active"
                ),

            openingBalance:
                toNumber(
                    customer
                        .openingBalance
                ),

            balance:
                toNumber(
                    customer.balance
                ),

            creditLimit:
                toNumber(
                    customer.creditLimit
                ),

            totalPurchases:
                toNumber(
                    customer
                        .totalPurchases
                ),

            totalPaid:
                toNumber(
                    customer.totalPaid
                ),

            totalCreditSales:
                toNumber(
                    customer
                        .totalCreditSales
                )
        };
    }


    /* ==========================================
       SAVE ONE CUSTOMER
    ========================================== */

    async function saveCustomer(
        customer
    ) {

        const firebase =
            await getFirebase();


        const tools =
            await getFirestoreTools();


        const normalized =
            normalizeCustomer(
                customer
            );


        console.log(
            "Saving customer to Firebase:",
            normalized.id,
            normalized.name,
            normalized.branchId
        );


        try {

            await tools.setDoc(

                tools.doc(
                    firebase.db,
                    COLLECTION_NAME,
                    normalized.id
                ),

                {

                    ...normalized,

                    cloudUpdatedAt:
                        tools
                            .serverTimestamp()
                },

                {
                    merge:
                        true
                }
            );


            console.log(
                "✅ Customer synced to Firebase:",
                normalized.name ||
                normalized.id
            );


            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:customer-cloud-saved",
                    {

                        detail: {

                            customer:
                                normalized
                        }
                    }
                )
            );


            return normalized;


        } catch (error) {

            console.error(
                "❌ Customer Firestore save failed:",
                error
            );


            throw createFriendlyError(
                error
            );
        }
    }


    /* ==========================================
       DELETE ONE CUSTOMER
    ========================================== */

    async function deleteCustomer(
        customerId
    ) {

        if (!customerId) {

            throw new Error(
                "Customer ID is required."
            );
        }


        const firebase =
            await getFirebase();


        const tools =
            await getFirestoreTools();


        try {

            await tools.deleteDoc(

                tools.doc(
                    firebase.db,
                    COLLECTION_NAME,
                    String(
                        customerId
                    )
                )
            );


            console.log(
                "✅ Customer deleted from Firebase:",
                customerId
            );


            return true;


        } catch (error) {

            console.error(
                "❌ Firebase customer delete failed:",
                error
            );


            throw createFriendlyError(
                error
            );
        }
    }


    /* ==========================================
       READ LOCAL CUSTOMERS
    ========================================== */

    function readCustomers() {

        try {

            const stored =
                localStorage.getItem(
                    CUSTOMERS_KEY
                );


            if (!stored) {

                return [];
            }


            const parsed =
                JSON.parse(
                    stored
                );


            return Array.isArray(
                parsed
            )
                ? parsed
                : [];


        } catch (error) {

            console.error(
                "Unable to read local customers:",
                error
            );


            return [];
        }
    }


    /* ==========================================
       SYNC ALL LOCAL CUSTOMERS
    ========================================== */

    async function syncLocal() {

        /*
         * Prevent multiple data-updated events
         * from starting several uploads at once.
         */

        if (syncRunning) {

            syncAgain =
                true;


            return {
                successful:
                    0,

                failed:
                    0,

                queued:
                    true
            };
        }


        syncRunning =
            true;


        let successful =
            0;


        let failed =
            0;


        const errors =
            [];


        try {

            /*
             * Authenticate first.
             *
             * This means we don't loop through
             * every customer when Firebase isn't
             * actually ready.
             */

            await getFirebase();


            const customers =
                readCustomers();


            for (
                const customer of
                customers
            ) {

                if (
                    !customer ||
                    !customer.id
                ) {

                    continue;
                }


                try {

                    await saveCustomer(
                        customer
                    );


                    successful++;


                } catch (error) {

                    failed++;


                    errors.push({

                        id:
                            customer.id,

                        name:
                            customer.name ||
                            "",

                        error:
                            error.message
                    });


                    console.error(
                        "❌ Customer sync failed:",
                        customer.id,
                        error
                    );
                }
            }


            console.log(
                "Customer Firebase sync complete:",
                {
                    successful,
                    failed
                }
            );


            return {

                successful,
                failed,
                errors
            };


        } finally {

            syncRunning =
                false;


            if (syncAgain) {

                syncAgain =
                    false;


                window.setTimeout(
                    function () {

                        syncLocal()
                            .catch(
                                function (
                                    error
                                ) {

                                    console.error(
                                        "Queued customer sync failed:",
                                        error
                                    );
                                }
                            );

                    },
                    250
                );
            }
        }
    }


    /* ==========================================
       SCHEDULE SYNC
    ========================================== */

    function scheduleSync() {

        window.clearTimeout(
            syncTimer
        );


        syncTimer =
            window.setTimeout(
                function () {

                    syncLocal()
                        .catch(
                            function (
                                error
                            ) {

                                console.error(
                                    "Customer scheduled sync failed:",
                                    error
                                );
                            }
                        );

                },
                400
            );
    }


    /* ==========================================
       CUSTOMER DATA UPDATED
    ========================================== */

    document.addEventListener(
        "jufelix:data-updated",
        function (
            event
        ) {

            if (
                event.detail &&
                event.detail.key ===
                    CUSTOMERS_KEY
            ) {

                scheduleSync();
            }
        }
    );


    document.addEventListener(
        "jufelix:dataChanged",
        function (
            event
        ) {

            if (
                event.detail &&
                event.detail.key ===
                    CUSTOMERS_KEY
            ) {

                scheduleSync();
            }
        }
    );


    /* ==========================================
       OTHER TAB CHANGES
    ========================================== */

    window.addEventListener(
        "storage",
        function (
            event
        ) {

            if (
                event.key ===
                CUSTOMERS_KEY
            ) {

                scheduleSync();
            }
        }
    );


    /* ==========================================
       ONLINE AGAIN
    ========================================== */

    window.addEventListener(
        "online",
        function () {

            scheduleSync();
        }
    );


    /* ==========================================
       FIREBASE READY
    ========================================== */

    document.addEventListener(
        "jufelix:firebase-ready",
        function (
            event
        ) {

            if (
                event.detail &&
                event.detail.authenticated
            ) {

                scheduleSync();
            }
        }
    );


    /* ==========================================
       NUMBER HELPER
    ========================================== */

    function toNumber(
        value
    ) {

        if (
            value ===
                undefined ||
            value ===
                null ||
            value ===
                ""
        ) {

            return 0;
        }


        const number =
            Number(
                typeof value ===
                    "string"
                    ? value.replace(
                        /,/g,
                        ""
                    )
                    : value
            );


        return Number.isFinite(
            number
        )
            ? number
            : 0;
    }


    /* ==========================================
       FRIENDLY FIREBASE ERROR
    ========================================== */

    function createFriendlyError(
        error
    ) {

        const code =
            String(
                error &&
                error.code ||
                ""
            );


        const message =
            String(
                error &&
                error.message ||
                ""
            );


        if (
            code.includes(
                "permission-denied"
            ) ||
            message
                .toLowerCase()
                .includes(
                    "insufficient permissions"
                )
        ) {

            return new Error(
                "Firebase rejected the customer because the signed-in user does not have permission to write to the customers collection."
            );
        }


        if (
            code.includes(
                "unauthenticated"
            )
        ) {

            return new Error(
                "Firebase Authentication is not signed in."
            );
        }


        if (
            code.includes(
                "unavailable"
            )
        ) {

            return new Error(
                "Firebase is temporarily unavailable. Check your internet connection."
            );
        }


        return error instanceof Error
            ? error
            : new Error(
                message ||
                "Customer Firebase sync failed."
            );
    }


    /* ==========================================
       PUBLIC API
    ========================================== */

    window.JufelixCustomersCloud = {

        saveCustomer:
            saveCustomer,

        deleteCustomer:
            deleteCustomer,

        syncLocal:
            syncLocal,

        refresh:
            scheduleSync
    };


    /* ==========================================
       READY EVENT
    ========================================== */

    document.dispatchEvent(

        new CustomEvent(
            "jufelix:customers-cloud-ready"
        )
    );


    console.log(
        "✅ Jufelix Customers Cloud ready."
    );


    /* ==========================================
       INITIAL SYNC
    ========================================== */

    window.setTimeout(
        function () {

            syncLocal()
                .catch(
                    function (
                        error
                    ) {

                        /*
                         * Do not show an alert here.
                         * Login/authentication may still
                         * be establishing itself.
                         */

                        console.warn(
                            "Initial customer Firebase sync waiting:",
                            error.message ||
                            error
                        );
                    }
                );

        },
        1200
    );


})();