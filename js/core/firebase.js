/* =========================================
   JUFELIX ERP v7.0
   FIREBASE PRODUCTION CONNECTION
========================================= */

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


const firebaseEnabled =
    window.JUFELIX_FIREBASE_ENABLED === true;

const firebaseConfig =
    window.JUFELIX_FIREBASE_CONFIG;


/* =========================================
   VALIDATE CONFIGURATION
========================================= */

if (
    !firebaseEnabled ||
    !firebaseConfig ||
    !firebaseConfig.apiKey ||
    !firebaseConfig.projectId
) {

    console.warn(
        "Jufelix Firebase is not enabled or configured."
    );

} else {

    try {

        const app =
            getApps().length
                ? getApp()
                : initializeApp(
                    firebaseConfig
                );


        const db =
            getFirestore(
                app
            );


        const auth =
            getAuth(
                app
            );


        /* =====================================
           GENERIC DOCUMENT SAVE
        ===================================== */

        async function saveDocument(
            collectionName,
            documentId,
            data
        ) {

            if (!collectionName) {

                throw new Error(
                    "Firebase collection name is missing."
                );
            }


            if (!documentId) {

                throw new Error(
                    "Firebase document ID is missing."
                );
            }


            await setDoc(

                doc(
                    db,
                    String(
                        collectionName
                    ),
                    String(
                        documentId
                    )
                ),

                {
                    ...data,

                    cloudUpdatedAt:
                        serverTimestamp()
                },

                {
                    merge:
                        true
                }
            );


            return true;
        }


        window.JufelixFirebase = {

            app:
                app,

            db:
                db,

            auth:
                auth,

            ready:
                true,

            saveDocument:
                saveDocument
        };


        document.dispatchEvent(
            new CustomEvent(
                "jufelix:firebase-ready",
                {
                    detail: {
                        app,
                        db,
                        auth
                    }
                }
            )
        );


        console.log(
            "✅ Jufelix Firebase connected successfully."
        );


    } catch (
        error
    ) {

        console.error(
            "Jufelix Firebase connection failed:",
            error
        );


        window.JufelixFirebase = {

            ready:
                false,

            error:
                error
        };


        document.dispatchEvent(
            new CustomEvent(
                "jufelix:firebase-error",
                {
                    detail:
                        error
                }
            )
        );
    }
}