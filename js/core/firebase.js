/* =========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   FIREBASE PRODUCTION CONNECTION

   File:
   js/core/firebase.js

   + Firebase App
   + Firestore
   + Authentication
   + Waits for Auth restoration
   + Global Firebase ready state
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
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


/* =========================================
   CONFIGURATION
========================================= */

const firebaseEnabled =
    window.JUFELIX_FIREBASE_ENABLED === true;


const firebaseConfig =
    window.JUFELIX_FIREBASE_CONFIG;


/* =========================================
   DEFAULT STATE
========================================= */

window.JufelixFirebase = {

    app: null,

    db: null,

    auth: null,

    user: null,

    ready: false,

    authReady: false,

    error: null
};


/* =========================================
   VALIDATE CONFIGURATION
========================================= */

if (
    !firebaseEnabled ||
    !firebaseConfig ||
    !firebaseConfig.apiKey ||
    !firebaseConfig.projectId
) {

    const error =
        new Error(
            "Jufelix Firebase is not enabled or configured."
        );


    window.JufelixFirebase.error =
        error;


    console.warn(
        error.message
    );


    document.dispatchEvent(
        new CustomEvent(
            "jufelix:firebase-error",
            {
                detail:
                    error
            }
        )
    );


} else {

    initializeFirebase();

}


/* =========================================
   INITIALIZE FIREBASE
========================================= */

function initializeFirebase() {

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


        /*
         * Database can exist before Firebase Auth
         * has restored the current signed-in user.
         *
         * Store the Firebase objects now,
         * but DO NOT mark Firebase fully ready yet.
         */

        window.JufelixFirebase = {

            app:
                app,

            db:
                db,

            auth:
                auth,

            user:
                null,

            ready:
                false,

            authReady:
                false,

            error:
                null
        };


        console.log(
            "Firebase initialized. Waiting for authentication state..."
        );


        /*
         * This fires after Firebase has restored
         * the persisted authentication session.
         */

        let firstAuthCheck =
            true;


        onAuthStateChanged(
            auth,

            function (
                user
            ) {

                window.JufelixFirebase.user =
                    user || null;


                window.JufelixFirebase.authReady =
                    true;


                /*
                 * Firebase itself is now ready.
                 *
                 * A page such as login.html can still
                 * have user === null, which is normal.
                 */

                window.JufelixFirebase.ready =
                    true;


                if (user) {

                    console.log(
                        "✅ Firebase authenticated:",
                        user.email ||
                        user.uid
                    );

                } else {

                    console.log(
                        "Firebase ready: no authenticated user."
                    );

                }


                document.dispatchEvent(
                    new CustomEvent(
                        "jufelix:firebase-ready",
                        {
                            detail: {

                                app:
                                    app,

                                db:
                                    db,

                                auth:
                                    auth,

                                user:
                                    user || null,

                                authenticated:
                                    Boolean(
                                        user
                                    )
                            }
                        }
                    )
                );


                document.dispatchEvent(
                    new CustomEvent(
                        "jufelix:auth-ready",
                        {
                            detail: {

                                user:
                                    user || null,

                                authenticated:
                                    Boolean(
                                        user
                                    )
                            }
                        }
                    )
                );


                /*
                 * Useful diagnostic after reload.
                 */

                if (
                    firstAuthCheck
                ) {

                    firstAuthCheck =
                        false;


                    if (!user) {

                        console.warn(
                            "⚠️ No Firebase Authentication session was restored."
                        );

                    }

                }

            },

            function (
                error
            ) {

                console.error(
                    "Firebase authentication state failed:",
                    error
                );


                window.JufelixFirebase.error =
                    error;


                window.JufelixFirebase.authReady =
                    true;


                window.JufelixFirebase.ready =
                    false;


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
        );


    } catch (
        error
    ) {

        console.error(
            "Jufelix Firebase connection failed:",
            error
        );


        window.JufelixFirebase = {

            app: null,

            db: null,

            auth: null,

            user: null,

            ready: false,

            authReady: true,

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


/* =========================================
   PUBLIC WAIT HELPER
========================================= */

window.waitForJufelixFirebase =
    function (
        options
    ) {

        const settings =
            options || {};


        const requireUser =
            settings.requireUser ===
            true;


        const timeout =
            Number(
                settings.timeout ||
                15000
            );


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
                        firebase.ready &&
                        firebase.authReady &&
                        firebase.db &&
                        firebase.auth
                    ) {

                        if (
                            requireUser &&
                            !firebase.user
                        ) {

                            reject(
                                new Error(
                                    "Firebase user is not authenticated."
                                )
                            );

                            return;
                        }


                        resolve(
                            firebase
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
                                "Firebase initialization timed out."
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
    };