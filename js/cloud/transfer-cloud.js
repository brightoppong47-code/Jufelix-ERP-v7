/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   TRANSFERS CLOUD BRIDGE

   NO FIREBASE IMPORTS HERE.
   Uses window.JufelixFirebase.
========================================== */

(function () {
    "use strict";


    const TRANSFERS_KEY =
        "jufelix_v7_transfers";


    /* ==========================================
       WAIT FOR FIREBASE
    ========================================== */

    function waitForFirebase(
        timeout
    ) {

        timeout =
            timeout ||
            15000;


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
                        window.JufelixFirebase.ready ===
                            true &&
                        typeof window
                            .JufelixFirebase
                            .saveDocument ===
                            "function"
                    ) {

                        resolve(
                            window.JufelixFirebase
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
                                "Firebase connection API was not ready."
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
       CLEAN PRODUCT
    ========================================== */

    function prepareProduct(
        product
    ) {

        const data = {
            ...product
        };


        [
            "image",
            "imageData",
            "photo"
        ].forEach(
            function (
                field
            ) {

                if (
                    typeof data[field] ===
                        "string" &&
                    data[field].startsWith(
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


        const firebase =
            await waitForFirebase();


        await firebase.saveDocument(

            "transfers",

            transfer.id,

            transfer
        );


        console.log(
            "✅ Transfer uploaded to Firebase:",
            transfer.transferNumber ||
            transfer.id
        );


        return true;
    }


    /* ==========================================
       SAVE PRODUCT
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
            await waitForFirebase();


        await firebase.saveDocument(

            "products",

            product.id,

            prepareProduct(
                product
            )
        );


        console.log(
            "✅ Transfer stock uploaded to Firebase:",
            product.name ||
            product.id
        );


        return true;
    }


    /* ==========================================
       SYNC EXISTING TRANSFERS
    ========================================== */

    async function syncLocal() {

        let transfers = [];


        try {

            const stored =
                JSON.parse(
                    localStorage.getItem(
                        TRANSFERS_KEY
                    ) ||
                    "[]"
                );


            transfers =
                Array.isArray(
                    stored
                )
                    ? stored
                    : [];

        } catch (
            error
        ) {

            transfers =
                [];
        }


        let successful =
            0;

        let failed =
            0;


        for (
            const transfer of
            transfers
        ) {

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
                    "Existing transfer sync failed:",
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
        "✅ JufelixTransfersCloud loaded."
    );


    /* ==========================================
       SYNC EXISTING TRANSFERS
    ========================================== */

    window.setTimeout(
        function () {

            syncLocal()
                .then(
                    function (
                        result
                    ) {

                        console.log(
                            "Transfer sync result:",
                            result
                        );
                    }
                )
                .catch(
                    function (
                        error
                    ) {

                        console.error(
                            "Transfer initial sync failed:",
                            error
                        );
                    }
                );

        },
        1500
    );

})();