/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   PURCHASES CLOUD BRIDGE

   File:
   js/cloud/purchases-cloud.js

   Responsibilities:
   - Sync purchases to Firestore
   - Sync received stock changes safely
   - Sync supplier account changes
   - Preserve branchStock
   - Preserve local product images
========================================== */

import {
    collection,
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


const PRODUCTS_KEY =
    "jufelix_products";

const PURCHASES_KEY =
    "jufelix_v7_purchases";

const SUPPLIERS_KEY =
    "jufelix_v7_suppliers";


let db = null;

let stopPurchases = null;
let stopProducts = null;
let stopSuppliers = null;


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
                            "Firebase was not ready."
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


    data.cloudUpdatedAt =
        serverTimestamp();


    return data;
}


/* ==========================================
   SAVE PURCHASE
========================================== */

async function savePurchase(
    purchase
) {

    const database =
        await waitForDb();


    if (
        !purchase ||
        !purchase.id
    ) {

        throw new Error(
            "Purchase ID is missing."
        );
    }


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
            merge:
                true
        }
    );
}


/* ==========================================
   SAVE PRODUCT
========================================== */

async function saveProduct(
    product
) {

    const database =
        await waitForDb();


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
            merge:
                true
        }
    );
}


/* ==========================================
   SAVE SUPPLIER
========================================== */

async function saveSupplier(
    supplier
) {

    const database =
        await waitForDb();


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
            merge:
                true
        }
    );
}


/* ==========================================
   INITIAL LOCAL SYNC
========================================== */

async function syncLocal(
    purchases,
    suppliers
) {

    const localPurchases =
        Array.isArray(
            purchases
        )
            ? purchases
            : readArray(
                PURCHASES_KEY
            );


    for (
        const purchase of
        localPurchases
    ) {

        if (
            purchase &&
            purchase.id
        ) {

            try {

                await savePurchase(
                    purchase
                );

            } catch (
                error
            ) {

                console.warn(
                    "Existing purchase sync failed:",
                    purchase.id,
                    error
                );
            }
        }
    }


    const localSuppliers =
        Array.isArray(
            suppliers
        )
            ? suppliers
            : readArray(
                SUPPLIERS_KEY
            );


    for (
        const supplier of
        localSuppliers
    ) {

        if (
            supplier &&
            supplier.id
        ) {

            try {

                await saveSupplier(
                    supplier
                );

            } catch (
                error
            ) {

                console.warn(
                    "Existing supplier sync failed:",
                    supplier.id,
                    error
                );
            }
        }
    }
}


/* ==========================================
   REALTIME LISTENERS
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
                                merged
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
                        }
                    );


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
                                mergedProducts
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
                        }
                    );


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
                                merged
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
                        }
                    );
            }
        )
        .catch(
            function (
                error
            ) {

                console.warn(
                    "Purchases cloud listener unavailable:",
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


    localProducts.forEach(
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


    cloudProducts.forEach(
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
        typeof branchStock !==
            "object" ||
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
   CLOUD FIELDS
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

        return [];
    }
}


function saveArray(
    key,
    value
) {

    localStorage.setItem(
        key,
        JSON.stringify(
            value
        )
    );
}


/* ==========================================
   EVENT
========================================== */

function dispatchDataUpdated(
    key,
    value
) {

    document.dispatchEvent(

        new CustomEvent(
            "jufelix:data-updated",

            {
                detail: {

                    key:
                        key,

                    value:
                        value
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

    syncLocal:
        syncLocal,

    listen:
        listen
};


/* ==========================================
   READY
========================================== */

waitForDb()
    .then(
        function () {

            console.log(
                "Jufelix Purchases Cloud ready."
            );
        }
    )
    .catch(
        function (
            error
        ) {

            console.warn(
                "Purchases Cloud starting offline:",
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