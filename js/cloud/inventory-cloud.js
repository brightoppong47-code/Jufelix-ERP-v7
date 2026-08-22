/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   SAFE INVENTORY CLOUD BRIDGE

   COMPLETE REPLACEMENT

   File:
   js/cloud/inventory-cloud.js

   + Firebase Authentication aware
   + Realtime Firestore products
   + Safe multi-device branch stock
   + Preserves other branches during edit
   + Preserves local Base64 product images
   + No automatic full local inventory upload
   + Prevents stale startup overwrite
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

const ACTIVE_BRANCH_KEY =
    "jufelix_v7_active_branch";

const CURRENT_USER_KEY =
    "jufelix_v7_current_user";

const DEFAULT_BRANCH_ID =
    "head-office";

const COLLECTION_NAME =
    "products";


/* ==========================================
   STATE
========================================== */

let database =
    null;

let started =
    false;

let productsUnsubscribe =
    null;


/* ==========================================
   WAIT FOR FIREBASE
========================================== */

async function getFirebase() {

    /*
     * Preferred Firebase helper from
     * js/core/firebase.js
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
                    window
                        .JufelixFirebase;


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

function readLocalProducts() {

    try {

        const stored =
            localStorage.getItem(
                PRODUCTS_KEY
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
            "Inventory Cloud local read failed:",
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


        return true;


    } catch (error) {

        console.error(
            "Inventory Cloud local save failed:",
            error
        );


        return false;
    }
}


/* ==========================================
   STORAGE OBJECT
========================================== */

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

    /*
     * Device-selected branch has priority.
     */

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


    /*
     * Then use current user's branch.
     */

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
   CLEAN FIRESTORE VALUES
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
                value[
                    key
                ] !==
                undefined
            ) {

                result[
                    key
                ] =
                    cleanValue(
                        value[
                            key
                        ]
                    );
            }
        }
    );


    return result;
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
     * Do not store large Base64 images
     * inside Firestore.
     */

    [
        "image",
        "imageData",
        "photo"
    ].forEach(
        function (field) {

            const value =
                data[
                    field
                ];


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
   SAVE ONE PRODUCT SAFELY

   IMPORTANT:
   When editing Inventory at one branch,
   only that branch's quantity should replace
   its Firestore quantity.

   Stock belonging to other branches is
   preserved from Firestore.
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
            COLLECTION_NAME,
            productId
        );


    const activeBranchId =
        getActiveBranchId();


    const localBranchStock =
        normalizeBranchStock(
            product.branchStock
        );


    console.log(
        "☁️ Saving Inventory product:",
        product.name ||
        productId,
        "Branch:",
        activeBranchId
    );


    /*
     * Read the newest cloud copy first.
     */

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


        const cloudBranchStock =
            normalizeBranchStock(
                cloudProduct.branchStock
            );


        /*
         * Start from latest Firebase stock.
         */

        finalBranchStock = {

            ...cloudBranchStock
        };


        /*
         * Replace ONLY the active branch
         * quantity from this device.
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
         * Brand-new product:
         * local branchStock is authoritative.
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


    const cloudProductData = {

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

            cloudProductData,

            {
                merge:
                    true
            }
        );


        console.log(
            "✅ Inventory product synced safely:",
            product.name ||
            productId
        );


        return true;


    } catch (error) {

        console.error(
            "❌ Inventory product save failed:",
            error
        );


        throw createFriendlyError(
            error
        );
    }
}


/* ==========================================
   REALTIME PRODUCTS LISTENER
========================================== */

async function startRealtimeListener() {

    const firebase =
        await getFirebase();


    if (
        typeof productsUnsubscribe ===
        "function"
    ) {

        productsUnsubscribe();


        productsUnsubscribe =
            null;
    }


    productsUnsubscribe =
        onSnapshot(

            collection(
                firebase.db,
                COLLECTION_NAME
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
                    readLocalProducts();


                const mergedProducts =
                    mergeProductsSafely(
                        localProducts,
                        cloudProducts
                    );


                saveLocalProducts(
                    mergedProducts
                );


                /*
                 * Notify all ERP modules.
                 *
                 * source:"cloud" prevents a
                 * cloud-download → cloud-upload loop
                 * in modules that respect it.
                 */

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
                                    mergedProducts
                            }
                        }
                    )
                );


                console.log(
                    "☁️ Inventory realtime products received:",
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
                    createFriendlyError(
                        error
                    ).message,
                    "error"
                );
            }
        );
}


/* ==========================================
   SAFE CLOUD → LOCAL MERGE
========================================== */

