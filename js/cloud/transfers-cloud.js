/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   TWO-WAY TRANSFERS CLOUD BRIDGE

   File:
   js/cloud/transfers-cloud.js

   Version: 801

   + Firebase Authentication aware
   + Local → Firebase transfer sync
   + Firebase → Local realtime sync
   + Multi-device transfer history
   + Product stock sync support
   + Safe local/cloud merge
   + Prevents duplicate transfer records
   + Prevents sync loops
   + Acode / APK friendly
========================================== */

(function () {

    "use strict";


    /* ==========================================
       CONSTANTS
    ========================================== */

    const TRANSFERS_KEY =
        "jufelix_v7_transfers";

    const PRODUCTS_KEY =
        "jufelix_products";

    const TRANSFERS_COLLECTION =
        "transfers";

    const PRODUCTS_COLLECTION =
        "products";


    /* ==========================================
       STATE
    ========================================== */

    let firestoreTools =
        null;

    let transferSyncTimer =
        null;

    let stopTransfersListener =
        null;

    let stopProductsListener =
        null;

    let listenersStarted =
        false;

    let applyingCloudData =
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
       AUTHENTICATED FIREBASE
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
         * Compatibility fallback.
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
       PRODUCT PREPARATION
    ========================================== */

    function prepareProduct(
        product
    ) {

        const data =
            cleanData(
                product
            ) ||
            {};


        /*
         * Keep large Base64 images local.
         */

        [
            "image",
            "imageData",
            "photo"
        ].forEach(
            function (
                field
            ) {

                const value =
                    data[field];


                if (
                    typeof value ===
                        "string" &&
                    value.startsWith(
                        "data:image/"
                    )
                ) {

                    delete data[field];

                    data.imageStoredLocally =
                        true;
                }
            }
        );


        return data;
    }


    /* ==========================================
       SAVE TRANSFER
    ========================================== */

    async function saveTransfer(
        transfer
    ) {

        if (
            !transfer ||
            !transfer.id
        ) {

            throw new Error(
                "Transfer ID is missing."
            );
        }


        const firebase =
            await getFirebase();


        const tools =
            await getFirestoreTools();


        try {

            await tools.setDoc(

                tools.doc(
                    firebase.db,
                    TRANSFERS_COLLECTION,
                    String(
                        transfer.id
                    )
                ),

                {

                    ...cleanData(
                        transfer
                    ),

                    id:
                        String(
                            transfer.id
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
                "✅ TRANSFER SAVED TO FIREBASE:",
                transfer.transferNumber ||
                transfer.id
            );


            return true;


        } catch (error) {

            reportError(
                "SAVE TRANSFER",
                error
            );


            throw error;
        }
    }


    /* ==========================================
       SAVE PRODUCT STOCK
    ========================================== */

    async function saveProduct(
        product
    ) {

        if (
            !product ||
            !product.id
        ) {

            throw new Error(
                "Product ID is missing."
            );
        }


        const firebase =
            await getFirebase();


        const tools =
            await getFirestoreTools();


        try {

            await tools.setDoc(

                tools.doc(
                    firebase.db,
                    PRODUCTS_COLLECTION,
                    String(
                        product.id
                    )
                ),

                {

                    ...prepareProduct(
                        product
                    ),

                    id:
                        String(
                            product.id
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
                "✅ TRANSFER STOCK SAVED TO FIREBASE:",
                product.name ||
                product.id
            );


            return true;


        } catch (error) {

            reportError(
                "SAVE TRANSFER STOCK",
                error
            );


            throw error;
        }
    }


    /* ==========================================
       READ LOCAL TRANSFERS
    ========================================== */

    function readTransfers() {

        return readArray(
            TRANSFERS_KEY
        );
    }


    /* ==========================================
       LOCAL → FIREBASE TRANSFER SYNC
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


        const transfers =
            readTransfers();


        let successful =
            0;

        let failed =
            0;


        for (
            const transfer of
            transfers
        ) {

            if (
                !transfer ||
                !transfer.id
            ) {

                continue;
            }


            try {

                await saveTransfer(
                    transfer
                );


                successful++;


            } catch (error) {

                failed++;
            }
        }


        console.log(
            "☁️ Transfer sync finished:",
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
       SAFE TRANSFER MERGE
    ========================================== */

    function mergeTransfers(
        localTransfers,
        cloudTransfers
    ) {

        const map =
            new Map();


        (
            Array.isArray(
                localTransfers
            )
                ? localTransfers
                : []
        ).forEach(
            function (
                transfer
            ) {

                if (
                    transfer &&
                    transfer.id
                ) {

                    map.set(

                        String(
                            transfer.id
                        ),

                        {
                            ...transfer
                        }
                    );
                }
            }
        );


        (
            Array.isArray(
                cloudTransfers
            )
                ? cloudTransfers
                : []
        ).forEach(
            function (
                transfer
            ) {

                if (
                    !transfer ||
                    !transfer.id
                ) {

                    return;
                }


                const id =
                    String(
                        transfer.id
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

                        ...transfer,

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
       SAFE PRODUCT MERGE
    ========================================== */

    function mergeProductsSafely(
        localProducts,
        cloudProducts
    ) {

        const map =
            new Map();


        (
            Array.isArray(
                localProducts
            )
                ? localProducts
                : []
        ).forEach(
            function (
                product
            ) {

                if (
                    product &&
                    product.id
                ) {

                    map.set(

                        String(
                            product.id
                        ),

                        {
                            ...product
                        }
                    );
                }
            }
        );


        (
            Array.isArray(
                cloudProducts
            )
                ? cloudProducts
                : []
        ).forEach(
            function (
                cloudProduct
            ) {

                if (
                    !cloudProduct ||
                    !cloudProduct.id
                ) {

                    return;
                }


                const id =
                    String(
                        cloudProduct.id
                    );


                const localProduct =
                    map.get(
                        id
                    ) ||
                    {};


                const localBranchStock =
                    normalizeBranchStock(
                        localProduct.branchStock
                    );


                const cloudBranchStock =
                    normalizeBranchStock(
                        cloudProduct.branchStock
                    );


                /*
                 * Cloud branch balances win.
                 * Local-only branches are preserved.
                 */

                const mergedBranchStock = {

                    ...localBranchStock,

                    ...cloudBranchStock
                };


                const localImage =
                    localProduct.image ||
                    localProduct.imageData ||
                    localProduct.photo ||
                    "";


                const cloudImage =
                    cloudProduct.image ||
                    cloudProduct.imageUrl ||
                    "";


                const merged = {

                    ...localProduct,

                    ...cloudProduct,

                    id:
                        id,

                    branchStock:
                        mergedBranchStock,

                    quantity:
                        sumBranchStock(
                            mergedBranchStock
                        )
                };


                if (
                    cloudImage
                ) {

                    merged.image =
                        cloudImage;

                } else if (
                    localImage
                ) {

                    merged.image =
                        localImage;
                }


                map.set(
                    id,
                    merged
                );
            }
        );


        return Array.from(
            map.values()
        );
    }


    /* ==========================================
       SAVE CLOUD TRANSFERS LOCALLY
    ========================================== */

    function saveTransfersLocally(
        transfers
    ) {

        try {

            applyingCloudData =
                true;


            saveArray(
                TRANSFERS_KEY,
                transfers
            );


            dispatchDataUpdated(
                TRANSFERS_KEY,
                transfers,
                "cloud"
            );


            console.log(
                "✅ Transfers saved locally:",
                transfers.length
            );


        } finally {

            window.setTimeout(
                function () {

                    applyingCloudData =
                        false;
                },
                100
            );
        }
    }


    /* ==========================================
       SAVE CLOUD PRODUCTS LOCALLY
    ========================================== */

    function saveProductsLocally(
        products
    ) {

        try {

            applyingCloudData =
                true;


            saveArray(
                PRODUCTS_KEY,
                products
            );


            dispatchDataUpdated(
                PRODUCTS_KEY,
                products,
                "cloud"
            );


            /*
             * Inventory branch viewer already
             * understands this event.
             */

            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:cloud-products-updated",
                    {
                        detail: {

                            products:
                                products
                        }
                    }
                )
            );


        } finally {

            window.setTimeout(
                function () {

                    applyingCloudData =
                        false;
                },
                100
            );
        }
    }


    /* ==========================================
       START REALTIME LISTENERS
    ========================================== */

    async function startListeners() {

        if (
            listenersStarted
        ) {

            return true;
        }


        const firebase =
            await getFirebase();


        const tools =
            await getFirestoreTools();


        listenersStarted =
            true;


        /* ======================================
           TRANSFERS LISTENER
        ====================================== */

        stopTransfersListener =
            tools.onSnapshot(

                tools.collection(
                    firebase.db,
                    TRANSFERS_COLLECTION
                ),

                function (
                    snapshot
                ) {

                    const cloudTransfers =
                        snapshot.docs.map(
                            function (
                                documentSnapshot
                            ) {

                                const data =
                                    documentSnapshot
                                        .data() ||
                                    {};


                                const transfer = {

                                    ...data,

                                    id:
                                        String(
                                            data.id ||
                                            documentSnapshot.id
                                        )
                                };


                                delete transfer
                                    .cloudUpdatedAt;


                                return transfer;
                            }
                        );


                    const merged =
                        mergeTransfers(

                            readTransfers(),

                            cloudTransfers
                        );


                    saveTransfersLocally(
                        merged
                    );


                    console.log(
                        "☁️ Transfer realtime update:",
                        merged.length
                    );
                },

                function (
                    error
                ) {

                    reportError(
                        "TRANSFER LISTENER",
                        error
                    );
                }
            );


        /* ======================================
           PRODUCTS LISTENER

           This makes transferred stock appear
           on another device automatically.
        ====================================== */

        stopProductsListener =
            tools.onSnapshot(

                tools.collection(
                    firebase.db,
                    PRODUCTS_COLLECTION
                ),

                function (
                    snapshot
                ) {

                    const cloudProducts =
                        snapshot.docs.map(
                            function (
                                documentSnapshot
                            ) {

                                const data =
                                    documentSnapshot
                                        .data() ||
                                    {};


                                const product = {

                                    ...data,

                                    id:
                                        String(
                                            data.id ||
                                            documentSnapshot.id
                                        )
                                };


                                delete product
                                    .cloudUpdatedAt;


                                return product;
                            }
                        );


                    const mergedProducts =
                        mergeProductsSafely(

                            readArray(
                                PRODUCTS_KEY
                            ),

                            cloudProducts
                        );


                    saveProductsLocally(
                        mergedProducts
                    );


                    console.log(
                        "☁️ Transfer product stock update:",
                        mergedProducts.length
                    );
                },

                function (
                    error
                ) {

                    reportError(
                        "TRANSFER PRODUCT LISTENER",
                        error
                    );
                }
            );


        return true;
    }


    /* ==========================================
       STOP REALTIME LISTENERS
    ========================================== */

    function stopListeners() {

        if (
            typeof stopTransfersListener ===
                "function"
        ) {

            stopTransfersListener();
        }


        if (
            typeof stopProductsListener ===
                "function"
        ) {

            stopProductsListener();
        }


        stopTransfersListener =
            null;

        stopProductsListener =
            null;

        listenersStarted =
            false;
    }


    /* ==========================================
       DELAYED LOCAL TRANSFER SYNC
    ========================================== */

    function scheduleTransferSync() {

        if (
            applyingCloudData
        ) {

            return;
        }


        window.clearTimeout(
            transferSyncTimer
        );


        transferSyncTimer =
            window.setTimeout(
                function () {

                    syncLocal()
                        .catch(
                            function (
                                error
                            ) {

                                reportError(
                                    "TRANSFER AUTO SYNC",
                                    error
                                );
                            }
                        );
                },
                400
            );
    }


    /* ==========================================
       ERP CHANGE EVENTS
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
                TRANSFERS_KEY
            ) {

                scheduleTransferSync();
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
                TRANSFERS_KEY
            ) {

                scheduleTransferSync();
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
                TRANSFERS_KEY
            ) {

                scheduleTransferSync();
            }
        }
    );


    window.addEventListener(
        "online",
        function () {

            scheduleTransferSync();
        }
    );


    /* ==========================================
       BRANCH STOCK HELPERS
    ========================================== */

    function normalizeBranchStock(
        branchStock
    ) {

        if (
            !branchStock ||
            typeof branchStock !==
                "object" ||
            Array.isArray(
                branchStock
            )
        ) {

            return {};
        }


        const result =
            {};


        Object.keys(
            branchStock
        ).forEach(
            function (
                branchId
            ) {

                result[
                    String(
                        branchId
                    )
                ] =
                    toNumber(
                        branchStock[
                            branchId
                        ]
                    );
            }
        );


        return result;
    }


    function sumBranchStock(
        branchStock
    ) {

        return Object.values(
            normalizeBranchStock(
                branchStock
            )
        ).reduce(
            function (
                total,
                quantity
            ) {

                return (
                    total +
                    toNumber(
                        quantity
                    )
                );
            },
            0
        );
    }


    /* ==========================================
       STORAGE
    ========================================== */

    function readArray(
        key
    ) {

        try {

            const stored =
                localStorage.getItem(
                    key
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
                "Unable to read:",
                key,
                error
            );


            return [];
        }
    }


    function saveArray(
        key,
        value
    ) {

        try {

            localStorage.setItem(
                key,
                JSON.stringify(
                    value
                )
            );


            return true;


        } catch (
            error
        ) {

            console.error(
                "Unable to save:",
                key,
                error
            );


            return false;
        }
    }


    /* ==========================================
       ERP DATA EVENT
    ========================================== */

    function dispatchDataUpdated(
        key,
        value,
        source
    ) {

        document.dispatchEvent(

            new CustomEvent(
                "jufelix:data-updated",
                {
                    detail: {

                        key:
                            key,

                        value:
                            value,

                        source:
                            source ||
                            ""
                    }
                }
            )
        );
    }


    /* ==========================================
       NUMBER
    ========================================== */

    function toNumber(
        value
    ) {

        const number =
            Number(
                value
            );


        return Number.isFinite(
            number
        )
            ? number
            : 0;
    }


    /* ==========================================
       ERROR HANDLING
    ========================================== */

    function reportError(
        operation,
        error
    ) {

        console.error(
            "❌ Transfers Firebase error:",
            operation,
            error
        );


        const code =
            String(
                error &&
                error.code ||
                ""
            );


        if (
            code.includes(
                "permission-denied"
            )
        ) {

            showError(
                "Firebase permission denied. Check that the signed-in user has an active Firestore profile."
            );

            return;
        }


        if (
            code.includes(
                "unauthenticated"
            )
        ) {

            showError(
                "Firebase Authentication is not signed in."
            );

            return;
        }


        showError(
            error &&
            error.message
                ? error.message
                : "Transfer Firebase sync failed."
        );
    }


    function showError(
        message
    ) {

        let box =
            document.getElementById(
                "transferFirebaseError"
            );


        if (!box) {

            box =
                document.createElement(
                    "div"
                );


            box.id =
                "transferFirebaseError";

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
                "14px";

            box.style.borderRadius =
                "10px";

            box.style.background =
                "#7f1d1d";

            box.style.color =
                "#ffffff";

            box.style.fontSize =
                "13px";


            document.body.appendChild(
                box
            );
        }


        box.textContent =
            message;


        window.clearTimeout(
            showError.timer
        );


        showError.timer =
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

    window.JufelixTransfersCloud = {

        saveTransfer:
            saveTransfer,

        saveProduct:
            saveProduct,

        syncLocal:
            syncLocal,

        listen:
            startListeners,

        stop:
            stopListeners,

        refresh:
            async function () {

                await syncLocal();

                await startListeners();

                return true;
            }
    };


    /* ==========================================
       START CLOUD
    ========================================== */

    async function startTransfersCloud() {

        try {

            const firebase =
                await getFirebase();


            console.log(
                "✅ Transfers Firebase authenticated:",
                firebase.auth.currentUser
                    ? (
                        firebase.auth.currentUser.email ||
                        firebase.auth.currentUser.uid
                    )
                    : "User"
            );


            /*
             * Upload existing local transfer
             * records first.
             */

            const result =
                await syncLocal();


            console.log(
                "Initial transfer sync:",
                result
            );


            /*
             * Start true two-way realtime sync.
             */

            await startListeners();


            console.log(
                "✅ Jufelix Transfers Cloud v801 ready."
            );


        } catch (error) {

            reportError(
                "TRANSFER CLOUD STARTUP",
                error
            );
        }


        document.dispatchEvent(

            new CustomEvent(
                "jufelix:transfers-cloud-ready"
            )
        );
    }


    startTransfersCloud();


})();