/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   AUTHENTICATED SUPPLIERS CLOUD BRIDGE

   File:
   js/cloud/suppliers-cloud.js

   Version: 701

   + Firebase Authentication aware
   + Supplier create/update sync
   + Upload existing local suppliers
   + Realtime Firebase → local sync
   + Multi-device support
   + Prevents sync loops
   + Acode / APK friendly
========================================== */

(function () {

    "use strict";


    /* ==========================================
       CONSTANTS
    ========================================== */

    const SUPPLIERS_KEY =
        "jufelix_v7_suppliers";

    const COLLECTION_NAME =
        "suppliers";


    /* ==========================================
       STATE
    ========================================== */

    let firestoreTools =
        null;

    let syncTimer =
        null;

    let stopListener =
        null;

    let listenerStarted =
        false;

    let applyingCloudData =
        false;


    /* ==========================================
       FIRESTORE TOOLS
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
       AUTHENTICATED FIREBASE READY
    ========================================== */

    async function getFirebase() {

        /*
         * Preferred helper from
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
         * Compatibility fallback
         */

        return new Promise(
            function (
                resolve,
                reject
            ) {

                const startedAt =
                    Date.now();


                function check() {

                    const firebase =
                        window.JufelixFirebase;


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
                        firebase.auth.currentUser
                    ) {

                        resolve(
                            firebase
                        );

                        return;
                    }


                    if (
                        Date.now() -
                        startedAt >
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


        const firebase =
            await getFirebase();


        const tools =
            await getFirestoreTools();


        try {

            console.log(
                "☁️ Uploading supplier:",
                supplier.name ||
                supplier.id
            );


            await tools.setDoc(

                tools.doc(
                    firebase.db,
                    COLLECTION_NAME,
                    String(
                        supplier.id
                    )
                ),

                {

                    ...cleanData(
                        supplier
                    ),

                    id:
                        String(
                            supplier.id
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
                "✅ SUPPLIER SAVED TO FIREBASE:",
                supplier.name ||
                supplier.id
            );


            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:supplier-cloud-saved",
                    {
                        detail: {

                            supplier:
                                supplier
                        }
                    }
                )
            );


            return true;


        } catch (error) {

            reportError(
                "SAVE SUPPLIER",
                error
            );


            throw error;
        }
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


        } catch (error) {

            console.error(
                "Unable to read suppliers:",
                error
            );


            return [];
        }
    }


    /* ==========================================
       SAVE LOCAL SUPPLIERS
    ========================================== */

    function saveSuppliersLocally(
        suppliers,
        source
    ) {

        try {

            applyingCloudData =
                source ===
                "cloud";


            localStorage.setItem(
                SUPPLIERS_KEY,
                JSON.stringify(
                    suppliers
                )
            );


            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:data-updated",
                    {
                        detail: {

                            key:
                                SUPPLIERS_KEY,

                            value:
                                suppliers,

                            source:
                                source ||
                                ""
                        }
                    }
                )
            );


            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:dataChanged",
                    {
                        detail: {

                            key:
                                SUPPLIERS_KEY,

                            value:
                                suppliers,

                            source:
                                source ||
                                ""
                        }
                    }
                )
            );


            return true;


        } catch (error) {

            console.error(
                "Unable to save suppliers locally:",
                error
            );


            return false;


        } finally {

            if (
                source ===
                "cloud"
            ) {

                window.setTimeout(
                    function () {

                        applyingCloudData =
                            false;
                    },
                    100
                );
            }
        }
    }


    /* ==========================================
       SYNC LOCAL → FIREBASE
    ========================================== */

    async function syncLocal() {

        if (
            applyingCloudData
        ) {

            return {

                successful:
                    0,

                failed:
                    0,

                skipped:
                    true
            };
        }


        await getFirebase();


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


            } catch (error) {

                failed++;
            }
        }


        console.log(
            "☁️ Supplier sync finished:",
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
       SAFE MERGE
    ========================================== */

    function mergeSuppliers(
        localSuppliers,
        cloudSuppliers
    ) {

        const map =
            new Map();


        (
            Array.isArray(
                localSuppliers
            )
                ? localSuppliers
                : []
        ).forEach(
            function (
                supplier
            ) {

                if (
                    supplier &&
                    supplier.id
                ) {

                    map.set(

                        String(
                            supplier.id
                        ),

                        {
                            ...supplier
                        }
                    );
                }
            }
        );


        (
            Array.isArray(
                cloudSuppliers
            )
                ? cloudSuppliers
                : []
        ).forEach(
            function (
                supplier
            ) {

                if (
                    !supplier ||
                    !supplier.id
                ) {

                    return;
                }


                const id =
                    String(
                        supplier.id
                    );


                map.set(

                    id,

                    {

                        ...(
                            map.get(
                                id
                            ) ||
                            {}
                        ),

                        ...supplier,

                        id:
                            id
                    }
                );
            }
        );


        return Array.from(
            map.values()
        );
    }


    /* ==========================================
       REALTIME FIREBASE → LOCAL
    ========================================== */

    async function startListener() {

        if (
            listenerStarted
        ) {

            return true;
        }


        const firebase =
            await getFirebase();


        const tools =
            await getFirestoreTools();


        listenerStarted =
            true;


        try {

            stopListener =
                tools.onSnapshot(

                    tools.collection(
                        firebase.db,
                        COLLECTION_NAME
                    ),

                    function (
                        snapshot
                    ) {

                        const cloudSuppliers =
                            snapshot.docs.map(
                                function (
                                    documentSnapshot
                                ) {

                                    const data =
                                        documentSnapshot
                                            .data() ||
                                        {};


                                    const supplier = {

                                        ...data,

                                        id:
                                            String(
                                                data.id ||
                                                documentSnapshot.id
                                            )
                                    };


                                    delete supplier
                                        .cloudUpdatedAt;


                                    return supplier;
                                }
                            );


                        const merged =
                            mergeSuppliers(

                                readSuppliers(),

                                cloudSuppliers
                            );


                        saveSuppliersLocally(
                            merged,
                            "cloud"
                        );


                        console.log(
                            "☁️ Supplier realtime update:",
                            merged.length
                        );
                    },

                    function (
                        error
                    ) {

                        listenerStarted =
                            false;


                        reportError(
                            "SUPPLIER LISTENER",
                            error
                        );
                    }
                );


            return true;


        } catch (error) {

            listenerStarted =
                false;


            reportError(
                "START SUPPLIER LISTENER",
                error
            );


            throw error;
        }
    }


    /* ==========================================
       STOP LISTENER
    ========================================== */

    function stopCloudListener() {

        if (
            typeof stopListener ===
            "function"
        ) {

            stopListener();
        }


        stopListener =
            null;

        listenerStarted =
            false;
    }


    /* ==========================================
       DELAYED SYNC
    ========================================== */

    function scheduleSync() {

        if (
            applyingCloudData
        ) {

            return;
        }


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

                                reportError(
                                    "SUPPLIER AUTO SYNC",
                                    error
                                );
                            }
                        );
                },
                400
            );
    }


    /* ==========================================
       ERP LOCAL CHANGE EVENTS
    ========================================== */

    document.addEventListener(
        "jufelix:data-updated",
        function (
            event
        ) {

            const detail =
                event &&
                event.detail
                    ? event.detail
                    : {};


            if (
                applyingCloudData
            ) {

                return;
            }


            if (
                detail.source ===
                    "cloud" ||
                detail.source ===
                    "firebase"
            ) {

                return;
            }


            if (
                detail.key ===
                SUPPLIERS_KEY
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

            const detail =
                event &&
                event.detail
                    ? event.detail
                    : {};


            if (
                applyingCloudData
            ) {

                return;
            }


            if (
                detail.source ===
                    "cloud" ||
                detail.source ===
                    "firebase"
            ) {

                return;
            }


            if (
                detail.key ===
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
                applyingCloudData
            ) {

                return;
            }


            if (
                event.key ===
                SUPPLIERS_KEY
            ) {

                scheduleSync();
            }
        }
    );


    /* ==========================================
       ERROR HANDLING
    ========================================== */

    function reportError(
        operation,
        error
    ) {

        console.error(
            "❌ Suppliers Firebase error:",
            operation,
            error
        );


        const code =
            String(
                error &&
                error.code ||
                ""
            );


        let message =
            error &&
            error.message
                ? error.message
                : "Supplier Firebase sync failed.";


        if (
            code.includes(
                "permission-denied"
            )
        ) {

            message =
                "Firebase permission denied. Check that the signed-in Firebase user has an active Firestore user profile.";
        }


        if (
            code.includes(
                "unauthenticated"
            )
        ) {

            message =
                "Firebase Authentication is not signed in.";
        }


        showErrorBox(
            operation,
            message
        );
    }


    /* ==========================================
       VISIBLE FIREBASE ERROR
    ========================================== */

    function showErrorBox(
        operation,
        message
    ) {

        let box =
            document.getElementById(
                "supplierFirebaseError"
            );


        if (!box) {

            box =
                document.createElement(
                    "div"
                );


            box.id =
                "supplierFirebaseError";


            box.style.position =
                "fixed";

            box.style.left =
                "12px";

            box.style.right =
                "12px";

            box.style.bottom =
                "12px";

            box.style.zIndex =
                "999999";

            box.style.padding =
                "15px";

            box.style.borderRadius =
                "10px";

            box.style.background =
                "#7f1d1d";

            box.style.color =
                "#ffffff";

            box.style.fontSize =
                "13px";

            box.style.lineHeight =
                "1.5";

            box.style.boxShadow =
                "0 10px 30px rgba(0,0,0,.30)";


            document.body.appendChild(
                box
            );
        }


        box.textContent =
            operation +
            ": " +
            message;


        window.clearTimeout(
            showErrorBox.timer
        );


        showErrorBox.timer =
            window.setTimeout(
                function () {

                    if (box) {

                        box.remove();
                    }
                },
                10000
            );
    }


    /* ==========================================
       PUBLIC API
    ========================================== */

    window.JufelixSuppliersCloud = {

        saveSupplier:
            saveSupplier,

        syncLocal:
            syncLocal,

        listen:
            startListener,

        stop:
            stopCloudListener,

        refresh:
            async function () {

                await syncLocal();

                await startListener();

                return true;
            }
    };


    /* ==========================================
       START
    ========================================== */

    async function startSuppliersCloud() {

        try {

            const firebase =
                await getFirebase();


            console.log(
                "✅ Suppliers Firebase authenticated:",
                firebase.user
                    ? (
                        firebase.user.email ||
                        firebase.user.uid
                    )
                    : firebase.auth.currentUser.uid
            );


            const result =
                await syncLocal();


            console.log(
                "Initial supplier sync:",
                result
            );


            await startListener();


            console.log(
                "✅ Jufelix Suppliers Cloud v701 ready."
            );


        } catch (error) {

            reportError(
                "SUPPLIER CLOUD STARTUP",
                error
            );
        }


        document.dispatchEvent(

            new CustomEvent(
                "jufelix:suppliers-cloud-ready"
            )
        );
    }


    startSuppliersCloud();

})();