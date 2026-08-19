/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   INVENTORY CLOUD BRIDGE

   File:
   js/cloud/inventory-cloud.js

   Version: 653

   + LocalStorage offline copy
   + Firestore cloud copy
   + Realtime product updates
   + Branch-aware stock
   + Safe multi-device merge
   + Local product images preserved
   + No automatic cloud deletion
========================================== */

import {
    collection,
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* ==========================================
   CONSTANTS
========================================== */

const PRODUCTS_KEY =
    "jufelix_products";

const COLLECTION_NAME =
    "products";


/* ==========================================
   STATE
========================================== */

let db = null;

let started = false;

let stopProductsListener = null;

let syncTimer = null;


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
   WAIT FOR FIREBASE USER
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
   AUTH CHECK
========================================== */

function checkFirebaseUser() {

    const firebase =
        window.JufelixFirebase;


    if (
        !firebase ||
        !firebase.auth
    ) {

        console.warn(
            "⚠️ Firebase Auth unavailable."
        );

        return null;
    }


    const user =
        firebase.auth.currentUser;


    if (!user) {

        console.warn(
            "⚠️ Firebase user is not signed in."
        );

        return null;
    }


    console.log(
        "✅ Inventory Firebase user:",
        user.uid
    );


    return user;
}


/* ==========================================
   LOCAL STORAGE
========================================== */

function readLocalProducts() {

    try {

        const value =
            localStorage.getItem(
                PRODUCTS_KEY
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
            "Inventory local read failed:",
            error
        );


        return [];
    }
}


function saveLocalProducts(
    products
) {

    try {

        localStorage.setItem(
            PRODUCTS_KEY,
            JSON.stringify(
                products
            )
        );


    } catch (
        error
    ) {

        console.error(
            "Inventory local save failed:",
            error
        );
    }
}


/* ==========================================
   CLEAN FIRESTORE VALUES
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
   PREPARE PRODUCT FOR CLOUD
========================================== */

function prepareProductForCloud(
    product
) {

    const data =
        cleanValue(
            product
        ) || {};


    /*
     * Product images stored as Base64 remain
     * on the device.
     *
     * We do not upload large Base64 images
     * into Firestore documents.
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
   SAVE ONE PRODUCT
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


    const productId =
        String(
            product.id
        );


    console.log(
        "☁️ Uploading product:",
        product.name ||
        productId
    );


    await setDoc(

        doc(
            database,
            COLLECTION_NAME,
            productId
        ),

        {
            ...prepareProductForCloud(
                product
            ),

            id:
                productId
        },

        {
            merge: true
        }
    );


    console.log(
        "✅ PRODUCT SAVED TO FIREBASE:",
        product.name ||
        productId
    );


    return true;
}


/* ==========================================
   SYNC LOCAL PRODUCTS
========================================== */

async function syncLocalProducts() {

    await waitForDb();


    const products =
        readLocalProducts();


    console.log(
        "☁️ Inventory products waiting for sync:",
        products.length
    );


    let successful = 0;
    let failed = 0;


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

            successful++;


        } catch (
            error
        ) {

            failed++;


            console.error(
                "❌ Product sync failed:",
                product.name ||
                product.id,
                error
            );
        }
    }


    console.log(
        "☁️ Inventory sync result:",
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
   DEBOUNCED SYNC
========================================== */

function scheduleProductSync() {

    clearTimeout(
        syncTimer
    );


    syncTimer =
        setTimeout(
            async function () {

                try {

                    console.log(
                        "🔄 Inventory local change detected."
                    );


                    await syncLocalProducts();


                    showCloudStatus(
                        "Inventory synced to Firebase",
                        "success"
                    );


                } catch (
                    error
                ) {

                    console.error(
                        "Inventory auto sync failed:",
                        error
                    );


                    showCloudStatus(
                        "Inventory cloud sync failed",
                        "error"
                    );
                }
            },
            180
        );
}


/* ==========================================
   ERP LOCAL CHANGE LISTENER
========================================== */

function connectLocalChangeListener() {

    document.addEventListener(
        "jufelix:data-updated",

        function (
            event
        ) {

            const detail =
                event.detail || {};


            /*
             * Ignore changes that originated
             * from the cloud listener.
             */

            if (
                detail.source === "cloud"
            ) {

                return;
            }


            if (
                detail.key !== PRODUCTS_KEY
            ) {

                return;
            }


            console.log(
                "📡 Inventory ERP update detected."
            );


            scheduleProductSync();
        }
    );


    /*
     * Changes made from another browser tab.
     */

    window.addEventListener(
        "storage",

        function (
            event
        ) {

            if (
                event.key === PRODUCTS_KEY
            ) {

                scheduleProductSync();
            }
        }
    );
}


/* ==========================================
   FIRESTORE REALTIME LISTENER
========================================== */

function connectCloudListener() {

    if (!db) {

        return;
    }


    if (
        typeof stopProductsListener ===
        "function"
    ) {

        stopProductsListener();
    }


    stopProductsListener =
        onSnapshot(

            collection(
                db,
                COLLECTION_NAME
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
                                item.data() || {};


                            delete data.cloudUpdatedAt;


                            return {

                                ...data,

                                id:
                                    String(
                                        data.id ||
                                        item.id
                                    )
                            };
                        }
                    );


                const localProducts =
                    readLocalProducts();


                const mergedProducts =
                    mergeProductsSafely(
                        localProducts,
                        cloudProducts
                    );


                saveLocalProducts(
                    mergedProducts
                );


                dispatchDataUpdated(
                    PRODUCTS_KEY,
                    mergedProducts,
                    "cloud"
                );


                console.log(
                    "☁️ Inventory realtime update:",
                    mergedProducts.length
                );
            },

            function (
                error
            ) {

                console.error(
                    "❌ Inventory realtime listener failed:",
                    error
                );


                showCloudStatus(
                    "Inventory realtime sync failed",
                    "error"
                );
            }
        );
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
                !product ||
                !product.id
            ) {

                return;
            }


            map.set(

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


            /*
             * Cloud values win for branches
             * present in Firebase.
             *
             * Local-only branch values remain
             * until they are uploaded.
             */

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


            const mergedProduct = {

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


            /*
             * Preserve device-local image when
             * Firebase does not contain one.
             */

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


            map.set(
                id,
                mergedProduct
            );
        }
    );


    return Array.from(
        map.values()
    );
}


