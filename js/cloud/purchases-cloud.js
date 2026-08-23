/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   AUTHENTICATED PURCHASES CLOUD BRIDGE

   File:
   js/cloud/purchases-cloud.js

   Version: 706

   + Authenticated Firebase readiness
   + Purchases → Firestore
   + Suppliers → Firestore
   + Safe product stock synchronization
   + Realtime purchases
   + Realtime suppliers
   + Realtime inventory
   + Multi-device protection
========================================== */

import {
    collection,
    doc,
    getDoc,
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

const ACTIVE_BRANCH_KEY =
    "jufelix_v7_active_branch";

const CURRENT_USER_KEY =
    "jufelix_v7_current_user";

const DEFAULT_BRANCH_ID =
    "head-office";


/* ==========================================
   STATE
========================================== */

let stopPurchases = null;
let stopProducts = null;
let stopSuppliers = null;

let listenersStarted = false;


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

            const started =
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
   FIREBASE USER CHECK
========================================== */

function checkFirebaseUser() {

    const firebase =
        window.JufelixFirebase;


    if (
        !firebase ||
        !firebase.auth
    ) {

        return null;
    }


    return (
        firebase.auth.currentUser ||
        null
    );
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
                value[key] !==
                undefined
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
   ACTIVE BRANCH
========================================== */

function getActiveBranchId() {

    const activeBranch =
        readObject(
            ACTIVE_BRANCH_KEY
        );


    if (
        activeBranch &&
        (
            activeBranch.id ||
            activeBranch.branchId
        )
    ) {

        return String(
            activeBranch.id ||
            activeBranch.branchId
        );
    }


    const currentUser =
        readObject(
            CURRENT_USER_KEY
        ) ||
        readObject(
            "currentUser"
        );


    if (
        currentUser &&
        currentUser.branchId
    ) {

        return String(
            currentUser.branchId
        );
    }


    return DEFAULT_BRANCH_ID;
}


/* ==========================================
   SAVE ONE PURCHASE
========================================== */

async function savePurchase(
    purchase
) {

    if (
        !purchase ||
        !purchase.id
    ) {

        throw new Error(
            "Purchase ID is missing."
        );
    }


    const firebase =
        await getFirebase();


    console.log(
        "☁️ Uploading purchase:",
        purchase.purchaseNo ||
        purchase.id
    );


    try {

        await setDoc(

            doc(
                firebase.db,
                "purchases",
                String(
                    purchase.id
                )
            ),

            {

                ...cleanValue(
                    purchase
                ),

                id:
                    String(
                        purchase.id
                    ),

                cloudUpdatedAt:
                    serverTimestamp()
            },

            {
                merge:
                    true
            }
        );


        console.log(
            "✅ PURCHASE SAVED TO FIREBASE:",
            purchase.purchaseNo ||
            purchase.id
        );


        return true;


    } catch (error) {

        reportFirebaseError(
            "SAVE PURCHASE",
            error
        );


        throw error;
    }
}


/* ==========================================
   PREPARE PRODUCT
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
   SAFE PRODUCT SAVE

   IMPORTANT:
   Preserve stock for all other branches.
========================================== */

async function saveProduct(
    product,
    branchId
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


    const productId =
        String(
            product.id
        );


    const targetBranchId =
        String(
            branchId ||
            getActiveBranchId()
        );


    const productRef =
        doc(
            firebase.db,
            "products",
            productId
        );


    try {

        const snapshot =
            await getDoc(
                productRef
            );


        const localBranchStock =
            normalizeBranchStock(
                product.branchStock
            );


        let finalBranchStock =
            {};


        if (
            snapshot.exists()
        ) {

            const cloudProduct =
                snapshot.data() ||
                {};


            finalBranchStock = {

                ...normalizeBranchStock(
                    cloudProduct.branchStock
                )
            };


            /*
             * Update only the branch affected
             * by this purchase.
             */

            if (
                Object.prototype
                    .hasOwnProperty.call(
                        localBranchStock,
                        targetBranchId
                    )
            ) {

                finalBranchStock[
                    targetBranchId
                ] =
                    toNumber(
                        localBranchStock[
                            targetBranchId
                        ]
                    );
            }


        } else {

            finalBranchStock = {

                ...localBranchStock
            };
        }


        await setDoc(

            productRef,

            {

                ...prepareProductForCloud(
                    product
                ),

                id:
                    productId,

                branchStock:
                    finalBranchStock,

                quantity:
                    sumBranchStock(
                        finalBranchStock
                    ),

                cloudUpdatedAt:
                    serverTimestamp()
            },

            {
                merge:
                    true
            }
        );


        console.log(
            "✅ PURCHASE STOCK SAVED:",
            product.name ||
            productId
        );


        return true;


    } catch (error) {

        reportFirebaseError(
            "SAVE PRODUCT",
            error
        );


        throw error;
    }
}


/* ==========================================
   SAVE SUPPLIER
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


    try {

        await setDoc(

            doc(
                firebase.db,
                "suppliers",
                String(
                    supplier.id
                )
            ),

            {

                ...cleanValue(
                    supplier
                ),

                id:
                    String(
                        supplier.id
                    ),

                cloudUpdatedAt:
                    serverTimestamp()
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


        return true;


    } catch (error) {

        reportFirebaseError(
            "SAVE SUPPLIER",
            error
        );


        throw error;
    }
}


/* ==========================================
   RETRY LOCAL PURCHASES
========================================== */

async function syncPurchases() {

    await getFirebase();


    const purchases =
        readArray(
            PURCHASES_KEY
        );


    let successful =
        0;

    let failed =
        0;


    for (
        const purchase of
        purchases
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


        } catch (error) {

            failed++;
        }
    }


    return {

        successful,
        failed
    };
}


/* ==========================================
   RETRY LOCAL SUPPLIERS
========================================== */

async function syncSuppliers() {

    await getFirebase();


    const suppliers =
        readArray(
            SUPPLIERS_KEY
        );


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


    return {

        successful,
        failed
    };
}


/* ==========================================
   DO NOT FULL-SYNC PRODUCTS
========================================== */

async function syncProducts() {

    /*
     * IMPORTANT:
     *
     * We intentionally do NOT upload every
     * local product from this device.
     *
     * Purchases.js should call saveProduct()
     * for the product that was actually changed.
     */

    console.log(
        "Full product upload prevented for multi-device safety."
    );


    return {

        successful:
            0,

        failed:
            0,

        prevented:
            true
    };
}


/* ==========================================
   LOCAL RETRY
========================================== */

async function syncLocal() {

    await getFirebase();


    const purchases =
        await syncPurchases();


    const suppliers =
        await syncSuppliers();


    return {

        purchasesSynced:
            purchases.successful,

        purchasesFailed:
            purchases.failed,

        suppliersSynced:
            suppliers.successful,

        suppliersFailed:
            suppliers.failed
    };
}


/* ==========================================
   REALTIME LISTENERS
========================================== */

function listen(
    onChange
) {

    if (
        listenersStarted
    ) {

        return function () {};
    }


    listenersStarted =
        true;


    let cancelled =
        false;


    getFirebase()
        .then(
            function (
                firebase
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
                            firebase.db,
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
                                                String(
                                                    item.id
                                                ),

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
                            firebase.db,
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
                                                String(
                                                    item.id
                                                ),

                                            ...removeCloudFields(
                                                item.data()
                                            )
                                        };
                                    }
                                );


                            const merged =
                                mergeProductsSafely(

                                    readArray(
                                        PRODUCTS_KEY
                                    ),

                                    cloudProducts
                                );


                            saveArray(
                                PRODUCTS_KEY,
                                merged
                            );


                            dispatchDataUpdated(
                                PRODUCTS_KEY,
                                merged,
                                "cloud"
                            );


                            if (
                                typeof onChange ===
                                    "function"
                            ) {

                                onChange(
                                    "products",
                                    merged
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
                            firebase.db,
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
                                                String(
                                                    item.id
                                                ),

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

                listenersStarted =
                    false;


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
            typeof stopPurchases ===
                "function"
        ) {

            stopPurchases();
        }


        if (
            typeof stopProducts ===
                "function"
        ) {

            stopProducts();
        }


        if (
            typeof stopSuppliers ===
                "function"
        ) {

            stopSuppliers();
        }


        stopPurchases =
            null;

        stopProducts =
            null;

        stopSuppliers =
            null;

        listenersStarted =
            false;
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
                ) ||
                {};


            const cloudBranchStock =
                normalizeBranchStock(
                    cloudProduct.branchStock
                );


            const localImage =
                localProduct.image ||
                localProduct.imageData ||
                localProduct.photo ||
                "";


            const cloudImage =
                cloudProduct.image ||
                cloudProduct.imageUrl ||
                "";


            let finalBranchStock =
                cloudBranchStock;


            if (
                Object.keys(
                    finalBranchStock
                ).length ===
                0
            ) {

                finalBranchStock =
                    normalizeBranchStock(
                        localProduct.branchStock
                    );
            }


            const merged = {

                ...localProduct,

                ...cloudProduct,

                id:
                    id,

                branchStock:
                    finalBranchStock,

                quantity:
                    sumBranchStock(
                        finalBranchStock
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
   GENERIC RECORD MERGE
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
                        ) ||
                        {}
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


    } catch (error) {

        console.error(
            "Cloud storage read failed:",
            key,
            error
        );


        return [];
    }
}


