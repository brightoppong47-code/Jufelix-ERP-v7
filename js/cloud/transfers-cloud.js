/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   TRANSFERS CLOUD BRIDGE

   File:
   js/cloud/transfers-cloud.js

   Classic JavaScript version for Acode.
   No static import at top.
========================================== */

(function () {
    "use strict";


    const TRANSFERS_KEY =
        "jufelix_v7_transfers";


    let firestoreTools = null;


    /* ==========================================
       LOAD FIRESTORE TOOLS
    ========================================== */

    async function getFirestoreTools() {

        if (firestoreTools) {

            return firestoreTools;
        }


        firestoreTools =
            await import(
                "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
            );


        return firestoreTools;
    }


    /* ==========================================
       WAIT FOR FIREBASE CONNECTION
    ========================================== */

    function waitForFirebase(
        timeout = 15000
    ) {

        return new Promise(
            function (
                resolve,
                reject
            ) {

                const started =
                    Date.now();


                function check() {

                    if (
                        window.JufelixFirebase &&
                        window.JufelixFirebase.db
                    ) {

                        resolve(
                            window.JufelixFirebase.db
                        );

                        return;
                    }


                    if (
                        Date.now() -
                        started >
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
       CLEAN FIRESTORE DATA
    ========================================== */

    function cleanData(
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
                cleanData
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
                        cleanData(
                            value[key]
                        );
                }
            }
        );


        return result;
    }


    /* ==========================================
       PREPARE PRODUCT
    ========================================== */

    function prepareProduct(
        product
    ) {

        const data =
            cleanData(
                product
            ) || {};


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


        return data;
    }


    /* ==========================================
       SAVE TRANSFER
    ========================================== */

    async function saveTransfer(
        transfer
    ) {

        if (
            !transfer ||
            !transfer.id
        ) {

            throw new Error(
                "Transfer ID is missing."
            );
        }


        const db =
            await waitForFirebase();


        const tools =
            await getFirestoreTools();


        await tools.setDoc(

            tools.doc(
                db,
                "transfers",
                String(
                    transfer.id
                )
            ),

            {
                ...cleanData(
                    transfer
                ),

                cloudUpdatedAt:
                    tools.serverTimestamp()
            },

            {
                merge: true
            }
        );


        console.log(
            "✅ Transfer uploaded to Firebase:",
            transfer.transferNumber ||
            transfer.id
        );


        return true;
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


        const db =
            await waitForFirebase();


        const tools =
            await getFirestoreTools();


        await tools.setDoc(

            tools.doc(
                db,
                "products",
                String(
                    product.id
                )
            ),

            {
                ...prepareProduct(
                    product
                ),

                cloudUpdatedAt:
                    tools.serverTimestamp()
            },

            {
                merge: true
            }
        );


        console.log(
            "✅ Transfer stock uploaded to Firebase:",
            product.name ||
            product.id
        );


        return true;
    }


    /* ==========================================
       SYNC EXISTING LOCAL TRANSFERS
    ========================================== */

    async function syncLocal() {

        let transfers = [];


        try {

            const saved =
                localStorage.getItem(
                    TRANSFERS_KEY
                );


            const parsed =
                saved
                    ? JSON.parse(
                        saved
                    )
                    : [];


            transfers =
                Array.isArray(
                    parsed
                )
                    ? parsed
                    : [];


        } catch (
            error
        ) {

            console.error(
                "Unable to read local transfers:",
                error
            );


            transfers = [];
        }


        let successful = 0;
        let failed = 0;


        for (
            const transfer of transfers
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


                console.error(
                    "Transfer sync failed:",
                    transfer.id,
                    error
                );
            }
        }


        return {
            successful:
                successful,

            failed:
                failed
        };
    }


    /* ==========================================
       PUBLIC API

       IMPORTANT:
       This is created immediately.
    ========================================== */

    window.JufelixTransfersCloud = {

        saveTransfer:
            saveTransfer,

        saveProduct:
            saveProduct,

        syncLocal:
            syncLocal
    };


    console.log(
        "✅ JufelixTransfersCloud API loaded."
    );


    document.dispatchEvent(
        new CustomEvent(
            "jufelix:transfers-cloud-ready"
        )
    );

})();