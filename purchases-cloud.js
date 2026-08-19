/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   PURCHASES CLOUD BRIDGE

   File:
   js/cloud/purchases-cloud.js

   Version: 705

   Handles:
   + Purchases → Firestore
   + Product stock → Firestore
   + Suppliers → Firestore
   + Same-page local changes
   + Other-tab storage changes
   + Firestore realtime downloads
========================================== */

import {
    collection,
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* ==========================================
   STORAGE KEYS
========================================== */

const PRODUCTS_KEY =
    "jufelix_products";

const PURCHASES_KEY =
    "jufelix_v7_purchases";

const SUPPLIERS_KEY =
    "jufelix_v7_suppliers";


/* ==========================================
   STATE
========================================== */

let db = null;

let stopPurchases = null;
let stopProducts = null;
let stopSuppliers = null;

let purchaseSyncTimer = null;
let productSyncTimer = null;
let supplierSyncTimer = null;


/* ==========================================
   FIREBASE READY
========================================== */

function waitForDb(
    timeout = 15000
) {

    return new Promise(
        function (
            resolve,
            reject
        ) {

            const startedAt =
                Date.now();


            function check() {

                if (
                    window.JufelixFirebase &&
                    window.JufelixFirebase.db
                ) {

                    db =
                        window.JufelixFirebase.db;

                    resolve(
                        db
                    );

                    return;
                }


                if (
                    Date.now() -
                    startedAt >
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
   WAIT FOR FIREBASE AUTH
========================================== */

function waitForFirebaseUser(
    timeout = 10000
) {

    return new Promise(
        function (
            resolve
        ) {

            const startedAt =
                Date.now();


            function check() {

                const firebase =
                    window.JufelixFirebase;


                if (
                    firebase &&
                    firebase.auth &&
                    firebase.auth.currentUser
                ) {

                    resolve(
                        firebase.auth.currentUser
                    );

                    return;
                }


                if (
                    Date.now() -
                    startedAt >
                    timeout
                ) {

                    resolve(
                        null
                    );

                    return;
                }


                setTimeout(
                    check,
                    150
                );
            }


            check();
        }
    );
}


/* ==========================================
   FIREBASE AUTH CHECK
========================================== */

function checkFirebaseUser() {

    const firebase =
        window.JufelixFirebase;


    if (
        !firebase ||
        !firebase.auth
    ) {

        console.warn(
            "⚠️ Firebase Auth object is unavailable."
        );

        return null;
    }


    const user =
        firebase.auth.currentUser;


    if (!user) {

        console.warn(
            "⚠️ No Firebase authenticated user yet."
        );

        return null;
    }


    console.log(
        "✅ Firebase authenticated user:",
        user.uid,
        user.email || ""
    );


    return user;
}


/* ==========================================
   CLEAN FIRESTORE DATA
========================================== */

function cleanValue(
    value
) {

    if (
        value === undefined
    ) {

        return null;
    }


    if (
        value === null ||
        typeof value !== "object"
    ) {

        return value;
    }


    if (
        Array.isArray(
            value
        )
    ) {

        return value.map(
            cleanValue
        );
    }


    const result = {};


    Object.keys(
        value
    ).forEach(
        function (
            key
        ) {

            if (
                value[key] !== undefined
            ) {

                result[key] =
                    cleanValue(
                        value[key]
                    );
            }
        }
    );


    return result;
}


/* ==========================================
   FIREBASE ERROR
========================================== */

function reportFirebaseError(
    operation,
    error
) {

    console.error(
        "===================================="
    );

    console.error(
        "❌ FIREBASE OPERATION FAILED"
    );

    console.error(
        "Operation:",
        operation
    );

    console.error(
        "Code:",
        error &&
        error.code
            ? error.code
            : "unknown"
    );

    console.error(
        "Message:",
        error &&
        error.message
            ? error.message
            : error
    );

    console.error(
        "===================================="
    );


    if (
        error &&
        (
            error.code ===
            "permission-denied" ||

            String(
                error.message || ""
            )
                .toLowerCase()
                .includes(
                    "permission"
                )
        )
    ) {

        console.error(
            "⚠️ Firestore Security Rules rejected this operation."
        );


        if (
            !checkFirebaseUser()
        ) {

            console.error(
                "⚠️ Firebase Authentication is not signed in."
            );
        }
    }
}


/* ==========================================
   PRODUCT PREPARATION
========================================== */

function prepareProductForCloud(
    product
) {

    const data =
        cleanValue(
            product
        ) || {};


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
                typeof value === "string" &&
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


    data.cloudUpdatedAt =
        serverTimestamp();


    return data;
}


/* ==========================================
   SAVE ONE PURCHASE
========================================== */

async function savePurchase(
    purchase
) {

    try {

        const database =
            await waitForDb();


        await waitForFirebaseUser();


        if (
            !purchase ||
            !purchase.id
        ) {

            throw new Error(
                "Purchase ID is missing."
            );
        }


        console.log(
            "☁️ Uploading purchase:",
            purchase.purchaseNo ||
            purchase.id
        );


        await setDoc(

            doc(
                database,
                "purchases",
                String(
                    purchase.id
                )
            ),

            {
                ...cleanValue(
                    purchase
                ),

                cloudUpdatedAt:
                    serverTimestamp()
            },

            {
                merge: true
            }
        );


        console.log(
            "✅ PURCHASE SAVED TO FIREBASE:",
            purchase.purchaseNo ||
            purchase.id
        );


        return true;


    } catch (
        error
    ) {

        reportFirebaseError(
            "SAVE PURCHASE",
            error
        );


        throw error;
    }
}


/* ==========================================
   SAVE ONE PRODUCT
========================================== */

async function saveProduct(
    product
) {

    try {

        const database =
            await waitForDb();


        await waitForFirebaseUser();


        if (
            !product ||
            !product.id
        ) {

            throw new Error(
                "Product ID is missing."
            );
        }


        await setDoc(

            doc(
                database,
                "products",
                String(
                    product.id
                )
            ),

            prepareProductForCloud(
                product
            ),

            {
                merge: true
            }
        );


        console.log(
            "✅ Product stock synced:",
            product.name ||
            product.id
        );


        return true;


    } catch (
        error
    ) {

        reportFirebaseError(
            "SAVE PRODUCT",
            error
        );


        throw error;
    }
}


/* ==========================================
   SAVE ONE SUPPLIER
========================================== */

async function saveSupplier(
    supplier
) {

    try {

        const database =
            await waitForDb();


        await waitForFirebaseUser();


        if (
            !supplier ||
            !supplier.id
        ) {

            throw new Error(
                "Supplier ID is missing."
            );
        }


        await setDoc(

            doc(
                database,
                "suppliers",
                String(
                    supplier.id
                )
            ),

            {
                ...cleanValue(
                    supplier
                ),

                cloudUpdatedAt:
                    serverTimestamp()
            },

            {
                merge: true
            }
        );


        console.log(
            "✅ Supplier synced:",
            supplier.name ||
            supplier.id
        );


        return true;


    } catch (
        error
    ) {

        reportFirebaseError(
            "SAVE SUPPLIER",
            error
        );


        throw error;
    }
}


/* ==========================================
   SYNC ALL PURCHASES
========================================== */

async function syncPurchases() {

    const purchases =
        readArray(
            PURCHASES_KEY
        );


    console.log(
        "☁️ Syncing purchases:",
        purchases.length
    );


    let successful = 0;
    let failed = 0;


    for (
        const purchase of purchases
    ) {

        if (
            !purchase ||
            !purchase.id
        ) {

            continue;
        }


        try {

            await savePurchase(
                purchase
            );

            successful++;


        } catch (
            error
        ) {

            failed++;
        }
    }


    console.log(
        "☁️ Purchase sync completed:",
        {
            successful:
                successful,

            failed:
                failed
        }
    );


    return {
        successful:
            successful,

        failed:
            failed
    };
}


/* ==========================================
   SYNC ALL PRODUCTS
========================================== */

async function syncProducts() {

    const products =
        readArray(
            PRODUCTS_KEY
        );


    for (
        const product of products
    ) {

        if (
            !product ||
            !product.id
        ) {

            continue;
        }


        try {

            await saveProduct(
                product
            );


        } catch (
            error
        ) {

            console.warn(
                "Product sync failed:",
                product.name ||
                product.id
            );
        }
    }
}


/* ==========================================
   SYNC ALL SUPPLIERS
========================================== */

async function syncSuppliers() {

    const suppliers =
        readArray(
            SUPPLIERS_KEY
        );


    for (
        const supplier of suppliers
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


        } catch (
            error
        ) {

            console.warn(
                "Supplier sync failed:",
                supplier.name ||
                supplier.id
            );
        }
    }
}


/* ==========================================
   INITIAL LOCAL SYNC
========================================== */

async function syncLocal() {

    await waitForDb();


    console.log(
        "☁️ Starting Purchases initial cloud sync..."
    );


    const purchaseResult =
        await syncPurchases();


    await syncSuppliers();


    /*
     * Products are deliberately not all
     * uploaded during every startup.
     *
     * Stock changes from purchases are
     * synced when PRODUCTS_KEY changes.
     */


    return {

        purchasesSynced:
            purchaseResult.successful,

        purchasesFailed:
            purchaseResult.failed
    };
}


/* ==========================================
   DEBOUNCED LOCAL CHANGE SYNC
========================================== */

function schedulePurchaseSync() {

    clearTimeout(
        purchaseSyncTimer
    );


    purchaseSyncTimer =
        setTimeout(
            async function () {

                try {

                    console.log(
                        "🔄 Purchase local change detected."
                    );

                    await syncPurchases();


                } catch (
                    error
                ) {

                    reportFirebaseError(
                        "PURCHASE AUTO SYNC",
                        error
                    );
                }
            },
            150
        );
}


function scheduleProductSync() {

    clearTimeout(
        productSyncTimer
    );


    productSyncTimer =
        setTimeout(
            async function () {

                try {

                    console.log(
                        "🔄 Product stock change detected."
                    );

                    await syncProducts();


                } catch (
                    error
                ) {

                    reportFirebaseError(
                        "PRODUCT AUTO SYNC",
                        error
                    );
                }
            },
            250
        );
}


function scheduleSupplierSync() {

    clearTimeout(
        supplierSyncTimer
    );


    supplierSyncTimer =
        setTimeout(
            async function () {

                try {

                    console.log(
                        "🔄 Supplier change detected."
                    );

                    await syncSuppliers();


                } catch (
                    error
                ) {

                    reportFirebaseError(
                        "SUPPLIER AUTO SYNC",
                        error
                    );
                }
            },
            250
        );
}


/* ==========================================
   LISTEN FOR ERP LOCAL CHANGES

   This is the important fix.

   localStorage "storage" events do NOT fire
   in the same browser tab that performed
   localStorage.setItem().

   Purchases.js uses the ERP custom event:
   jufelix:data-updated

   We listen for that event here.
========================================== */

document.addEventListener(
    "jufelix:data-updated",

    function (
        event
    ) {

        const detail =
            event.detail || {};


        /*
         * Do not upload data again when
         * the event came from Firestore.
         */
        if (
            detail.source ===
            "cloud"
        ) {

            return;
        }


        const key =
            detail.key;


        console.log(
            "📡 ERP data update detected:",
            key
        );


        if (
            key === PURCHASES_KEY
        ) {

            schedulePurchaseSync();

            return;
        }


        if (
            key === PRODUCTS_KEY
        ) {

            scheduleProductSync();

            return;
        }


        if (
            key === SUPPLIERS_KEY
        ) {

            scheduleSupplierSync();
        }
    }
);


/* ==========================================
   OTHER TAB / WINDOW CHANGES
========================================== */

window.addEventListener(
    "storage",

    function (
        event
    ) {

        if (
            event.key === PURCHASES_KEY
        ) {

            schedulePurchaseSync();

            return;
        }


        if (
            event.key === PRODUCTS_KEY
        ) {

            scheduleProductSync();

            return;
        }


        if (
            event.key === SUPPLIERS_KEY
        ) {

            scheduleSupplierSync();
        }
    }
);


/* ==========================================
   FIRESTORE REALTIME LISTENERS
========================================== */

function listen(
    onChange
) {

    let cancelled =
        false;


    waitForDb()
        .then(
            function (
                database
            ) {

                if (
                    cancelled
                ) {

                    return;
                }


                /* ==================================
                   PURCHASES
                ================================== */

                stopPurchases =
                    onSnapshot(

                        collection(
                            database,
                            "purchases"
                        ),

                        function (
                            snapshot
                        ) {

                            const cloudRows =
                                snapshot.docs.map(
                                    function (
                                        item
                                    ) {

                                        return {

                                            id:
                                                item.id,

                                            ...removeCloudFields(
                                                item.data()
                                            )
                                        };
                                    }
                                );


                            const merged =
                                mergeRecords(

                                    readArray(
                                        PURCHASES_KEY
                                    ),

                                    cloudRows
                                );


                            saveArray(
                                PURCHASES_KEY,
                                merged
                            );


                            dispatchDataUpdated(
                                PURCHASES_KEY,
                                merged,
                                "cloud"
                            );


                            if (
                                typeof onChange ===
                                "function"
                            ) {

                                onChange(
                                    "purchases",
                                    merged
                                );
                            }
                        },

                        function (
                            error
                        ) {

                            reportFirebaseError(
                                "PURCHASE LISTENER",
                                error
                            );
                        }
                    );


                /* ==================================
                   PRODUCTS
                ================================== */

                stopProducts =
                    onSnapshot(

                        collection(
                            database,
                            "products"
                        ),

                        function (
                            snapshot
                        ) {

                            const cloudProducts =
                                snapshot.docs.map(
                                    function (
                                        item
                                    ) {

                                        return {

                                            id:
                                                item.id,

                                            ...removeCloudFields(
                                                item.data()
                                            )
                                        };
                                    }
                                );


                            const mergedProducts =
                                mergeProductsSafely(

                                    readArray(
                                        PRODUCTS_KEY
                                    ),

                                    cloudProducts
                                );


                            saveArray(
                                PRODUCTS_KEY,
                                mergedProducts
                            );


                            dispatchDataUpdated(
                                PRODUCTS_KEY,
                                mergedProducts,
                                "cloud"
                            );


                            if (
                                typeof onChange ===
                                "function"
                            ) {

                                onChange(
                                    "products",
                                    mergedProducts
                                );
                            }
                        },

                        function (
                            error
                        ) {

                            reportFirebaseError(
                                "PRODUCT LISTENER",
                                error
                            );
                        }
                    );


                /* ==================================
                   SUPPLIERS
                ================================== */

                stopSuppliers =
                    onSnapshot(

                        collection(
                            database,
                            "suppliers"
                        ),

                        function (
                            snapshot
                        ) {

                            const cloudRows =
                                snapshot.docs.map(
                                    function (
                                        item
                                    ) {

                                        return {

                                            id:
                                                item.id,

                                            ...removeCloudFields(
                                                item.data()
                                            )
                                        };
                                    }
                                );


                            const merged =
                                mergeRecords(

                                    readArray(
                                        SUPPLIERS_KEY
                                    ),

                                    cloudRows
                                );


                            saveArray(
                                SUPPLIERS_KEY,
                                merged
                            );


                            dispatchDataUpdated(
                                SUPPLIERS_KEY,
                                merged,
                                "cloud"
                            );


                            if (
                                typeof onChange ===
                                "function"
                            ) {

                                onChange(
                                    "suppliers",
                                    merged
                                );
                            }
                        },

                        function (
                            error
                        ) {

                            reportFirebaseError(
                                "SUPPLIER LISTENER",
                                error
                            );
                        }
                    );
            }
        )
        .catch(
            function (
                error
            ) {

                reportFirebaseError(
                    "START LISTENERS",
                    error
                );
            }
        );


    return function () {

        cancelled =
            true;


        if (
            stopPurchases
        ) {

            stopPurchases();
        }


        if (
            stopProducts
        ) {

            stopProducts();
        }


        if (
            stopSuppliers
        ) {

            stopSuppliers();
        }
    };
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
                ) || {};


            const localBranchStock =
                normalizeBranchStock(
                    localProduct.branchStock
                );


            const cloudBranchStock =
                normalizeBranchStock(
                    cloudProduct.branchStock
                );


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
   GENERIC MERGE
========================================== */

function mergeRecords(
    localRows,
    cloudRows
) {

    const map =
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

                map.set(

                    String(
                        row.id
                    ),

                    {
                        ...row
                    }
                );
            }
        }
    );


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


            map.set(

                id,

                {
                    ...(
                        map.get(
                            id
                        ) || {}
                    ),

                    ...row,

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
   BRANCH STOCK
========================================== */

function normalizeBranchStock(
    branchStock
) {

    if (
        !branchStock ||
        typeof branchStock !== "object" ||
        Array.isArray(
            branchStock
        )
    ) {

        return {};
    }


    const result = {};


    Object.keys(
        branchStock
    ).forEach(
        function (
            key
        ) {

            result[
                String(
                    key
                )
            ] =
                toNumber(
                    branchStock[
                        key
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
            value
        ) {

            return (
                total +
                toNumber(
                    value
                )
            );
        },
        0
    );
}


/* ==========================================
   REMOVE CLOUD FIELDS
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
   LOCAL STORAGE
========================================== */

function readArray(
    key
) {

    try {

        const value =
            localStorage.getItem(
                key
            );


        const parsed =
            value
                ? JSON.parse(
                    value
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
            "Cloud storage read failed:",
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


    } catch (
        error
    ) {

        console.error(
            "Cloud storage save failed:",
            key,
            error
        );
    }
}


/* ==========================================
   ERP UPDATE EVENT
========================================== */

function dispatchDataUpdated(
    key,
    value,
    source = ""
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
                        source
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

    const numberValue =
        Number(
            value
        );


    return Number.isFinite(
        numberValue
    )
        ? numberValue
        : 0;
}


/* ==========================================
   PUBLIC API
========================================== */

window.JufelixPurchasesCloud = {

    savePurchase:
        savePurchase,

    saveProduct:
        saveProduct,

    saveSupplier:
        saveSupplier,

    syncPurchases:
        syncPurchases,

    syncProducts:
        syncProducts,

    syncSuppliers:
        syncSuppliers,

    syncLocal:
        syncLocal,

    listen:
        listen,

    checkFirebaseUser:
        checkFirebaseUser
};


/* ==========================================
   START CLOUD BRIDGE
========================================== */

waitForDb()

    .then(
        async function () {

            console.log(
                "✅ Jufelix Purchases Cloud v705 ready."
            );


            const user =
                await waitForFirebaseUser();


            if (
                user
            ) {

                console.log(
                    "✅ Firebase user ready:",
                    user.uid
                );

            } else {

                console.warn(
                    "⚠️ Firebase user was not detected."
                );
            }


            try {

                const result =
                    await syncLocal();


                console.log(
                    "Initial purchases cloud sync:",
                    result
                );


            } catch (
                error
            ) {

                reportFirebaseError(
                    "INITIAL LOCAL SYNC",
                    error
                );
            }


            listen(
                function (
                    type,
                    records
                ) {

                    console.log(
                        "☁️ Firebase realtime update:",
                        type,
                        records.length
                    );
                }
            );
        }
    )

    .catch(
        function (
            error
        ) {

            reportFirebaseError(
                "PURCHASE CLOUD STARTUP",
                error
            );
        }
    )

    .finally(
        function () {

            document.dispatchEvent(
                new CustomEvent(
                    "jufelix:purchases-cloud-ready"
                )
            );
        }
    );