/* ==========================================
   BRANCH STOCK HELPERS
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
   NUMBER
========================================== */

function toNumber(
    value
) {

    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )
        ? number
        : 0;
}


/* ==========================================
   DATA UPDATED EVENT
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
   CLOUD STATUS
========================================== */

function showCloudStatus(
    message,
    type
) {

    let toast =
        document.getElementById(
            "inventoryCloudToast"
        );


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );


        toast.id =
            "inventoryCloudToast";


        toast.style.position =
            "fixed";

        toast.style.right =
            "16px";

        toast.style.bottom =
            "16px";

        toast.style.zIndex =
            "10000";

        toast.style.maxWidth =
            "320px";

        toast.style.padding =
            "12px 15px";

        toast.style.borderRadius =
            "10px";

        toast.style.color =
            "#ffffff";

        toast.style.fontSize =
            "13px";

        toast.style.fontWeight =
            "700";

        toast.style.boxShadow =
            "0 8px 24px rgba(0,0,0,.22)";


        document.body.appendChild(
            toast
        );
    }


    toast.textContent =
        message;


    toast.style.background =
        type === "error"
            ? "#dc3545"
            : "#198754";


    toast.style.display =
        "block";


    clearTimeout(
        showCloudStatus.timer
    );


    showCloudStatus.timer =
        setTimeout(
            function () {

                toast.style.display =
                    "none";
            },
            2500
        );
}


/* ==========================================
   PUBLIC API
========================================== */

window.JufelixInventoryCloud = {

    saveProduct:
        saveProduct,

    syncLocal:
        syncLocalProducts,

    checkFirebaseUser:
        checkFirebaseUser,

    readLocalProducts:
        readLocalProducts
};


/* ==========================================
   START INVENTORY CLOUD
========================================== */

async function startInventoryCloud() {

    if (started) {

        return;
    }


    started = true;


    try {

        await waitForDb();


        console.log(
            "✅ Jufelix Inventory Cloud v653 ready."
        );


        const user =
            await waitForFirebaseUser();


        if (
            user
        ) {

            console.log(
                "✅ Inventory Firebase user ready:",
                user.uid
            );


        } else {

            console.warn(
                "⚠️ Firebase authenticated user was not detected."
            );
        }


        /*
         * Start the listener first so cloud
         * inventory is available locally.
         */

        connectCloudListener();


        /*
         * Listen for future local product
         * modifications.
         */

        connectLocalChangeListener();


        /*
         * Upload local-only inventory.
         */

        const result =
            await syncLocalProducts();


        console.log(
            "Initial Inventory cloud sync:",
            result
        );


        showCloudStatus(
            "Inventory cloud sync ready",
            "success"
        );


    } catch (
        error
    ) {

        console.error(
            "Inventory cloud startup failed:",
            error
        );


        showCloudStatus(
            "Inventory cloud connection failed",
            "error"
        );
    }
}


/* ==========================================
   INITIALIZE
========================================== */

startInventoryCloud();