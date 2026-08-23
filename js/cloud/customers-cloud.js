/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   CUSTOMERS CLOUD BRIDGE

   File:
   js/cloud/customers-cloud.js

   Version: 703

   + Firebase Authentication aware
   + Local → Firebase sync
   + Firebase → Local realtime sync
   + Customer create/update/delete
   + Multi-device support
   + Safe merge
   + Prevents sync loops
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
       AUTHENTICATED FIREBASE
    ========================================== */

    async function getFirebase() {

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
       CLEAN FIRESTORE DATA
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
                    customer.openingBalance
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
                    customer.totalPurchases
                ),

            totalPaid:
                toNumber(
                    customer.totalPaid
                ),

            totalCreditSales:
                toNumber(
                    customer.totalCreditSales
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
                        tools.serverTimestamp()
                },

                {
                    merge:
                        true
                }
            );


            console.log(
                "✅ CUSTOMER SAVED TO FIREBASE:",
                normalized.name ||
                normalized.id
            );


            return normalized;


        } catch (error) {

            reportError(
                "SAVE CUSTOMER",
                error
            );


            throw createFriendlyError(
                error
            );
        }
    }


    /* ==========================================
       DELETE CUSTOMER
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

            reportError(
                "DELETE CUSTOMER",
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
                "Unable to read customers:",
                error
            );


            return [];
        }
    }


    /* ==========================================
       SAVE CLOUD DATA LOCALLY
    ========================================== */

    function saveCustomersLocally(
        customers,
        source
    ) {

        try {

            applyingCloudData =
                source ===
                "cloud";


            localStorage.setItem(
                CUSTOMERS_KEY,
                JSON.stringify(
                    customers
                )
            );


            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:data-updated",
                    {
                        detail: {

                            key:
                                CUSTOMERS_KEY,

                            value:
                                customers,

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
                                CUSTOMERS_KEY,

                            value:
                                customers,

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
                "Unable to save customers locally:",
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
       LOCAL → FIREBASE SYNC
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


        if (
            syncRunning
        ) {

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


        try {

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
                }
            }


            console.log(
                "☁️ Customer sync completed:",
                {
                    successful,
                    failed
                }
            );


            return {

                successful,
                failed
            };


        } finally {

            syncRunning =
                false;


            if (
                syncAgain
            ) {

                syncAgain =
                    false;


                window.setTimeout(
                    function () {

                        syncLocal()
                            .catch(
                                function (
                                    error
                                ) {

                                    reportError(
                                        "QUEUED CUSTOMER SYNC",
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
       SAFE MERGE
    ========================================== */

    function mergeCustomers(
        localCustomers,
        cloudCustomers
    ) {

        const map =
            new Map();


        (
            Array.isArray(
                localCustomers
            )
                ? localCustomers
                : []
        ).forEach(
            function (
                customer
            ) {

                if (
                    customer &&
                    customer.id
                ) {

                    map.set(

                        String(
                            customer.id
                        ),

                        {
                            ...customer
                        }
                    );
                }
            }
        );


        (
            Array.isArray(
                cloudCustomers
            )
                ? cloudCustomers
                : []
        ).forEach(
            function (
                customer
            ) {

                if (
                    !customer ||
                    !customer.id
                ) {

                    return;
                }


                const id =
                    String(
                        customer.id
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

                        ...customer,

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
       FIREBASE → LOCAL REALTIME
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

                        const cloudCustomers =
                            snapshot.docs.map(
                                function (
                                    documentSnapshot
                                ) {

                                    const data =
                                        documentSnapshot
                                            .data() ||
                                        {};


                                    const customer = {

                                        ...data,

                                        id:
                                            String(
                                                data.id ||
                                                documentSnapshot.id
                                            )
                                    };


                                    delete customer
                                        .cloudUpdatedAt;


                                    return customer;
                                }
                            );


                        const merged =
                            mergeCustomers(

                                readCustomers(),

                                cloudCustomers
                            );


                        saveCustomersLocally(
                            merged,
                            "cloud"
                        );


                        console.log(
                            "☁️ Customer realtime update:",
                            merged.length
                        );
                    },

                    function (
                        error
                    ) {

                        listenerStarted =
                            false;


                        reportError(
                            "CUSTOMER LISTENER",
                            error
                        );
                    }
                );


            return true;


        } catch (error) {

            listenerStarted =
                false;


            reportError(
                "START CUSTOMER LISTENER",
                error
            );


            throw error;
        }
    }


    /* ==========================================
       STOP LISTENER
    ========================================== */

    function stopListenerSync() {

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
       SCHEDULE SYNC
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
                                    "CUSTOMER AUTO SYNC",
                                    error
                                );
                            }
                        );
                },
                400
            );
    }


    /* ==========================================
       ERP DATA EVENTS
    ========================================== */

    document.addEventListener(
        "jufelix:data-updated",
        function (
            event
        ) {

            const detail =
                event.detail ||
                {};


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

            const detail =
                event.detail ||
                {};


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
                applyingCloudData
            ) {

                return;
            }


            if (
                event.key ===
                CUSTOMERS_KEY
            ) {

                scheduleSync();
            }
        }
    );


    window.addEventListener(
        "online",
        function () {

            scheduleSync();
        }
    );


    /* ==========================================
       NUMBER
    ========================================== */

    function toNumber(
        value
    ) {

        if (
            value === undefined ||
            value === null ||
            value === ""
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
       ERROR
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
            )
        ) {

            return new Error(
                "Firebase permission denied. Check the signed-in user's Firestore profile."
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


        return error instanceof Error
            ? error
            : new Error(
                message ||
                "Customer Firebase sync failed."
            );
    }


    function reportError(
        operation,
        error
    ) {

        console.error(
            "❌ Customers Firebase error:",
            operation,
            error
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

        listen:
            startListener,

        stop:
            stopListenerSync,

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

    async function startCustomersCloud() {

        try {

            const firebase =
                await getFirebase();


            console.log(
                "✅ Customers Firebase authenticated:",
                firebase.auth.currentUser
                    ? (
                        firebase.auth.currentUser.email ||
                        firebase.auth.currentUser.uid
                    )
                    : "User"
            );


            const result =
                await syncLocal();


            console.log(
                "Initial customer sync:",
                result
            );


            await startListener();


            console.log(
                "✅ Jufelix Customers Cloud v703 ready."
            );


        } catch (error) {

            reportError(
                "CUSTOMER CLOUD STARTUP",
                error
            );
        }


        document.dispatchEvent(

            new CustomEvent(
                "jufelix:customers-cloud-ready"
            )
        );
    }


    startCustomersCloud();

})();