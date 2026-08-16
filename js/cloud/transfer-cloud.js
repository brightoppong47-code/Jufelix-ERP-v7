/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   TRANSFERS CLOUD BRIDGE

   File:
   js/cloud/transfers-cloud.js

   Responsibilities:
   - Save transfer records to Firestore
   - Sync updated product branchStock
   - Import cloud transfers to local storage
   - Preserve local product images
   - Never move stock by itself
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

const TRANSFERS_KEY =
    "jufelix_v7_transfers";


let db = null;

let stopTransfers = null;
let stopProducts = null;


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


    /*
     * Keep large base64 images local.
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
   FIREBASE ERROR
========================================== */

function reportError(
    operation,
    error
) {

    console.error(
        "❌ Transfers Firebase error:",
        operation,
        error
    );


    const code =
        error && error.code
            ? error.code
            : "unknown";


    const message =
        error && error.message
            ? error.message
            : "Unknown Firebase error";


    let box =
        document.getElementById(
            "transferFirebaseDebug"
        );


    if (!box) {

        box =
            document.createElement(
                "div"
            );


        box.id =
            "transferFirebaseDebug";


        box.style.position =
            "fixed";

        box.style.left =
            "12px";

        box.style.right =
            "12px";

        box.style.bottom =
            "12px";

        box.style.zIndex =
            "999999";

        box.style.padding =
            "15px";

        box.style.borderRadius =
            "10px";

        box.style.background =
            "#7f1d1d";

        box.style.color =
            "#ffffff";

        box.style.fontSize =
            "14px";

        box.style.lineHeight =
            "1.5";

        box.style.boxShadow =
            "0 8px 30px rgba(0,0,0,.35)";


        document.body.appendChild(
            box
        );
    }


    box.innerHTML =
        "<strong>TRANSFER FIREBASE ERROR</strong><br>" +
        "Operation: " +
        escapeDebug(operation) +
        "<br>" +
        "Code: " +
        escapeDebug(code) +
        "<br>" +
        "Message: " +
        escapeDebug(message);


    if (
        code ===
        "permission-denied"
    ) {

        box.innerHTML +=
            "<br><br>Firestore Security Rules rejected this transfer.";
    }
}


function escapeDebug(
    value
) {

    return String(
        value === undefined ||
        value === null
            ? ""
            : value
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ==========================================
   SAVE TRANSFER
========================================== */

async function saveTransfer(
    transfer
) {

    try {

        const database =
            await waitForDb();


        if (
            !transfer ||
            !transfer.id
        ) {

            throw new Error(
                "Transfer ID is missing."
            );
        }


        await setDoc(

            doc(
                database,
                "transfers",
                String(
                    transfer.id
                )
            ),

            {
                ...cleanValue(
                    transfer
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
            "✅ Transfer synced to Firebase:",
            transfer.transferNumber ||
            transfer.id
        );


        return true;


    } catch (
        error
    ) {

        reportError(
            "SAVE TRANSFER",
            error
        );


        throw error;
    }
}


/* ==========================================
   SAVE UPDATED PRODUCT STOCK
========================================== */

async function saveProduct(
    product
) {

    try {

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


        console.log(
            "✅ Transfer stock synced:",
            product.name ||
            product.id
        );


        return true;


    } catch (
        error
    ) {

        reportError(
            "SAVE TRANSFER PRODUCT",
            error
        );


        throw error;
    }
}


/* ==========================================
   SYNC EXISTING LOCAL TRANSFERS
========================================== */

async function syncLocal() {

    await waitForDb();


    const localTransfers =
        readArray(
            TRANSFERS_KEY
        );


    let successful =
        0;

    let failed =
        0;


    for (
        const transfer of
        localTransfers
    ) {

        if (
            !transfer ||
            !transfer.id
        ) {

            continue;
        }


        try {

            await saveTransfer(
                transfer
            );


            successful++;


        } catch (
            error
        ) {

            failed++;
        }
    }


    console.log(
        "Transfers cloud sync finished:",
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
                   TRANSFERS
                ================================== */

                stopTransfers =
                    onSnapshot(

                        collection(
                            database,
                            "transfers"
                        ),

                        function (
                            snapshot
                        ) {

                            const cloudTransfers =
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
                                        TRANSFERS_KEY
                                    ),
                                    cloudTransfers
                                );


                            saveArray(
                                TRANSFERS_KEY,
                                merged
                            );


                            dispatchDataUpdated(
                                TRANSFERS_KEY,
                                merged
                            );


                            if (
                                typeof onChange ===
                                    "function"
                            ) {

                                onChange(
                                    "transfers",
                                    merged
                                );
                            }
                        },


                        function (
                            error
                        ) {

                            reportError(
                                "TRANSFER LISTENER",
                                error
                            );
                        }
                    );


                /* ==================================
                   PRODUCTS
                ================================== */

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
                        },


                        function (
                            error
                        ) {

                            reportError(
                                "TRANSFER PRODUCT LISTENER",
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

                reportError(
                    "START TRANSFER LISTENERS",
                    error
                );
            }
        );


    return function () {

        cancelled =
            true;


        if (
            stopTransfers
        ) {

            stopTransfers();

            stopTransfers =
                null;
        }


        if (
            stopProducts
        ) {

            stopProducts();

            stopProducts =
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
                    id
            };


            /*
             * Firestore branchStock is treated as
             * the latest authoritative stock map.
             */
            if (
                cloudProduct.branchStock &&
                typeof cloudProduct.branchStock ===
                    "object" &&
                !Array.isArray(
                    cloudProduct.branchStock
                )
            ) {

                merged.branchStock =
                    normalizeBranchStock(
                        cloudProduct.branchStock
                    );


                merged.quantity =
                    sumBranchStock(
                        merged.branchStock
                    );
            }


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

        console.error(
            "Transfer cloud storage read failed:",
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

    localStorage.setItem(
        key,
        JSON.stringify(
            value
        )
    );
}


/* ==========================================
   DATA EVENT
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
   PUBLIC API
========================================== */

window.JufelixTransfersCloud = {

    saveTransfer:
        saveTransfer,

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
        async function () {

            console.log(
                "✅ Jufelix Transfers Cloud ready."
            );


            try {

                await syncLocal();

            } catch (
                error
            ) {

                reportError(
                    "INITIAL TRANSFER SYNC",
                    error
                );
            }


            listen(
                function (
                    type,
                    records
                ) {

                    console.log(
                        "☁️ Transfer Firebase update:",
                        type,
                        records.length
                    );
                }
            );
        }
    )
    .catch(
        function (
            error
        ) {

            reportError(
                "TRANSFER CLOUD STARTUP",
                error
            );
        }
    )
    .finally(
        function () {

            document.dispatchEvent(
                new CustomEvent(
                    "jufelix:transfers-cloud-ready"
                )
            );
        }
    );