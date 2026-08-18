/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   SUPPLIERS CLOUD BRIDGE

   File:
   js/cloud/suppliers-cloud.js

   + Sync suppliers to Firestore
   + Upload existing local suppliers
   + Listen for supplier changes
   + Acode-friendly classic script
========================================== */

(function () {
    "use strict";


    /* ==========================================
       STORAGE KEY
    ========================================== */

    const SUPPLIERS_KEY =
        "jufelix_v7_suppliers";


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
       SAVE ONE SUPPLIER
    ========================================== */

    async function saveSupplier(
        supplier
    ) {

        if (
            !supplier ||
            !supplier.id
        ) {

            throw new Error(
                "Supplier ID is missing."
            );
        }


        const db =
            await waitForFirebase();


        const tools =
            await getFirestoreTools();


        await tools.setDoc(

            tools.doc(
                db,
                "suppliers",
                String(
                    supplier.id
                )
            ),

            {
                ...cleanData(
                    supplier
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
            "✅ Supplier synced to Firebase:",
            supplier.name ||
            supplier.id
        );


        return true;
    }


    /* ==========================================
       READ LOCAL SUPPLIERS
    ========================================== */

    function readSuppliers() {

        try {

            const stored =
                localStorage.getItem(
                    SUPPLIERS_KEY
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
                "Unable to read suppliers:",
                error
            );


            return [];
        }
    }


    /* ==========================================
       SYNC ALL LOCAL SUPPLIERS
    ========================================== */

    async function syncLocal() {

        const suppliers =
            readSuppliers();


        let successful =
            0;

        let failed =
            0;


        for (
            const supplier of
            suppliers
        ) {

            if (
                !supplier ||
                !supplier.id
            ) {

                continue;
            }


            try {

                await saveSupplier(
                    supplier
                );


                successful++;


            } catch (
                error
            ) {

                failed++;


                console.error(
                    "❌ Supplier sync failed:",
                    supplier.id,
                    error
                );
            }
        }


        console.log(
            "Supplier Firebase sync:",
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

       Prevents repeated writes when several
       supplier events happen quickly.
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
                                    "Supplier scheduled sync failed:",
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
                    SUPPLIERS_KEY
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
                SUPPLIERS_KEY
            ) {

                scheduleSync();
            }
        }
    );


    /* ==========================================
       PUBLIC API
    ========================================== */

    window.JufelixSuppliersCloud = {

        saveSupplier:
            saveSupplier,

        syncLocal:
            syncLocal,

        refresh:
            scheduleSync
    };


    console.log(
        "✅ Jufelix Suppliers Cloud loaded."
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
                            "Initial supplier Firebase sync failed:",
                            error
                        );
                    }
                );

        },
        1500
    );

})();