function mergeProductsSafely(
    localProducts,
    cloudProducts
) {

    const productMap =
        new Map();


    /*
     * Start with local data so device-local
     * images remain available.
     */

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


    /*
     * Firebase data is authoritative for
     * business fields and branch quantities.
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
             * IMPORTANT:
             *
             * Cloud branchStock is authoritative
             * when it exists.
             *
             * We do NOT merge stale local branch
             * quantities over Firebase quantities.
             */

            let finalBranchStock =
                cloudBranchStock;


            /*
             * Compatibility for an old cloud
             * product with no branchStock.
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


            /*
             * Preserve local Base64 product image
             * when Firestore does not contain one.
             */

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
   MANUAL SYNC

   IMPORTANT:
   This does NOT upload every local product.

   It refreshes the cloud connection/listener.
========================================== */

async function syncLocal() {

    /*
     * Kept for compatibility with other
     * Jufelix modules that may call:
     *
     * JufelixInventoryCloud.syncLocal()
     *
     * We deliberately DO NOT upload the full
     * local inventory here.
     */


    await getFirebase();


    if (
        typeof productsUnsubscribe !==
        "function"
    ) {

        await startRealtimeListener();
    }


    return {

        successful:
            0,

        failed:
            0,

        fullUploadPrevented:
            true
    };
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
   ONLINE AGAIN
========================================== */

window.addEventListener(
    "online",
    function () {

        if (
            !productsUnsubscribe
        ) {

            startRealtimeListener()
                .catch(
                    function (error) {

                        console.warn(
                            "Inventory reconnect failed:",
                            error
                        );
                    }
                );
        }
    }
);


/* ==========================================
   ERP DATA EVENT

   IMPORTANT:
   We DO NOT automatically upload the entire
   products array when PRODUCTS_KEY changes.

   Inventory.js now explicitly calls
   saveProduct(product).

   Sales, Transfers and Purchases use their
   own cloud bridges.
========================================== */

document.addEventListener(
    "jufelix:data-updated",
    function (event) {

        if (
            !event.detail ||
            event.detail.key !==
                PRODUCTS_KEY
        ) {

            return;
        }


        if (
            event.detail.source ===
            "cloud"
        ) {

            return;
        }


        console.log(
            "Inventory local product data changed. Waiting for the responsible module to sync the affected product."
        );
    }
);


/* ==========================================
   DATA UPDATED EVENT
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


    document.dispatchEvent(

        new CustomEvent(
            "jufelix:dataChanged",
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
            "Firebase rejected the inventory update because this user does not have permission to write products."
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
            "Inventory Firebase operation failed."
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
            "100000";

        toast.style.maxWidth =
            "340px";

        toast.style.padding =
            "13px 16px";

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
        type ===
            "error"
            ? "#dc3545"
            : "#198754";


    toast.style.display =
        "block";


    window.clearTimeout(
        showCloudStatus.timer
    );


    showCloudStatus.timer =
        window.setTimeout(
            function () {

                if (toast) {

                    toast.style.display =
                        "none";
                }
            },
            3000
        );
}


/* ==========================================
   PUBLIC API
========================================== */

window.JufelixInventoryCloud = {

    saveProduct:
        saveProduct,

    syncLocal:
        syncLocal,

    checkFirebaseUser:
        checkFirebaseUser,

    readLocalProducts:
        readLocalProducts,

    refresh:
        async function () {

            await startRealtimeListener();

            return true;
        }
};


/* ==========================================
   START
========================================== */

async function startInventoryCloud() {

    if (started) {

        return;
    }


    started =
        true;


    try {

        const firebase =
            await getFirebase();


        console.log(
            "✅ Inventory Firebase authenticated:",
            firebase.user
                ? (
                    firebase.user.email ||
                    firebase.user.uid
                )
                : "User"
        );


        /*
         * DOWNLOAD FIRST.
         *
         * We intentionally do not push the
         * local inventory during startup.
         */

        await startRealtimeListener();


        console.log(
            "✅ Jufelix Safe Inventory Cloud ready."
        );


        showCloudStatus(
            "Inventory cloud ready",
            "success"
        );


        document.dispatchEvent(

            new CustomEvent(
                "jufelix:inventory-cloud-ready"
            )
        );


    } catch (error) {

        const friendly =
            createFriendlyError(
                error
            );


        console.error(
            "❌ Inventory Cloud startup failed:",
            error
        );


        showCloudStatus(
            friendly.message,
            "error"
        );


        /*
         * Still expose the ready event so
         * Inventory can remain usable offline.
         */

        document.dispatchEvent(

            new CustomEvent(
                "jufelix:inventory-cloud-ready",
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

startInventoryCloud();