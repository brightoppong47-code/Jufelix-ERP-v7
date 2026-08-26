/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   TRANSACTION-SAFE TWO-WAY SALES CLOUD

   File:
   js/cloud/sales-cloud.js

   Version: 708

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
   + Offline-sale automatic recovery
   + Firebase Auth restoration retry
   + Startup retry
   + Internet reconnection retry
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
   OFFLINE RECOVERY STATE
========================================== */

let recoveryRunning =
    false;

let recoveryTimer =
    null;

let lastRecoveryAt =
    0;


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


                /*
                 * Only treat this as fatal when
                 * Firebase core itself is missing.
                 */

                if (
                    firebase &&
                    firebase.error &&
                    !firebase.db &&
                    !firebase.auth
                ) {

                    reject(
                        firebase.error
                    );

                    return;
                }


                if (
                    firebase &&
                    firebase.db &&
                    firebase.auth
                ) {

                    const user =

                        firebase.user ||

                        firebase.auth.currentUser;


                    if (user) {

                        firebase.user =
                            user;


                        database =
                            firebase.db;


                        resolve(
                            firebase
                        );

                        return;
                    }
                }


                if (
                    Date.now() -
                    startedAt >=
                    20000
                ) {

                    reject(
                        new Error(
                            "Firebase user is not authenticated."
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

    return Object
        .values(
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
                     * IDEMPOTENT PROTECTION:
                     *
                     * If this sale already exists,
                     * do not touch stock again.
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
                     * Firestore transactions require
                     * reads before writes.
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
                         * Older Head Office product
                         * compatibility.
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
                     * All validation passed.
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
========================================== */

async function saveSale(
    sale
) {

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
   LOCAL / OFFLINE SALES SYNC

   commitSale() is idempotent.

   Existing cloud sale:
       no second stock deduction.

   Missing cloud sale:
       sale + stock committed atomically.
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


        /*
         * Cancelled/void local sales should
         * not be uploaded as completed sales.
         */

        const status =
            String(
                sale.status ||
                "completed"
            )
                .trim()
                .toLowerCase();


        if (
            status === "cancelled" ||
            status === "canceled" ||
            status === "void" ||
            status === "deleted"
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
                sale.receiptNumber ||
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
                     * Keep unsynchronized local
                     * sales until Firebase has them.
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
            function (
                error
            ) {

                /*
                 * Do not treat an offline/auth
                 * startup delay as a fatal app
                 * failure.
                 */

                console.warn(
                    "Sales realtime waiting:",
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
        function (
            callback
        ) {

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

        firebase.user ||

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


    const lowerMessage =
        message.toLowerCase();


    if (
        code.includes(
            "permission-denied"
        ) ||
        lowerMessage.includes(
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
        ) ||
        lowerMessage.includes(
            "not authenticated"
        )
    ) {

        return new Error(
            "Firebase Authentication is not signed in yet."
        );
    }


    if (
        code.includes(
            "unavailable"
        ) ||
        lowerMessage.includes(
            "network"
        )
    ) {

        return new Error(
            "Firebase is temporarily unavailable. Check the internet connection."
        );
    }


    return error instanceof
        Error
        ? error
        : new Error(
            message ||
            "Sales Firebase operation failed."
        );
}


/* ==========================================
   OFFLINE SALES RECOVERY
========================================== */

async function recoverOfflineSales(
    reason
) {

    if (
        recoveryRunning
    ) {

        return false;
    }


    if (
        !navigator.onLine
    ) {

        console.log(
            "ℹ️ Sales recovery waiting for internet."
        );


        return false;
    }


    const currentTime =
        Date.now();


    if (
        currentTime -
        lastRecoveryAt <
        1500
    ) {

        return false;
    }


    recoveryRunning =
        true;


    lastRecoveryAt =
        currentTime;


    console.log(
        "🔄 Checking local/offline sales:",
        reason ||
        "recovery"
    );


    try {

        /*
         * Wait until Firebase Auth has actually
         * restored the signed-in administrator/
         * employee.
         */

        const firebase =
            await getFirebase();


        const authenticatedUser =

            firebase.user ||

            (
                firebase.auth
                    ? firebase.auth
                        .currentUser
                    : null
            );


        if (
            !firebase.db ||
            !authenticatedUser
        ) {

            throw new Error(
                "Firebase Authentication has not restored yet."
            );
        }


        const localSales =
            readArray(
                SALES_KEY
            );


        if (
            localSales.length ===
            0
        ) {

            console.log(
                "ℹ️ No local sales to synchronize."
            );


            await startRealtimeListeners();


            return true;
        }


        console.log(
            "☁️ Checking",
            localSales.length,
            "local sale(s) against Firebase..."
        );


        const result =
            await syncLocal(
                null,
                localSales
            );


        console.log(
            "✅ Sales recovery result:",
            result
        );


        await startRealtimeListeners();


        document.dispatchEvent(

            new CustomEvent(
                "jufelix:sales-recovery-complete",
                {
                    detail: {

                        reason:
                            reason ||
                            "recovery",

                        successful:
                            result.successful,

                        failed:
                            result.failed
                    }
                }
            )
        );


        /*
         * If one or more sales failed because
         * Firebase was temporarily unavailable,
         * try again later.
         */

        if (
            result.failed >
            0
        ) {

            scheduleSalesRecovery(
                "failed-sales-retry",
                10000
            );
        }


        return (
            result.failed ===
            0
        );


    } catch (error) {

        console.warn(
            "Sales recovery not ready:",
            error
        );


        scheduleSalesRecovery(
            "retry-after-error",
            5000
        );


        return false;


    } finally {

        recoveryRunning =
            false;
    }
}


/* ==========================================
   SCHEDULE RECOVERY
========================================== */

function scheduleSalesRecovery(
    reason,
    delay
) {

    if (
        !navigator.onLine
    ) {

        return;
    }


    if (
        recoveryTimer
    ) {

        window.clearTimeout(
            recoveryTimer
        );
    }


    recoveryTimer =
        window.setTimeout(

            function () {

                recoveryTimer =
                    null;


                recoverOfflineSales(
                    reason
                );

            },

            Number(
                delay ||
                1500
            )
        );
}


/* ==========================================
   INTERNET RESTORED
========================================== */

window.addEventListener(
    "online",
    function () {

        console.log(
            "🌐 Internet restored. Waiting for Firebase Authentication..."
        );


        scheduleSalesRecovery(
            "browser-online",
            2000
        );
    }
);


/* ==========================================
   FIREBASE AUTH RESTORED
========================================== */

document.addEventListener(
    "jufelix:auth-ready",
    function (
        event
    ) {

        const detail =
            event.detail ||
            {};


        if (
            detail.authenticated !==
            true
        ) {

            return;
        }


        console.log(
            "🔐 Firebase Authentication restored. Checking offline sales..."
        );


        scheduleSalesRecovery(
            "firebase-auth-ready",
            500
        );
    }
);


/* ==========================================
   FIREBASE READY
========================================== */

document.addEventListener(
    "jufelix:firebase-ready",
    function (
        event
    ) {

        const detail =
            event.detail ||
            {};


        if (
            detail.authenticated !==
            true
        ) {

            return;
        }


        scheduleSalesRecovery(
            "firebase-ready",
            800
        );
    }
);


/* ==========================================
   PUBLIC API
========================================== */

window.JufelixSalesCloud = {

    commitSale:
        commitSale,

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
        checkFirebaseUser,

    recoverOfflineSales:
        recoverOfflineSales
};


/* ==========================================
   START
========================================== */

async function startSalesCloud() {

    if (
        started
    ) {

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


        /*
         * IMPORTANT:
         *
         * Check the local sales database every
         * time the Sales Cloud bridge starts.
         *
         * This catches transactions that were
         * created during a previous offline
         * session.
         */

        scheduleSalesRecovery(
            "sales-cloud-startup",
            1000
        );


        console.log(
            "✅ Jufelix Transaction-Safe Sales Cloud v708 ready."
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


        console.warn(
            "Sales Cloud startup waiting:",
            friendly.message
        );


        /*
         * We still announce that the bridge
         * loaded so sales.js can continue its
         * local/offline operation.
         */

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


        /*
         * If the browser already reports online,
         * try again shortly because Firebase Auth
         * may simply still be restoring.
         */

        if (
            navigator.onLine
        ) {

            scheduleSalesRecovery(
                "startup-auth-retry",
                5000
            );
        }
    }
}


/* ==========================================
   INITIALIZE
========================================== */

startSalesCloud();