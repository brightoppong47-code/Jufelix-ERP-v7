/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   SAFE TWO-WAY SALES CLOUD BRIDGE

   COMPLETE REPLACEMENT

   File:
   js/cloud/sales-cloud.js

   + Firebase Authentication aware
   + Two-way realtime sales
   + Two-way realtime product stock
   + Safe multi-device branch stock
   + Prevents stale branch overwrite
   + Preserves local Base64 product images
   + Cloud-source loop protection
   + No automatic full inventory upload
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


/* ==========================================
   FIREBASE
========================================== */

async function getFirebase() {

    /*
     * Preferred Firebase helper.
     */

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
            "Sales Cloud could not read:",
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
            "Sales Cloud could not save:",
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


        if (
            parsed &&
            typeof parsed ===
                "object" &&
            !Array.isArray(
                parsed
            )
        ) {

            return parsed;
        }


        return null;


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
   CLEAN FIRESTORE DATA
========================================== */

function cleanValue(
    value
) {

    if (
        value ===
        undefined
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
        function (branchId) {

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
   PRODUCT FOR FIRESTORE
========================================== */

function prepareProductForCloud(
    product
) {

    const data =
        cleanValue(
            product
        ) || {};


    /*
     * Do not put Base64 images in Firestore.
     */

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

                delete data[field];


                data.imageStoredLocally =
                    true;
            }
        }
    );


    return data;
}


/* ==========================================
   SAVE SALE
========================================== */

async function saveSale(
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


    const firebase =
        await getFirebase();


    const saleId =
        String(
            sale.id
        );


    try {

        await setDoc(

            doc(
                firebase.db,
                "sales",
                saleId
            ),

            {
                ...cleanValue(
                    sale
                ),

                id:
                    saleId,

                cloudUpdatedAt:
                    serverTimestamp()
            },

            {
                merge:
                    true
            }
        );


        console.log(
            "✅ Sale synced:",
            saleId
        );


        return true;


    } catch (error) {

        console.error(
            "❌ Sale Firebase save failed:",
            error
        );


        throw createFriendlyError(
            error
        );
    }
}


/* ==========================================
   SAVE PRODUCT STOCK SAFELY

   Sales must NEVER upload an old copy of
   another branch's stock.

   We first read the newest Firestore product,
   preserve every other branch, then replace
   only the branch affected by this sale.
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


    /*
     * Prefer the product's explicit branch
     * when Sales supplies one.
     */

    const activeBranchId =
        String(

            product.saleBranchId ||

            product.activeBranchId ||

            getActiveBranchId()
        );


    const localBranchStock =
        normalizeBranchStock(
            product.branchStock
        );


    /*
     * Read newest Firebase product first.
     */

    const snapshot =
        await getDoc(
            productRef
        );


    let finalBranchStock =
        {};


    if (
        snapshot.exists()
    ) {

        const cloudProduct =
            snapshot.data() ||
            {};


        const cloudBranchStock =
            normalizeBranchStock(
                cloudProduct.branchStock
            );


        /*
         * Firebase is the starting point.
         */

        finalBranchStock = {

            ...cloudBranchStock
        };


        /*
         * Replace ONLY the branch affected
         * by this device's sale.
         */

        if (
            Object.prototype
                .hasOwnProperty.call(
                    localBranchStock,
                    activeBranchId
                )
        ) {

            finalBranchStock[
                activeBranchId
            ] =
                toNumber(
                    localBranchStock[
                        activeBranchId
                    ]
                );

        } else if (
            activeBranchId ===
            DEFAULT_BRANCH_ID &&
            Object.keys(
                localBranchStock
            ).length ===
            0
        ) {

            finalBranchStock[
                DEFAULT_BRANCH_ID
            ] =
                toNumber(
                    product.quantity
                );
        }


    } else {

        /*
         * Compatibility fallback if product
         * somehow doesn't exist in Firestore.
         */

        finalBranchStock = {

            ...localBranchStock
        };


        if (
            Object.keys(
                finalBranchStock
            ).length ===
            0
        ) {

            finalBranchStock[
                activeBranchId
            ] =
                toNumber(
                    product.quantity
                );
        }
    }


    const cloudData = {

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
    };


    try {

        await setDoc(

            productRef,

            cloudData,

            {
                merge:
                    true
            }
        );


        console.log(
            "✅ Sale stock synced safely:",
            product.name ||
            productId,
            "Branch:",
            activeBranchId
        );


        return true;


    } catch (error) {

        console.error(
            "❌ Sale stock Firebase save failed:",
            error
        );


        throw createFriendlyError(
            error
        );
    }
}


