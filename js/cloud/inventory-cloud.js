/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   INVENTORY CLOUD + FIREBASE STORAGE

   File:
   js/cloud/inventory-cloud.js

   + Firebase Authentication aware
   + Realtime Firestore products
   + Firebase Storage product images
   + Product images available on all devices
   + Safe multi-device branch stock
   + Preserves other branches during edit
   + Local Base64 image uploaded to Storage
   + Firestore stores imageUrl
   + Permanent product + image deletion
========================================== */


import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


import {
    getStorage,
    ref,
    uploadString,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";


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

const IMAGE_FOLDER =
    "product-images";


/* ==========================================
   STATE
========================================== */

let database =
    null;

let storage =
    null;

let started =
    false;

let productsUnsubscribe =
    null;


/* ==========================================
   WAIT FOR FIREBASE
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


        storage =
            getStorage(
                firebase.app
            );


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
                    firebase.app &&
                    firebase.db &&
                    firebase.auth &&
                    firebase.auth.currentUser
                ) {

                    database =
                        firebase.db;


                    storage =
                        getStorage(
                            firebase.app
                        );


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
   IMAGE HELPERS
========================================== */

function isBase64Image(
    value
) {

    return (
        typeof value ===
            "string" &&
        value.startsWith(
            "data:image/"
        )
    );
}


function isRemoteImage(
    value
) {

    return (
        typeof value ===
            "string" &&
        (
            value.startsWith(
                "https://"
            ) ||
            value.startsWith(
                "http://"
            )
        )
    );
}


function getProductImagePath(
    productId
) {

    return (
        IMAGE_FOLDER +
        "/" +
        String(
            productId
        ) +
        ".jpg"
    );
}


/* ==========================================
   UPLOAD PRODUCT IMAGE
========================================== */

async function uploadProductImage(
    productId,
    imageData
) {

    await getFirebase();


    if (!storage) {

        throw new Error(
            "Firebase Storage is not ready."
        );
    }


    if (
        !isBase64Image(
            imageData
        )
    ) {

        return "";
    }


    const imageReference =
        ref(
            storage,
            getProductImagePath(
                productId
            )
        );


    console.log(
        "☁️ Uploading product image:",
        productId
    );


    await uploadString(

        imageReference,

        imageData,

        "data_url",

        {
            contentType:
                "image/jpeg",

            customMetadata: {

                productId:
                    String(
                        productId
                    )
            }
        }
    );


    const downloadUrl =
        await getDownloadURL(
            imageReference
        );


    console.log(
        "✅ Product image uploaded:",
        productId
    );


    return downloadUrl;
}


/* ==========================================
   DELETE STORAGE IMAGE
========================================== */

async function deleteProductImage(
    productId
) {

    await getFirebase();


    if (!storage) {
        return false;
    }


    const imageReference =
        ref(
            storage,
            getProductImagePath(
                productId
            )
        );


    try {

        await deleteObject(
            imageReference
        );


        console.log(
            "✅ Product image deleted:",
            productId
        );


        return true;


    } catch (error) {

        const code =
            String(
                error &&
                error.code ||
                ""
            );


        /*
         * Product may never have had
         * a Storage image.
         */

        if (
            code ===
            "storage/object-not-found"
        ) {

            return true;
        }


        console.warn(
            "Product image deletion failed:",
            error
        );


        return false;
    }
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
     * Base64 must never be stored
     * inside Firestore.
     */

    [
        "image",
        "imageData",
        "photo"
    ].forEach(
        function (
            field
        ) {

            if (
                isBase64Image(
                    data[field]
                )
            ) {

                delete data[field];
            }
        }
    );


    /*
     * localOnly is device state,
     * not business data.
     */

    delete data.localOnly;


    return data;
}


/* ==========================================
   SAVE ONE PRODUCT SAFELY
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
     * Read current cloud product first.
     */

    const cloudSnapshot =
        await getDoc(
            productRef
        );


    const existingCloudProduct =
        cloudSnapshot.exists()
            ? (
                cloudSnapshot.data() ||
                {}
            )
            : {};


    /* ==========================================
       BRANCH STOCK MERGE
    ========================================== */

    let finalBranchStock =
        {};


    if (
        cloudSnapshot.exists()
    ) {

        const cloudBranchStock =
            normalizeBranchStock(
                existingCloudProduct.branchStock
            );


        finalBranchStock = {

            ...cloudBranchStock
        };


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


    /* ==========================================
       IMAGE SYNC
    ========================================== */

    const localImage =

        product.image ||

        product.imageData ||

        product.photo ||

        "";


    let finalImageUrl =
        String(
            existingCloudProduct.imageUrl ||
            existingCloudProduct.image ||
            ""
        );


    /*
     * New locally selected image.
     */

    if (
        isBase64Image(
            localImage
        )
    ) {

        finalImageUrl =
            await uploadProductImage(
                productId,
                localImage
            );
    }


    /*
     * Existing cloud URL carried by
     * the local product.
     */

    else if (
        isRemoteImage(
            localImage
        )
    ) {

        finalImageUrl =
            localImage;
    }


    /*
     * Empty image means the user removed
     * the image while editing.
     */

    else if (
        localImage === ""
    ) {

        if (
            existingCloudProduct.imageUrl ||
            existingCloudProduct.image
        ) {

            await deleteProductImage(
                productId
            );
        }


        finalImageUrl =
            "";
    }


    /* ==========================================
       FIRESTORE DATA
    ========================================== */

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

        image:
            finalImageUrl,

        imageUrl:
            finalImageUrl,

        imageStoredLocally:
            false,

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


        /*
         * Update this device immediately
         * with the Storage URL too.
         */

        updateLocalProductImage(
            productId,
            finalImageUrl
        );


        console.log(
            "✅ Inventory product + image synced:",
            product.name ||
            productId
        );


        return {

            success:
                true,

            imageUrl:
                finalImageUrl
        };


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
   UPDATE LOCAL IMAGE URL
========================================== */

function updateLocalProductImage(
    productId,
    imageUrl
) {

    const products =
        readLocalProducts();


    let changed =
        false;


    const updated =
        products.map(
            function (
                product
            ) {

                if (
                    String(
                        product.id
                    ) !==
                    String(
                        productId
                    )
                ) {

                    return product;
                }


                changed =
                    true;


                return {

                    ...product,

                    image:
                        imageUrl ||
                        "",

                    imageUrl:
                        imageUrl ||
                        "",

                    imageStoredLocally:
                        false
                };
            }
        );


    if (changed) {

        saveLocalProducts(
            updated
        );
    }
}


/* ==========================================
   DELETE PRODUCT FROM FIREBASE
========================================== */

async function deleteProduct(
    productId
) {

    if (!productId) {

        throw new Error(
            "Product ID is required."
        );
    }


    const firebase =
        await getFirebase();


    try {

        /*
         * Delete image first.
         */

        await deleteProductImage(
            productId
        );


        /*
         * Delete Firestore document.
         */

        await deleteDoc(

            doc(
                firebase.db,
                COLLECTION_NAME,
                String(
                    productId
                )
            )
        );


        console.log(
            "✅ Product and image deleted from Firebase:",
            productId
        );


        return true;


    } catch (error) {

        console.error(
            "❌ Firebase product deletion failed:",
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

    const cloudMap =
        new Map();


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


            cloudMap.set(
                String(
                    cloudProduct.id
                ),
                cloudProduct
            );
        }
    );


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


    cloudMap.forEach(
        function (
            cloudProduct,
            productId
        ) {

            const localProduct =
                localMap.get(
                    productId
                ) ||
                {};


            let finalBranchStock =
                normalizeBranchStock(
                    cloudProduct.branchStock
                );


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

                localProduct.imageUrl ||

                "";


            const cloudImage =

                cloudProduct.imageUrl ||

                cloudProduct.image ||

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
                    ),

                image:
                    cloudImage ||
                    localImage ||
                    "",

                imageUrl:
                    cloudImage ||
                    ""
            };


            result.push(
                mergedProduct
            );
        }
    );


    /*
     * Preserve products that were created
     * offline and have not reached Firebase.
     */

    localMap.forEach(
        function (
            localProduct,
            productId
        ) {

            if (
                cloudMap.has(
                    productId
                )
            ) {

                return;
            }


            if (
                localProduct.localOnly ===
                true
            ) {

                result.push(
                    localProduct
                );
            }
        }
    );


    return result;
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
========================================== */

async function syncLocal() {

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
                    function (
                        error
                    ) {

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
========================================== */

document.addEventListener(
    "jufelix:data-updated",
    function (
        event
    ) {

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
            "Inventory local product changed."
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
            "storage/unauthorized"
        )
    ) {

        return new Error(
            "Firebase Storage rejected the product image upload. Check Storage rules."
        );
    }


    if (
        code.includes(
            "storage/bucket-not-found"
        )
    ) {

        return new Error(
            "Firebase Storage bucket was not found. Check firebase-config.js."
        );
    }


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
            "Firebase rejected the inventory operation because this user does not have permission."
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
            3500
        );
}


/* ==========================================
   PUBLIC API
========================================== */

window.JufelixInventoryCloud = {

    saveProduct:
        saveProduct,

    deleteProduct:
        deleteProduct,

    deleteProductImage:
        deleteProductImage,

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


        await startRealtimeListener();


        console.log(
            "✅ Inventory Cloud + Storage ready."
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