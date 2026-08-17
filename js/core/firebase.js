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
    getFirestore
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
                : initializeApp(firebaseConfig);

        const db =
            getFirestore(app);

        const auth =
            getAuth(app);


        window.JufelixFirebase = {
            app,
            db,
            auth,
            ready: true
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
            "Jufelix Firebase connected successfully."
        );

    } catch (error) {

        console.error(
            "Jufelix Firebase connection failed:",
            error
        );


        window.JufelixFirebase = {
            ready: false,
            error
        };


        document.dispatchEvent(
            new CustomEvent(
                "jufelix:firebase-error",
                {
                    detail: error
                }
            )
        );

    }

}