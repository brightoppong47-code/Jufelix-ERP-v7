/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   SAFE SALES CLOUD BRIDGE

   COMPLETE REPLACEMENT

   File:
   js/cloud/sales-cloud.js

   + Firebase Authentication aware
   + Sales realtime synchronization
   + Safe branch stock synchronization
   + Does not overwrite other branch stock
   + Local product images preserved
   + Existing unsynced sales retry
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

let productsUnsubscribe =
    null;

let salesUnsubscribe =
    null;

let listenerStarted =
    false;


/* ==========================================
   FIREBASE READY
========================================== */

async function getFirebase() {

    /*
     * Preferred helper from the newer
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
        value ===
        null ||
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


    console.log(
        "☁️ Uploading sale:",
        sale.receiptNumber ||
        saleId
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
            "✅ SALE SAVED TO FIREBASE:",
            sale.receiptNumber ||
            saleId
        );


        document.dispatchEvent(

            new CustomEvent(
                "jufelix:sale-cloud-saved",
                {
                    detail: {

                        sale:
                            sale
                    }
                }
            )
        );


        return true;


    } catch (error) {

        console.error(
            "❌ FIREBASE SALE SAVE FAILED:",
            error
        );


        throw createFriendlyError(
            error
        );
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
   SAVE PRODUCT AFTER SALE

   Preserve every other branch's stock.
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
     * Sale contains the latest stock for the
     * branch that performed the sale.
     */

    const activeBranchId =
        getActiveBranchId();


    const localBranchStock =
        normalizeBranchStock(
            product.branchStock
        );


    try {

        const cloudSnapshot =
            await getDoc(
                productRef
            );


        let finalBranchStock =
            {};


        if (
            cloudSnapshot.exists()
        ) {

            const cloudProduct =
                cloudSnapshot.data() ||
                {};


            finalBranchStock = {

                ...normalizeBranchStock(
                    cloudProduct.branchStock
                )
            };


            /*
             * Update only the branch that
             * completed this sale.
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
            }


        } else {

            /*
             * Compatibility for product that
             * has not reached Firebase yet.
             */

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
            "✅ SALE STOCK SAVED TO FIREBASE:",
            product.name ||
            productId
        );


        return true;


    } catch (error) {

        console.error(
            "❌ Sale product stock sync failed:",
            error
        );


        throw createFriendlyError(
            error
        );
    }
}


/* ==========================================
   RETRY LOCAL SALES
========================================== */

async function syncLocal(
    products,
    sales
) {

    /*
     * Never upload the complete products list.
     *
     * We only retry local sales here.
     */

    await getFirebase();


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


    console.log(
        "Sales retry sync:",
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
   REALTIME LISTENER
========================================== */

function listen(
    onChange
) {

    let cancelled =
        false;


    getFirebase()
        .then(
            function (
                firebase
            ) {

                if (cancelled) {

                    return;
                }


                /*
                 * Avoid creating duplicate
                 * snapshot listeners.
                 */

                if (
                    listenerStarted
                ) {

                    return;
                }


                listenerStarted =
                    true;


                /* ==================================
                   PRODUCTS
                ================================== */

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


                /* ==================================
                   SALES
                ================================== */

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


                            dispatchDataUpdated(
                                SALES_KEY,
                                mergedSales,
                                "cloud"
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
                                "☁️ Sales realtime records:",
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
            }
        )
        .catch(
            function (error) {

                console.error(
                    "❌ Sales cloud listener unavailable:",
                    error
                );
            }
        );


    return function () {

        cancelled =
            true;


        if (
            productsUnsubscribe
        ) {

            productsUnsubscribe();

            productsUnsubscribe =
                null;
        }


        if (
            salesUnsubscribe
        ) {

            salesUnsubscribe();

            salesUnsubscribe =
                null;
        }


        listenerStarted =
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
        function (
            cloudProduct
        ) {

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


            const localImage =

                localProduct.image ||

                localProduct.imageData ||

                localProduct.photo ||

                "";


            const cloudImage =

                cloudProduct.image ||

                cloudProduct.imageUrl ||

                "";


            /*
             * Firebase stock is authoritative.
             */

            let finalBranchStock =
                cloudBranchStock;


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
                    ).length
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
   SALES MERGE
========================================== */

function mergeSalesSafely(
    localSales,
    cloudSales
) {

    const saleMap =
        new Map();


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


    const user =
        readObject(
            CURRENT_USER_KEY
        ) ||
        readObject(
            "currentUser"
        );


    if (
        user &&
        user.branchId
    ) {

        return String(
            user.branchId
        );
    }


    return DEFAULT_BRANCH_ID;
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
            "Sales Cloud could not save:",
            key,
            error
        );


        return false;
    }
}


/* ==========================================
   EVENTS
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
            "Firebase rejected the sale because the signed-in user does not have permission to write to the sales collection."
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
            "Firebase is temporarily unavailable. Check your internet connection."
        );
    }


    return error instanceof Error
        ? error
        : new Error(
            message ||
            "Sales Firebase sync failed."
        );
}


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
        listen
};


/* ==========================================
   READY
========================================== */

getFirebase()
    .then(
        function (firebase) {

            console.log(
                "✅ Jufelix Sales Cloud authenticated:",
                firebase.user
                    ? (
                        firebase.user.email ||
                        firebase.user.uid
                    )
                    : "User"
            );
        }
    )
    .catch(
        function (error) {

            console.warn(
                "Sales Cloud starting offline:",
                error
            );
        }
    )
    .finally(
        function () {

            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:sales-cloud-ready"
                )
            );
        }
    );