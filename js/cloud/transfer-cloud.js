import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


console.log("Transfers Cloud file started");


function waitForFirebase() {

    return new Promise(function (resolve, reject) {

        let attempts = 0;

        const timer = setInterval(function () {

            attempts++;

            if (
                window.JufelixFirebase &&
                window.JufelixFirebase.db
            ) {

                clearInterval(timer);

                resolve(
                    window.JufelixFirebase.db
                );

                return;
            }


            if (attempts >= 150) {

                clearInterval(timer);

                reject(
                    new Error(
                        "Firebase database was not ready."
                    )
                );
            }

        }, 100);

    });
}


async function saveTransfer(transfer) {

    if (!transfer || !transfer.id) {

        throw new Error(
            "Transfer ID is missing."
        );
    }


    const db =
        await waitForFirebase();


    await setDoc(

        doc(
            db,
            "transfers",
            String(transfer.id)
        ),

        {
            ...transfer,

            cloudUpdatedAt:
                serverTimestamp()
        },

        {
            merge: true
        }
    );


    console.log(
        "Transfer uploaded:",
        transfer.id
    );


    return true;
}


async function saveProduct(product) {

    if (!product || !product.id) {

        throw new Error(
            "Product ID is missing."
        );
    }


    const db =
        await waitForFirebase();


    const data = {
        ...product
    };


    /*
     * Do not send large local base64 images
     * to Firestore.
     */
    if (
        typeof data.image === "string" &&
        data.image.startsWith("data:image/")
    ) {

        delete data.image;
    }


    if (
        typeof data.imageData === "string" &&
        data.imageData.startsWith("data:image/")
    ) {

        delete data.imageData;
    }


    if (
        typeof data.photo === "string" &&
        data.photo.startsWith("data:image/")
    ) {

        delete data.photo;
    }


    await setDoc(

        doc(
            db,
            "products",
            String(product.id)
        ),

        {
            ...data,

            cloudUpdatedAt:
                serverTimestamp()
        },

        {
            merge: true
        }
    );


    return true;
}


async function syncLocal() {

    let transfers = [];


    try {

        transfers =
            JSON.parse(
                localStorage.getItem(
                    "jufelix_v7_transfers"
                ) || "[]"
            );


        if (!Array.isArray(transfers)) {

            transfers = [];
        }

    } catch (error) {

        transfers = [];
    }


    let successful = 0;
    let failed = 0;


    for (const transfer of transfers) {

        try {

            await saveTransfer(
                transfer
            );

            successful++;

        } catch (error) {

            failed++;

            console.error(
                "Transfer upload failed:",
                error
            );
        }
    }


    return {
        successful,
        failed
    };
}


/* ==========================================
   CREATE API IMMEDIATELY
========================================== */

window.JufelixTransfersCloud = {

    saveTransfer,

    saveProduct,

    syncLocal
};


console.log(
    "JufelixTransfersCloud loaded successfully."
);