/* ==========================================
   INITIAL SALES SYNC

   Sales may upload existing unsynced sales.

   Products are deliberately NOT bulk-uploaded.
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
                "Existing sale could not sync:",
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
   START REALTIME LISTENERS
========================================== */

async function startRealtimeListeners(
    onChange
) {

    const firebase =
        await getFirebase();


    stopRealtimeListeners();


    /* ======================================
       PRODUCTS
    ====================================== */

    productsUnsubscribe =
        onSnapshot(

            collection(
                firebase.db,
                "products"
            ),

            function (snapshot) {

                const cloudProducts =
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


                const localProducts =
                    readArray(
                        PRODUCTS_KEY
                    );


                const mergedProducts =
                    mergeProductsSafely(
                        localProducts,
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


                document.dispatchEvent(

                    new CustomEvent(
                        "jufelix:cloud-products-updated",

                        {
                            detail: {

                                products:
                                    mergedProducts,

                                source:
                                    "sales-cloud"
                            }
                        }
                    )
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


                console.log(
                    "☁️ Sales received product updates:",
                    mergedProducts.length
                );
            },

            function (error) {

                console.error(
                    "❌ Sales product listener failed:",
                    error
                );
            }
        );


    /* ======================================
       SALES
    ====================================== */

    salesUnsubscribe =
        onSnapshot(

            collection(
                firebase.db,
                "sales"
            ),

            function (snapshot) {

                const cloudSales =
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


                const localSales =
                    readArray(
                        SALES_KEY
                    );


                const mergedSales =
                    mergeSalesSafely(
                        localSales,
                        cloudSales
                    );


                saveArray(
                    SALES_KEY,
                    mergedSales
                );


                /*
                 * Critical:
                 * identify this as Firebase data.
                 */

                dispatchDataUpdated(
                    SALES_KEY,
                    mergedSales,
                    "cloud"
                );


                document.dispatchEvent(

                    new CustomEvent(
                        "jufelix:cloud-sales-updated",

                        {
                            detail: {

                                sales:
                                    mergedSales
                            }
                        }
                    )
                );


                if (
                    typeof onChange ===
                    "function"
                ) {

                    onChange(
                        "sales",
                        mergedSales
                    );
                }


                console.log(
                    "☁️ Realtime sales received:",
                    mergedSales.length
                );
            },

            function (error) {

                console.error(
                    "❌ Sales realtime listener failed:",
                    error
                );
            }
        );


    return true;
}


/* ==========================================
   COMPATIBLE LISTEN()

   Existing sales.js can continue using:

   JufelixSalesCloud.listen(callback)
========================================== */

function listen(
    onChange
) {

    let cancelled =
        false;


    startRealtimeListeners(
        function (
            type,
            data
        ) {

            if (
                cancelled
            ) {

                return;
            }


            if (
                typeof onChange ===
                "function"
            ) {

                onChange(
                    type,
                    data
                );
            }
        }
    )
        .catch(
            function (error) {

                console.error(
                    "Sales Cloud listener unavailable:",
                    error
                );
            }
        );


    return function () {

        cancelled =
            true;


        stopRealtimeListeners();
    };
}


/* ==========================================
   STOP LISTENERS
========================================== */

function stopRealtimeListeners() {

    if (
        typeof productsUnsubscribe ===
        "function"
    ) {

        productsUnsubscribe();


        productsUnsubscribe =
            null;
    }


    if (
        typeof salesUnsubscribe ===
        "function"
    ) {

        salesUnsubscribe();


        salesUnsubscribe =
            null;
    }
}


/* ==========================================
   SAFE PRODUCT MERGE

   Firebase branchStock is authoritative.

   Local Base64 image is preserved.
========================================== */

function mergeProductsSafely(
    localProducts,
    cloudProducts
) {

    const productMap =
        new Map();


    (
        Array.isArray(
            localProducts
        )
            ? localProducts
            : []
    ).forEach(
        function (product) {

            if (
                !product ||
                !product.id
            ) {

                return;
            }


            productMap.set(

                String(
                    product.id
                ),

                {
                    ...product
                }
            );
        }
    );


    (
        Array.isArray(
            cloudProducts
        )
            ? cloudProducts
            : []
    ).forEach(
        function (cloudProduct) {

            if (
                !cloudProduct ||
                !cloudProduct.id
            ) {

                return;
            }


            const productId =
                String(
                    cloudProduct.id
                );


            const localProduct =
                productMap.get(
                    productId
                ) ||
                {};


            const cloudBranchStock =
                normalizeBranchStock(
                    cloudProduct.branchStock
                );


            let finalBranchStock =
                cloudBranchStock;


            /*
             * Compatibility for old Firestore
             * products without branchStock.
             */

            if (
                Object.keys(
                    finalBranchStock
                ).length ===
                0
            ) {

                const localBranchStock =
                    normalizeBranchStock(
                        localProduct.branchStock
                    );


                if (
                    Object.keys(
                        localBranchStock
                    ).length >
                    0
                ) {

                    finalBranchStock =
                        localBranchStock;

                } else {

                    finalBranchStock = {

                        [DEFAULT_BRANCH_ID]:
                            toNumber(
                                cloudProduct.quantity
                            )
                    };
                }
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


            const mergedProduct = {

                ...localProduct,

                ...cloudProduct,

                id:
                    productId,

                branchStock:
                    finalBranchStock,

                quantity:
                    sumBranchStock(
                        finalBranchStock
                    )
            };


            if (cloudImage) {

                mergedProduct.image =
                    cloudImage;

            } else if (localImage) {

                mergedProduct.image =
                    localImage;
            }


            productMap.set(
                productId,
                mergedProduct
            );
        }
    );


    return Array.from(
        productMap.values()
    );
}


/* ==========================================
   SAFE SALES MERGE
========================================== */

function mergeSalesSafely(
    localSales,
    cloudSales
) {

    const saleMap =
        new Map();


    /*
     * Preserve local/offline sales first.
     */

    (
        Array.isArray(
            localSales
        )
            ? localSales
            : []
    ).forEach(
        function (sale) {

            if (
                sale &&
                sale.id
            ) {

                saleMap.set(

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


    /*
     * Firebase copy wins for records that
     * exist in both places.
     */

    (
        Array.isArray(
            cloudSales
        )
            ? cloudSales
            : []
    ).forEach(
        function (cloudSale) {

            if (
                !cloudSale ||
                !cloudSale.id
            ) {

                return;
            }


            const saleId =
                String(
                    cloudSale.id
                );


            const localSale =
                saleMap.get(
                    saleId
                ) ||
                {};


            saleMap.set(

                saleId,

                {
                    ...localSale,

                    ...cloudSale,

                    id:
                        saleId
                }
            );
        }
    );


    return Array.from(
        saleMap.values()
    );
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
   DATA UPDATED EVENT
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
            "Firebase rejected the sales update because this user does not have permission."
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

        if (
            !productsUnsubscribe ||
            !salesUnsubscribe
        ) {

            startRealtimeListeners()
                .catch(
                    function (error) {

                        console.warn(
                            "Sales Cloud reconnect failed:",
                            error
                        );
                    }
                );
        }
    }
);


/* ==========================================
   PUBLIC API
========================================== */

window.JufelixSalesCloud = {

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


        /*
         * Start two-way realtime downloads.
         *
         * We DO NOT automatically upload
         * the entire local inventory.
         */

        await startRealtimeListeners();


        console.log(
            "✅ Jufelix Safe Two-Way Sales Cloud ready."
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


        /*
         * Sales can remain usable locally.
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
    }
}


/* ==========================================
   INITIALIZE
========================================== */

startSalesCloud();