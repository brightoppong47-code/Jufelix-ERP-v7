/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   DASHBOARD CLOUD BRIDGE

   File:
   js/cloud/dashboard-cloud.js

   Version: 100

   PURPOSE:
   + Firebase → Dashboard realtime sync
   + Products
   + Sales
   + Expenses
   + Customers
   + Suppliers
   + Preserves local product images
   + Prevents Dashboard from uploading data
   + Multi-device dashboard consistency
========================================== */

(function () {

    "use strict";


    /* ==========================================
       STORAGE KEYS
    ========================================== */

    const PRODUCTS_KEY =
        "jufelix_products";

    const SALES_KEY =
        "jufelix_v7_sales";

    const EXPENSES_KEY =
        "jufelix_v7_expenses";

    const CUSTOMERS_KEY =
        "jufelix_v7_customers";

    const SUPPLIERS_KEY =
        "jufelix_v7_suppliers";


    /* ==========================================
       COLLECTIONS
    ========================================== */

    const COLLECTIONS = [

        {
            name:
                "products",

            key:
                PRODUCTS_KEY,

            type:
                "products"
        },

        {
            name:
                "sales",

            key:
                SALES_KEY,

            type:
                "records"
        },

        {
            name:
                "expenses",

            key:
                EXPENSES_KEY,

            type:
                "records"
        },

        {
            name:
                "customers",

            key:
                CUSTOMERS_KEY,

            type:
                "records"
        },

        {
            name:
                "suppliers",

            key:
                SUPPLIERS_KEY,

            type:
                "records"
        }

    ];


    /* ==========================================
       STATE
    ========================================== */

    let firestoreTools =
        null;

    let started =
        false;

    const unsubscribeFunctions =
        [];


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
       FIREBASE READY
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
       LOCAL STORAGE
    ========================================== */

    function readArray(
        key
    ) {

        try {

            const stored =
                localStorage.getItem(
                    key
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
                "Dashboard Cloud read failed:",
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


        } catch (error) {

            console.error(
                "Dashboard Cloud save failed:",
                key,
                error
            );


            return false;
        }
    }


    /* ==========================================
       REMOVE FIREBASE-ONLY FIELDS
    ========================================== */

    function removeCloudFields(
        data
    ) {

        const result = {

            ...(
                data ||
                {}
            )
        };


        delete result.cloudUpdatedAt;


        return result;
    }


    /* ==========================================
       PRODUCT MERGE

       Firebase controls business data and stock.

       Local product image is preserved if
       Firestore does not contain an image.
    ========================================== */

    function mergeProducts(
        localProducts,
        cloudProducts
    ) {

        const localMap =
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

                    localMap.set(

                        String(
                            product.id
                        ),

                        product
                    );
                }
            }
        );


        const result =
            [];


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
                    localMap.get(
                        id
                    ) ||
                    {};


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
                        id
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


                result.push(
                    merged
                );
            }
        );


        /*
         * Keep truly unsynced local products
         * temporarily.
         *
         * Normal Firebase products missing
         * from cloud will not remain forever.
         */

        localMap.forEach(
            function (
                product,
                id
            ) {

                const existsInCloud =
                    cloudProducts.some(
                        function (
                            cloudProduct
                        ) {

                            return (
                                String(
                                    cloudProduct.id
                                ) ===
                                String(
                                    id
                                )
                            );
                        }
                    );


                if (
                    !existsInCloud &&
                    product.localOnly ===
                    true
                ) {

                    result.push(
                        product
                    );
                }
            }
        );


        return result;
    }


    /* ==========================================
       GENERIC RECORD MERGE

       Cloud is authoritative.

       Local-only unsynced records remain
       temporarily if localOnly === true.
    ========================================== */

    function mergeRecords(
        localRows,
        cloudRows
    ) {

        const localMap =
            new Map();


        (
            Array.isArray(
                localRows
            )
                ? localRows
                : []
        ).forEach(
            function (
                row
            ) {

                if (
                    row &&
                    row.id
                ) {

                    localMap.set(

                        String(
                            row.id
                        ),

                        row
                    );
                }
            }
        );


        const result =
            [];


        const cloudIds =
            new Set();


        (
            Array.isArray(
                cloudRows
            )
                ? cloudRows
                : []
        ).forEach(
            function (
                row
            ) {

                if (
                    !row ||
                    !row.id
                ) {

                    return;
                }


                const id =
                    String(
                        row.id
                    );


                cloudIds.add(
                    id
                );


                const localRow =
                    localMap.get(
                        id
                    ) ||
                    {};


                result.push({

                    ...localRow,

                    ...row,

                    id:
                        id
                });
            }
        );


        localMap.forEach(
            function (
                row,
                id
            ) {

                if (
                    cloudIds.has(
                        id
                    )
                ) {

                    return;
                }


                if (
                    row.localOnly ===
                    true
                ) {

                    result.push(
                        row
                    );
                }
            }
        );


        return result;
    }


    /* ==========================================
       DISPATCH UPDATE
    ========================================== */

    function dispatchUpdate(
        key,
        value
    ) {

        const detail = {

            key:
                key,

            value:
                value,

            source:
                "dashboard-cloud"
        };


        document.dispatchEvent(

            new CustomEvent(
                "jufelix:data-updated",

                {
                    detail:
                        detail
                }
            )
        );


        document.dispatchEvent(

            new CustomEvent(
                "jufelix:dataChanged",

                {
                    detail:
                        detail
                }
            )
        );
    }


    /* ==========================================
       START ONE COLLECTION
    ========================================== */

    async function listenCollection(
        configuration
    ) {

        const firebase =
            await getFirebase();


        const tools =
            await getFirestoreTools();


        const unsubscribe =
            tools.onSnapshot(

                tools.collection(
                    firebase.db,
                    configuration.name
                ),

                function (
                    snapshot
                ) {

                    const cloudRows =
                        snapshot.docs.map(
                            function (
                                documentSnapshot
                            ) {

                                const data =
                                    documentSnapshot
                                        .data() ||
                                    {};


                                return {

                                    ...removeCloudFields(
                                        data
                                    ),

                                    id:
                                        String(
                                            data.id ||
                                            documentSnapshot.id
                                        )
                                };
                            }
                        );


                    const localRows =
                        readArray(
                            configuration.key
                        );


                    const merged =
                        configuration.type ===
                        "products"

                            ? mergeProducts(
                                localRows,
                                cloudRows
                            )

                            : mergeRecords(
                                localRows,
                                cloudRows
                            );


                    saveArray(
                        configuration.key,
                        merged
                    );


                    dispatchUpdate(
                        configuration.key,
                        merged
                    );


                    console.log(
                        "☁️ Dashboard synced:",
                        configuration.name,
                        merged.length
                    );
                },

                function (
                    error
                ) {

                    console.error(
                        "❌ Dashboard Firebase listener failed:",
                        configuration.name,
                        error
                    );
                }
            );


        unsubscribeFunctions.push(
            unsubscribe
        );
    }


    /* ==========================================
       START ALL LISTENERS
    ========================================== */

    async function start() {

        if (started) {

            return true;
        }


        started =
            true;


        try {

            await getFirebase();


            for (
                const configuration of
                COLLECTIONS
            ) {

                await listenCollection(
                    configuration
                );
            }


            console.log(
                "✅ Jufelix Dashboard Cloud ready."
            );


            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:dashboard-cloud-ready"
                )
            );


            return true;


        } catch (error) {

            started =
                false;


            console.error(
                "❌ Dashboard Cloud startup failed:",
                error
            );


            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:dashboard-cloud-ready",

                    {
                        detail: {

                            offline:
                                true,

                            error:
                                error.message ||
                                String(
                                    error
                                )
                        }
                    }
                )
            );


            window.setTimeout(
                function () {

                    start();

                },
                3000
            );


            return false;
        }
    }


    /* ==========================================
       STOP
    ========================================== */

    function stop() {

        while (
            unsubscribeFunctions.length
        ) {

            const unsubscribe =
                unsubscribeFunctions.pop();


            try {

                if (
                    typeof unsubscribe ===
                    "function"
                ) {

                    unsubscribe();
                }

            } catch (error) {

                console.warn(
                    "Dashboard listener stop failed:",
                    error
                );
            }
        }


        started =
            false;
    }


    /* ==========================================
       ONLINE AGAIN
    ========================================== */

    window.addEventListener(
        "online",
        function () {

            if (!started) {

                start();
            }
        }
    );


    /* ==========================================
       PUBLIC API
    ========================================== */

    window.JufelixDashboardCloud = {

        start:
            start,

        stop:
            stop,

        refresh:
            function () {

                stop();

                return start();
            }
    };


    /* ==========================================
       AUTO START
    ========================================== */

    window.setTimeout(
        function () {

            start();

        },
        400
    );


})();