/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   SAFE REALTIME SALES CLOUD BRIDGE

   File:
   js/cloud/sales-cloud.js

   Responsibilities:
   - Realtime Sales synchronization
   - Safe product stock synchronization
   - Preserve local product images
   - Do not bulk-delete cloud data
   - Work with Inventory Cloud Bridge
========================================== */

import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


const PRODUCTS_KEY =
    "jufelix_products";

const SALES_KEY =
    "jufelix_v7_sales";


let db = null;

let started = false;

let stopProductsListener =
    null;

let stopSalesListener =
    null;


/* ==========================================
   WAIT FOR FIREBASE
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
                        window
                            .JufelixFirebase
                            .db;

                    resolve(db);

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
   START
========================================== */

async function initializeSalesCloud() {

    if (started) {
        return;
    }


    try {

        await waitForDb();

        started =
            true;


        document.dispatchEvent(
            new CustomEvent(
                "jufelix:sales-cloud-connected"
            )
        );


        console.log(
            "Jufelix Sales Cloud connected."
        );

    } catch (error) {

        console.warn(
            "Sales Cloud unavailable:",
            error
        );
    }
}


/* ==========================================
   CLEAN GENERIC DATA
========================================== */

function clean(
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
            clean
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
                    clean(
                        value[key]
                    );
            }
        }
    );


    return result;
}


/* ==========================================
   PRODUCT CLOUD PREPARATION
========================================== */

function prepareProductForCloud(
    product
) {

    const cleaned =
        clean(
            product
        ) || {};


    /*
     * Never place Base64 image data
     * inside the Firestore product.
     *
     * The local image remains on the
     * device until Firebase Storage
     * is connected.
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
                cleaned[field];


            if (
                typeof value ===
                    "string" &&
                value.startsWith(
                    "data:image/"
                )
            ) {

                delete cleaned[
                    field
                ];

                cleaned
                    .imageStoredLocally =
                    true;
            }
        }
    );


    cleaned.cloudUpdatedAt =
        serverTimestamp();


    return cleaned;
}


/* ==========================================
   SAVE SALE
========================================== */

async function saveSale(
    sale
) {

    const database =
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
            database,
            "sales",
            String(
                sale.id
            )
        ),

        {
            ...clean(
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
        "Sale synced:",
        sale.id
    );
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


    /*
     * If Inventory Cloud is available,
     * allow it to own the product write.
     */

    if (
        window.JufelixInventoryCloud &&
        typeof window
            .JufelixInventoryCloud
            .saveProduct ===
            "function"
    ) {

        return window
            .JufelixInventoryCloud
            .saveProduct(
                product,
                false
            );
    }


    /*
     * Safe fallback for Sales pages
     * where Inventory Cloud may not
     * be loaded.
     */

    const database =
        await waitForDb();


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


    console.log(
        "Product stock synced:",
        product.id
    );
}


/* ==========================================
   INITIAL LOCAL SYNC
========================================== */

async function syncLocal(
    products,
    sales
) {

    await waitForDb();


    const localSales =
        Array.isArray(
            sales
        )
            ? sales
            : readArray(
                SALES_KEY
            );


    /*
     * Sales Cloud only seeds SALES.
     *
     * We intentionally do not bulk-write
     * every local product here.
     *
     * Product synchronization is handled
     * by Inventory Cloud or saveProduct()
     * after a completed sale.
     */

    for (
        const sale of
        localSales
    ) {

        if (
            sale &&
            sale.id
        ) {

            await saveSale(
                sale
            );
        }
    }


    console.log(
        "Local sales synchronized."
    );
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


                /* ==================================
                   PRODUCT STOCK LISTENER
                ================================== */

                stopProductsListener =
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

                                            ...cleanCloudRecord(
                                                item.data()
                                            )
                                        };
                                    }
                                );


                            const localProducts =
                                readArray(
                                    PRODUCTS_KEY
                                );


                            const mergedProducts =
                                mergeProducts(
                                    localProducts,
                                    cloudProducts
                                );


                            saveArray(
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
                        },

                        function (
                            error
                        ) {

                            console.warn(
                                "Product realtime listener failed:",
                                error
                            );
                        }
                    );


                /* ==================================
                   SALES LISTENER
                ================================== */

                stopSalesListener =
                    onSnapshot(

                        collection(
                            database,
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

                                        return {
                                            id:
                                                item.id,

                                            ...cleanCloudRecord(
                                                item.data()
                                            )
                                        };
                                    }
                                );


                            const localSales =
                                readArray(
                                    SALES_KEY
                                );


                            const mergedSales =
                                mergeSales(
                                    localSales,
                                    cloudSales
                                );


                            saveArray(
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
            stopProductsListener
        ) {

            stopProductsListener();

            stopProductsListener =
                null;
        }


        if (
            stopSalesListener
        ) {

            stopSalesListener();

            stopSalesListener =
                null;
        }
    };
}


/* ==========================================
   MERGE PRODUCTS
========================================== */

function mergeProducts(
    localProducts,
    cloudProducts
) {

    const productMap =
        new Map();


    /*
     * Load local products first.
     */

    localProducts.forEach(
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
     * Cloud business data wins,
     * but locally stored image is
     * preserved when cloud has none.
     */

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
                productMap.get(
                    id
                ) || {};


            const localImage =
                localProduct.image ||
                localProduct.imageData ||
                localProduct.photo ||
                "";


            const merged = {

                ...localProduct,

                ...cloudProduct,

                id:
                    id
            };


            if (
                !merged.image &&
                localImage
            ) {

                merged.image =
                    localImage;
            }


            productMap.set(
                id,
                merged
            );
        }
    );


    return Array.from(
        productMap.values()
    );
}


/* ==========================================
   MERGE SALES
========================================== */

function mergeSales(
    localSales,
    cloudSales
) {

    const saleMap =
        new Map();


    localSales.forEach(
        function (
            sale
        ) {

            if (
                !sale ||
                !sale.id
            ) {

                return;
            }


            saleMap.set(
                String(
                    sale.id
                ),
                {
                    ...sale
                }
            );
        }
    );


    cloudSales.forEach(
        function (
            cloudSale
        ) {

            if (
                !cloudSale ||
                !cloudSale.id
            ) {

                return;
            }


            const id =
                String(
                    cloudSale.id
                );


            saleMap.set(
                id,
                {
                    ...(
                        saleMap.get(
                            id
                        ) || {}
                    ),

                    ...cloudSale,

                    id:
                        id
                }
            );
        }
    );


    return Array.from(
        saleMap.values()
    );
}


/* ==========================================
   CLEAN CLOUD RECORD
========================================== */

function cleanCloudRecord(
    data
) {

    const cleaned = {
        ...(
            data ||
            {}
        )
    };


    delete cleaned
        .cloudUpdatedAt;


    return cleaned;
}


/* ==========================================
   STORAGE HELPERS
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
            "Sales Cloud local save failed:",
            key,
            error
        );


        return false;
    }
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
        listen,

    isConnected:
        function () {

            return Boolean(
                db
            );
        }
};


/* ==========================================
   READY
========================================== */

initializeSalesCloud()
    .finally(
        function () {

            document.dispatchEvent(
                new CustomEvent(
                    "jufelix:sales-cloud-ready"
                )
            );
        }
    );
