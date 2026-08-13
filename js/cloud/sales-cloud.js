/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   SAFE SALES CLOUD BRIDGE

   File:
   js/cloud/sales-cloud.js

   Protects:
   - Multi-branch stock
   - Local product images
   - Realtime sales
   - Realtime inventory updates
   - Transferred branch quantities
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

const SALES_KEY =
    "jufelix_v7_sales";


let database = null;

let productsUnsubscribe = null;
let salesUnsubscribe = null;


/* ==========================================
   FIREBASE
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

                    database =
                        window.JufelixFirebase.db;

                    resolve(
                        database
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
   PREPARE PRODUCT FOR FIRESTORE
========================================== */

function prepareProductForCloud(
    product
) {

    const data =
        cleanValue(
            product
        ) || {};


    /*
     * Do not upload Base64 images
     * into Firestore.
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


    data.cloudUpdatedAt =
        serverTimestamp();


    return data;
}


/* ==========================================
   SAVE SALE
========================================== */

async function saveSale(
    sale
) {

    const db =
        await waitForDb();


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
            db,
            "sales",
            String(
                sale.id
            )
        ),

        {
            ...cleanValue(
                sale
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
        "Sale synced to cloud:",
        sale.id
    );
}


/* ==========================================
   SAVE ONE PRODUCT
========================================== */

async function saveProduct(
    product
) {

    const db =
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
            db,
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


    console.log(
        "Product stock synced:",
        product.id
    );
}


/* ==========================================
   INITIAL LOCAL SALES SYNC
========================================== */

async function syncLocal(
    products,
    sales
) {

    /*
     * IMPORTANT:
     *
     * Do NOT push the entire local products
     * array when Sales opens.
     *
     * Doing that can upload stale branch
     * quantities from a salesperson's device
     * and overwrite transferred stock.
     *
     * Products are only written after an
     * actual completed sale.
     */

    const localSales =
        Array.isArray(
            sales
        )
            ? sales
            : readArray(
                SALES_KEY
            );


    for (
        const sale of localSales
    ) {

        if (
            sale &&
            sale.id
        ) {

            try {

                await saveSale(
                    sale
                );

            } catch (
                error
            ) {

                console.warn(
                    "Existing sale could not sync:",
                    sale.id,
                    error
                );
            }
        }
    }
}


/* ==========================================
   REALTIME LISTENER
========================================== */

function listen(
    onChange
) {

    let cancelled =
        false;


    waitForDb()
        .then(
            function (
                db
            ) {

                if (
                    cancelled
                ) {
                    return;
                }


                /* ==================================
                   PRODUCTS
                ================================== */

                productsUnsubscribe =
                    onSnapshot(

                        collection(
                            db,
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


                            /*
                             * Only save after safe merge.
                             */

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


                            console.log(
                                "Sales cloud products refreshed safely."
                            );
                        },

                        function (
                            error
                        ) {

                            console.warn(
                                "Products realtime listener failed:",
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
                            db,
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
                                mergedSales
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
                        },

                        function (
                            error
                        ) {

                            console.warn(
                                "Sales realtime listener failed:",
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

                console.warn(
                    "Sales cloud listener unavailable:",
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


    /*
     * Start with local products.
     */

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


    /*
     * Merge Firestore product data.
     */

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
                ) || {};


            /*
             * CRITICAL FIX:
             *
             * Do not replace branchStock.
             *
             * Merge individual branches.
             */

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


            /*
             * Preserve local product image
             * when Firestore does not contain one.
             */

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
                    mergedBranchStock,

                quantity:
                    sumBranchStock(
                        mergedBranchStock
                    )
            };


            if (
                cloudImage
            ) {

                mergedProduct.image =
                    cloudImage;

            } else if (
                localImage
            ) {

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
   NORMALIZE BRANCH STOCK
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


/* ==========================================
   TOTAL STOCK
========================================== */

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
   SAFE SALES MERGE
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
        function (
            sale
        ) {

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
        function (
            cloudSale
        ) {

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
                ) || {};


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
   REMOVE CLOUD-ONLY FIELDS
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


        if (
            !stored
        ) {

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

    } catch (
        error
    ) {

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

    } catch (
        error
    ) {

        console.error(
            "Sales Cloud could not save:",
            key,
            error
        );


        return false;
    }
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

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return 0;
    }


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

waitForDb()
    .then(
        function () {

            console.log(
                "Jufelix Sales Cloud ready."
            );
        }
    )
    .catch(
        function (
            error
        ) {

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
