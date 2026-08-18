/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   CUSTOMERS CLOUD BRIDGE

   File:
   js/cloud/customers-cloud.js

   + Sync customers to Firestore
   + Upload existing local customers
   + Listen for customer data changes
   + Acode-friendly classic script
========================================== */

(function () {
    "use strict";


    /* ==========================================
       STORAGE KEY
    ========================================== */

    const CUSTOMERS_KEY =
        "jufelix_v7_customers";


    let firestoreTools =
        null;

    let syncTimer =
        null;


    /* ==========================================
       LOAD FIRESTORE
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
    ========================================== */

    function waitForFirebase(
        timeout = 15000
    ) {

        return new Promise(
            function (
                resolve,
                reject
            ) {

                const started =
                    Date.now();


                function check() {

                    if (
                        window.JufelixFirebase &&
                        window.JufelixFirebase.db
                    ) {

                        resolve(
                            window.JufelixFirebase.db
                        );

                        return;
                    }


                    if (
                        Date.now() -
                        started >
                        timeout
                    ) {

                        reject(
                            new Error(
                                "Firebase database was not ready."
                            )
                        );

                        return;
                    }


                    setTimeout(
                        check,
                        100
                    );
                }


                check();
            }
        );
    }


    /* ==========================================
       CLEAN DATA
    ========================================== */

    function cleanData(
        value
    ) {

        if (
            value === undefined
        ) {
            return null;
        }


        if (
            value === null ||
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
                    value[key] !==
                    undefined
                ) {

                    result[key] =
                        cleanData(
                            value[key]
                        );
                }
            }
        );


        return result;
    }


    /* ==========================================
       SAVE ONE CUSTOMER
    ========================================== */

    async function saveCustomer(
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


        const db =
            await waitForFirebase();


        const tools =
            await getFirestoreTools();


        await tools.setDoc(

            tools.doc(
                db,
                "customers",
                String(
                    customer.id
                )
            ),

            {
                ...cleanData(
                    customer
                ),

                cloudUpdatedAt:
                    tools.serverTimestamp()
            },

            {
                merge:
                    true
            }
        );


        console.log(
            "✅ Customer synced to Firebase:",
            customer.name ||
            customer.fullName ||
            customer.id
        );


        return true;
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


            const parsed =
                stored
                    ? JSON.parse(
                        stored
                    )
                    : [];


            return Array.isArray(
                parsed
            )
                ? parsed
                : [];


        } catch (
            error
        ) {

            console.error(
                "Unable to read customers:",
                error
            );


            return [];
        }
    }


    /* ==========================================
       SYNC ALL LOCAL CUSTOMERS
    ========================================== */

    async function syncLocal() {

        const customers =
            readCustomers();


        let successful =
            0;

        let failed =
            0;


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


            } catch (
                error
            ) {

                failed++;


                console.error(
                    "❌ Customer sync failed:",
                    customer.id,
                    error
                );
            }
        }


        console.log(
            "Customer Firebase sync:",
            {
                successful,
                failed
            }
        );


        return {
            successful,
            failed
        };
    }


    /* ==========================================
       DELAYED SYNC
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
                500
            );
    }


    /* ==========================================
       DATA CHANGE EVENTS
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
       PUBLIC API
    ========================================== */

    window.JufelixCustomersCloud = {

        saveCustomer:
            saveCustomer,

        syncLocal:
            syncLocal,

        refresh:
            scheduleSync
    };


    console.log(
        "✅ Jufelix Customers Cloud loaded."
    );


    /* ==========================================
       INITIAL LOCAL → FIREBASE SYNC
    ========================================== */

    window.setTimeout(
        function () {

            syncLocal()
                .catch(
                    function (
                        error
                    ) {

                        console.error(
                            "Initial customer Firebase sync failed:",
                            error
                        );
                    }
                );

        },
        1500
    );

})();