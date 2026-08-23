/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   TRANSACTION-SAFE TWO-WAY SALES CLOUD

   File:
   js/cloud/sales-cloud.js

   Version: 707

   + Firebase Authentication aware
   + Realtime sales across devices
   + Realtime inventory across devices
   + Firestore transaction stock deduction
   + Same-branch simultaneous-sale protection
   + Multi-branch stock protection
   + Idempotent sale upload
   + Prevent duplicate stock deduction
   + Product deletion awareness
   + Preserves local Base64 images
   + Offline-sale retry support
   + Cloud-source loop protection
========================================== */

import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    runTransaction,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* ==========================================
   CONSTANTS
========================================== */

const PRODUCTS_KEY =
    "jufelix_products";

const SALES_KEY =
    "jufelix_v7_sales";

const ACTIVE_BRANCH_KEY =
    "jufelix_v7_active_branch";

const CURRENT_USER_KEY =
    "jufelix_v7_current_user";

const DEFAULT_BRANCH_ID =
    "head-office";


/* ==========================================
   STATE
========================================== */

let database =
    null;

let started =
    false;

let productsUnsubscribe =
    null;

let salesUnsubscribe =
    null;

const listeners =
    new Set();


/* ==========================================
   FIREBASE
========================================== */

async function getFirebase() {

    if (
        typeof window
            .waitForJufelixFirebase ===
        "function"
    ) {

        const firebase =
            await window
                .waitForJufelixFirebase({

                    requireUser:
                        true,

                    timeout:
                        20000
                });


        database =
            firebase.db;


        return firebase;
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

                    database =
                        firebase.db;


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
            "Sales Cloud read error:",
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
            "Sales Cloud save error:",
            key,
            error
        );


        return false;
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


/* ==========================================
   ACTIVE BRANCH
========================================== */

function getActiveBranchId() {

    const activeBranch =
        readObject(
            ACTIVE_BRANCH_KEY
        );


    if (activeBranch) {

        const value =

            activeBranch.id ||

            activeBranch.branchId;


        if (value) {

            return String(
                value
            );
        }
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


    const result =
        {};


    Object.keys(
        value
    ).forEach(
        function (key) {

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
        function (key) {

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
    )
        .reduce(
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
        function (field) {

            const value =
                data[field];


            if (
                typeof value ===
                    "string" &&
                value.startsWith(
                    "data:image/"
                )
            ) {

                delete data[
                    field
                ];


                data.imageStoredLocally =
                    true;
            }
        }
    );


    return data;
}


/* ==========================================
   TRANSACTION-SAFE SALE

   This is the main protection.

   Firebase checks the newest stock before
   committing the sale.

   If two phones sell at the same time,
   Firestore retries the transaction using
   the latest stock.
========================================== */

async function commitSale(
    sale
) {

    if (
        !sale ||
        !sale.id
    ) {

        throw new Error(
            "Sale ID is missing."
        );
    }


    if (
        !Array.isArray(
            sale.items
        ) ||
        sale.items.length ===
        0
    ) {

        throw new Error(
            "Sale does not contain products."
        );
    }


    const firebase =
        await getFirebase();


    const db =
        firebase.db;


    const saleId =
        String(
            sale.id
        );


    const saleRef =
        doc(
            db,
            "sales",
            saleId
        );


    const branchId =
        String(
            sale.branchId ||
            getActiveBranchId()
        );


    try {

        const result =
            await runTransaction(

                db,

                async function (
                    transaction
                ) {

                    /*
                     * First check whether this sale
                     * already exists.
                     *
                     * This makes offline retries safe.
                     */

                    const existingSale =
                        await transaction.get(
                            saleRef
                        );


                    if (
                        existingSale.exists()
                    ) {

                        console.log(
                            "ℹ️ Sale already committed:",
                            saleId
                        );


                        return {

                            alreadyCommitted:
                                true,

                            saleId:
                                saleId
                        };
                    }


                    /*
                     * FIRESTORE TRANSACTIONS REQUIRE
                     * ALL READS BEFORE WRITES.
                     */

                    const productRecords =
                        [];


                    for (
                        const saleItem of
                        sale.items
                    ) {

                        if (
                            !saleItem ||
                            !saleItem.productId
                        ) {

                            throw new Error(
                                "A sale product ID is missing."
                            );
                        }


                        const productId =
                            String(
                                saleItem.productId
                            );


                        const productRef =
                            doc(
                                db,
                                "products",
                                productId
                            );


                        const productSnapshot =
                            await transaction.get(
                                productRef
                            );


                        if (
                            !productSnapshot.exists()
                        ) {

                            throw new Error(
                                (
                                    saleItem.productName ||
                                    "Product"
                                ) +
                                " does not exist in Firebase inventory."
                            );
                        }


                        productRecords.push({

                            saleItem:
                                saleItem,

                            productId:
                                productId,

                            productRef:
                                productRef,

                            product:
                                productSnapshot.data() ||
                                {}
                        });
                    }


                    /*
                     * Now validate every product.
                     */

                    const updates =
                        [];


                    for (
                        const record of
                        productRecords
                    ) {

                        const quantitySold =
                            toNumber(
                                record
                                    .saleItem
                                    .quantity
                            );


                        if (
                            quantitySold <= 0
                        ) {

                            throw new Error(
                                "Sale quantity must be greater than zero."
                            );
                        }


                        const branchStock =
                            normalizeBranchStock(
                                record
                                    .product
                                    .branchStock
                            );


                        /*
                         * Compatibility with older
                         * Head Office inventory.
                         */

                        if (
                            Object.keys(
                                branchStock
                            ).length ===
                                0 &&
                            branchId ===
                                DEFAULT_BRANCH_ID
                        ) {

                            branchStock[
                                DEFAULT_BRANCH_ID
                            ] =
                                toNumber(
                                    record
                                        .product
                                        .quantity
                                );
                        }


                        const currentStock =
                            toNumber(
                                branchStock[
                                    branchId
                                ]
                            );


                        if (
                            quantitySold >
                            currentStock
                        ) {

                            throw new Error(
                                (
                                    record
                                        .saleItem
                                        .productName ||
                                    record.productId
                                ) +
                                " has only " +
                                currentStock +
                                " available at this branch."
                            );
                        }


                        branchStock[
                            branchId
                        ] =
                            currentStock -
                            quantitySold;


                        updates.push({

                            productRef:
                                record.productRef,

                            branchStock:
                                branchStock,

                            quantity:
                                sumBranchStock(
                                    branchStock
                                )
                        });
                    }


                    /*
                     * All stock validations passed.
                     *
                     * Now perform writes.
                     */

                    for (
                        const update of
                        updates
                    ) {

                        transaction.update(

                            update.productRef,

                            {
                                branchStock:
                                    update.branchStock,

                                quantity:
                                    update.quantity,

                                updatedAt:
                                    new Date()
                                        .toISOString(),

                                cloudUpdatedAt:
                                    serverTimestamp()
                            }
                        );
                    }


                    transaction.set(

                        saleRef,

                        {
                            ...cleanValue(
                                sale
                            ),

                            id:
                                saleId,

                            branchId:
                                branchId,

                            cloudUpdatedAt:
                                serverTimestamp()
                        }
                    );


                    return {

                        alreadyCommitted:
                            false,

                        saleId:
                            saleId
                    };
                }
            );


        console.log(
            result.alreadyCommitted
                ? "✅ Existing Firebase sale confirmed:"
                : "✅ Sale + stock transaction committed:",
            sale.receiptNumber ||
            saleId
        );


        return result;


    } catch (error) {

        console.error(
            "❌ Sale transaction failed:",
            error
        );


        throw createFriendlyError(
            error
        );
    }
}


/* ==========================================
   SAVE SALE COMPATIBILITY

   Existing modules may still call saveSale().
========================================== */

async function saveSale(
    sale
) {

    /*
     * Completed POS sales with items should
     * use the transaction-safe path.
     */

    if (
        sale &&
        Array.isArray(
            sale.items
        ) &&
        sale.items.length >
        0
    ) {

        return commitSale(
            sale
        );
    }


    /*
     * Legacy sale compatibility.
     */

    const firebase =
        await getFirebase();


    if (
        !sale ||
        !sale.id
    ) {

        throw new Error(
            "Sale ID is missing."
        );
    }


    await setDoc(

        doc(
            firebase.db,
            "sales",
            String(
                sale.id
            )
        ),

        {
            ...cleanValue(
                sale
            ),

            id:
                String(
                    sale.id
                ),

            cloudUpdatedAt:
                serverTimestamp()
        },

        {
            merge:
                true
        }
    );


    return true;
}


/* ==========================================
   SAVE PRODUCT COMPATIBILITY

   Kept for older Jufelix modules.

   New completed sales should NOT depend
   on this function for stock deduction.
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


    const productId =
        String(
            product.id
        );


    const productRef =
        doc(
            firebase.db,
            "products",
            productId
        );


    const snapshot =
        await getDoc(
            productRef
        );


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "Product does not exist in Firebase."
        );
    }


    const cloudProduct =
        snapshot.data() ||
        {};


    const cloudBranchStock =
        normalizeBranchStock(
            cloudProduct.branchStock
        );


    const localBranchStock =
        normalizeBranchStock(
            product.branchStock
        );


    const branchId =
        String(
            product.saleBranchId ||
            product.activeBranchId ||
            getActiveBranchId()
        );


    if (
        Object.prototype
            .hasOwnProperty.call(
                localBranchStock,
                branchId
            )
    ) {

        cloudBranchStock[
            branchId
        ] =
            localBranchStock[
                branchId
            ];
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
                cloudBranchStock,

            quantity:
                sumBranchStock(
                    cloudBranchStock
                ),

            cloudUpdatedAt:
                serverTimestamp()
        },

        {
            merge:
                true
        }
    );


    return true;
}


/* ==========================================
   OFFLINE / LOCAL SALES SYNC

   Safe because commitSale() first checks
   whether the sale already exists.

   Existing Firebase sale:
      no stock is deducted again.

   Missing Firebase sale:
      transaction performs stock deduction.
========================================== */

async function syncLocal(
    products,
    sales
) {

    const localSales =
        Array.isArray(
            sales
        )
            ? sales
            : readArray(
                SALES_KEY
            );


    let successful =
        0;

    let failed =
        0;


    for (
        const sale of
        localSales
    ) {

        if (
            !sale ||
            !sale.id
        ) {

            continue;
        }


        try {

            await saveSale(
                sale
            );


            successful++;


        } catch (error) {

            failed++;


            console.warn(
                "Sale retry failed:",
                sale.id,
                error
            );
        }
    }


    return {

        successful:
            successful,

        failed:
            failed,

        productsBulkUploaded:
            false
    };
}


/* ==========================================
   REALTIME
========================================== */

async function startRealtimeListeners() {

    const firebase =
        await getFirebase();


    if (
        typeof productsUnsubscribe !==
        "function"
    ) {

        productsUnsubscribe =
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

                                const data =
                                    item.data() ||
                                    {};


                                return {

                                    ...removeCloudFields(
                                        data
                                    ),

                                    id:
                                        String(
                                            data.id ||
                                            item.id
                                        )
                                };
                            }
                        );


                    const localProducts =
                        readArray(
                            PRODUCTS_KEY
                        );


                    const merged =
                        mergeProductsSafely(
                            localProducts,
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


                    document.dispatchEvent(

                        new CustomEvent(
                            "jufelix:cloud-products-updated",

                            {
                                detail: {

                                    products:
                                        merged,

                                    source:
                                        "sales-cloud"
                                }
                            }
                        )
                    );


                    notifyListeners(
                        "products",
                        merged
                    );
                },

                function (
                    error
                ) {

                    console.error(
                        "Sales products listener failed:",
                        error
                    );
                }
            );
    }


    if (
        typeof salesUnsubscribe !==
        "function"
    ) {

        salesUnsubscribe =
            onSnapshot(

                collection(
                    firebase.db,
                    "sales"
                ),

                function (
                    snapshot
                ) {

                    const cloudSales =
                        snapshot.docs.map(
                            function (
                                item
                            ) {

                                const data =
                                    item.data() ||
                                    {};


                                return {

                                    ...removeCloudFields(
                                        data
                                    ),

                                    id:
                                        String(
                                            data.id ||
                                            item.id
                                        )
                                };
                            }
                        );


                    /*
                     * Keep local/offline sales that
                     * have not reached Firebase yet.
                     */

                    const merged =
                        mergeSalesSafely(

                            readArray(
                                SALES_KEY
                            ),

                            cloudSales
                        );


                    saveArray(
                        SALES_KEY,
                        merged
                    );


                    dispatchDataUpdated(
                        SALES_KEY,
                        merged,
                        "cloud"
                    );


                    document.dispatchEvent(

                        new CustomEvent(
                            "jufelix:cloud-sales-updated",

                            {
                                detail: {

                                    sales:
                                        merged,

                                    source:
                                        "sales-cloud"
                                }
                            }
                        )
                    );


                    notifyListeners(
                        "sales",
                        merged
                    );
                },

                function (
                    error
                ) {

                    console.error(
                        "Sales realtime listener failed:",
                        error
                    );
                }
            );
    }


    return true;
}


/* ==========================================
   LISTENER SUBSCRIPTIONS
========================================== */

function listen(
    callback
) {

    if (
        typeof callback ===
        "function"
    ) {

        listeners.add(
            callback
        );
    }


    startRealtimeListeners()
        .catch(
            function (error) {

                console.error(
                    "Unable to start Sales realtime:",
                    error
                );
            }
        );


    return function () {

        if (
            typeof callback ===
            "function"
        ) {

            listeners.delete(
                callback
            );
        }
    };
}


function notifyListeners(
    type,
    records
) {

    listeners.forEach(
        function (callback) {

            try {

                callback(
                    type,
                    records
                );

            } catch (error) {

                console.warn(
                    "Sales listener callback failed:",
                    error
                );
            }
        }
    );
}


/* ==========================================
   PRODUCT CLOUD → LOCAL MERGE

   Firebase products define which products
   currently exist.

   Therefore a product deleted by Admin from
   Firebase disappears from Sales devices too.

   A localOnly product is retained until its
   first successful inventory upload.
========================================== */

function mergeProductsSafely(
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


    const cloudIds =
        new Set();


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


            cloudIds.add(
                id
            );


            const localProduct =
                localMap.get(
                    id
                ) ||
                {};


            let branchStock =
                normalizeBranchStock(
                    cloudProduct.branchStock
                );


            if (
                Object.keys(
                    branchStock
                ).length ===
                0
            ) {

                branchStock = {

                    [DEFAULT_BRANCH_ID]:
                        toNumber(
                            cloudProduct.quantity
                        )
                };
            }


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
                    branchStock,

                quantity:
                    sumBranchStock(
                        branchStock
                    )
            };


            if (cloudImage) {

                merged.image =
                    cloudImage;

            } else if (localImage) {

                merged.image =
                    localImage;
            }


            result.push(
                merged
            );
        }
    );


    /*
     * Retain genuinely unsynced Inventory
     * products only.
     */

    localMap.forEach(
        function (
            product,
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
   SALES MERGE

   Unlike products, sales are audit records.

   Local records must remain until they have
   successfully reached Firebase.
========================================== */

function mergeSalesSafely(
    localSales,
    cloudSales
) {

    const map =
        new Map();


    (
        Array.isArray(
            localSales
        )
            ? localSales
            : []
    ).forEach(
        function (
            sale
        ) {

            if (
                sale &&
                sale.id
            ) {

                map.set(

                    String(
                        sale.id
                    ),

                    {
                        ...sale
                    }
                );
            }
        }
    );


    (
        Array.isArray(
            cloudSales
        )
            ? cloudSales
            : []
    ).forEach(
        function (
            sale
        ) {

            if (
                !sale ||
                !sale.id
            ) {

                return;
            }


            const id =
                String(
                    sale.id
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

                    ...sale,

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
   ERP EVENTS
========================================== */

function dispatchDataUpdated(
    key,
    value,
    source
) {

    const detail = {

        key:
            key,

        value:
            value,

        source:
            source ||
            ""
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
   FIREBASE USER
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
   FRIENDLY ERROR
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
            "Firebase rejected the sale or inventory update because this user does not have permission."
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
            "Firebase is temporarily unavailable. Check the internet connection."
        );
    }


    return error instanceof Error
        ? error
        : new Error(
            message ||
            "Sales Firebase operation failed."
        );
}


/* ==========================================
   ONLINE AGAIN
========================================== */

window.addEventListener(
    "online",
    function () {

        startRealtimeListeners()
            .then(
                function () {

                    return syncLocal();
                }
            )
            .catch(
                function (error) {

                    console.warn(
                        "Sales reconnect failed:",
                        error
                    );
                }
            );
    }
);


/* ==========================================
   PUBLIC API
========================================== */

window.JufelixSalesCloud = {

    /*
     * Preferred API for completed POS sales.
     */

    commitSale:
        commitSale,

    /*
     * Compatibility APIs.
     */

    saveSale:
        saveSale,

    saveProduct:
        saveProduct,

    syncLocal:
        syncLocal,

    listen:
        listen,

    refresh:
        startRealtimeListeners,

    checkFirebaseUser:
        checkFirebaseUser
};


/* ==========================================
   START
========================================== */

async function startSalesCloud() {

    if (started) {

        return;
    }


    started =
        true;


    try {

        const firebase =
            await getFirebase();


        console.log(
            "✅ Sales Firebase authenticated:",
            firebase.user
                ? (
                    firebase.user.email ||
                    firebase.user.uid
                )
                : "User"
        );


        await startRealtimeListeners();


        console.log(
            "✅ Jufelix Transaction-Safe Sales Cloud v707 ready."
        );


        document.dispatchEvent(

            new CustomEvent(
                "jufelix:sales-cloud-ready"
            )
        );


    } catch (error) {

        const friendly =
            createFriendlyError(
                error
            );


        console.error(
            "❌ Sales Cloud startup failed:",
            error
        );


        document.dispatchEvent(

            new CustomEvent(
                "jufelix:sales-cloud-ready",

                {
                    detail: {

                        offline:
                            true,

                        error:
                            friendly.message
                    }
                }
            )
        );
    }
}


/* ==========================================
   INITIALIZE
========================================== */

startSalesCloud();