function readObject(
    key
) {

    try {

        const stored =
            localStorage.getItem(
                key
            );


        if (!stored) {

            return null;
        }


        const parsed =
            JSON.parse(
                stored
            );


        return (
            parsed &&
            typeof parsed ===
                "object" &&
            !Array.isArray(
                parsed
            )
        )
            ? parsed
            : null;


    } catch (error) {

        return null;
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
            "Cloud storage save failed:",
            key,
            error
        );


        return false;
    }
}


/* ==========================================
   ERP UPDATE EVENT
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

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return 0;
    }


    const cleaned =
        typeof value ===
            "string"
            ? value
                .replace(
                    /,/g,
                    ""
                )
                .trim()
            : value;


    const number =
        Number(
            cleaned
        );


    return Number.isFinite(
        number
    )
        ? number
        : 0;
}


/* ==========================================
   FIREBASE ERROR
========================================== */

function reportFirebaseError(
    operation,
    error
) {

    console.error(
        "❌ Firebase operation failed:",
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
            : "Firebase operation failed.";


    if (
        code.includes(
            "permission-denied"
        )
    ) {

        message =
            "Firebase permission denied. Check that this Firebase user has an active Firestore user profile.";
    }


    if (
        code.includes(
            "unauthenticated"
        )
    ) {

        message =
            "Firebase Authentication is not signed in.";
    }


    showFirebaseError(
        operation,
        message
    );
}


/* ==========================================
   VISIBLE ERROR
========================================== */

function showFirebaseError(
    operation,
    message
) {

    let box =
        document.getElementById(
            "purchaseFirebaseError"
        );


    if (!box) {

        box =
            document.createElement(
                "div"
            );


        box.id =
            "purchaseFirebaseError";


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


        document.body.appendChild(
            box
        );
    }


    box.textContent =
        operation +
        ": " +
        message;


    clearTimeout(
        showFirebaseError.timer
    );


    showFirebaseError.timer =
        setTimeout(
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
   START
========================================== */

async function startPurchasesCloud() {

    try {

        const firebase =
            await getFirebase();


        console.log(
            "✅ Purchases Firebase authenticated:",
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
            "Initial purchases sync:",
            result
        );


        listen(
            function (
                type,
                records
            ) {

                console.log(
                    "☁️ Purchases realtime:",
                    type,
                    records.length
                );
            }
        );


    } catch (error) {

        reportFirebaseError(
            "PURCHASE CLOUD STARTUP",
            error
        );
    }


    document.dispatchEvent(

        new CustomEvent(
            "jufelix:purchases-cloud-ready"
        )
    );
}


startPurchasesCloud();