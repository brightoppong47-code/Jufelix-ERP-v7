/* =========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   FIREBASE CORE v704

   File:
   js/core/firebase.js

   + Firebase App
   + Firestore
   + Firebase Authentication
   + Fast Firebase Initialization
   + Auth Restoration
   + Multi-Device Ready
   + Safe Firebase Wait Helper
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
   GLOBAL STATE
========================================= */

window.JufelixFirebase = {

    app: null,

    db: null,

    auth: null,

    user: null,

    ready: false,

    authReady: false,

    initialized: false,

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


    console.error(
        "❌",
        error.message
    );


    document.dispatchEvent(
        new CustomEvent(
            "jufelix:firebase-error",
            {
                detail: {
                    error:
                        error,

                    message:
                        error.message
                }
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

        /* =====================================
           APP
        ===================================== */

        const app =
            getApps().length > 0

                ? getApp()

                : initializeApp(
                    firebaseConfig
                );


        /* =====================================
           FIRESTORE
        ===================================== */

        const db =
            getFirestore(
                app
            );


        /* =====================================
           AUTHENTICATION
        ===================================== */

        const auth =
            getAuth(
                app
            );


        /*
         * IMPORTANT:
         *
         * App, Firestore and Auth are usable
         * immediately.
         *
         * We do NOT wait for onAuthStateChanged
         * before making them available.
         */

        window.JufelixFirebase.app =
            app;

        window.JufelixFirebase.db =
            db;

        window.JufelixFirebase.auth =
            auth;

        window.JufelixFirebase.initialized =
            true;

        window.JufelixFirebase.ready =
            true;

        window.JufelixFirebase.error =
            null;


        console.log(
            "✅ Firebase core initialized."
        );


        console.log(
            "✅ Firestore ready."
        );


        console.log(
            "✅ Firebase Authentication ready."
        );


        /* =====================================
           CORE READY EVENT
        ===================================== */

        document.dispatchEvent(
            new CustomEvent(
                "jufelix:firebase-core-ready",
                {
                    detail: {

                        app:
                            app,

                        db:
                            db,

                        auth:
                            auth
                    }
                }
            )
        );


        /* =====================================
           AUTH RESTORATION
        ===================================== */

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
                 * Keep ready = true because
                 * Firebase itself is working,
                 * whether a user is signed in
                 * or not.
                 */

                window.JufelixFirebase.ready =
                    true;


                if (user) {

                    console.log(
                        "✅ Firebase user authenticated:",
                        user.email ||
                        user.uid
                    );


                } else {

                    console.log(
                        "ℹ️ Firebase Authentication ready. No signed-in user."
                    );
                }


                /* =================================
                   FIREBASE READY
                ================================= */

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


                /* =================================
                   AUTH READY
                ================================= */

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

            },

            function (
                error
            ) {

                console.error(
                    "❌ Firebase Authentication state error:",
                    error
                );


                /*
                 * Firebase core can remain usable
                 * even if auth restoration fails.
                 */

                window.JufelixFirebase.user =
                    null;


                window.JufelixFirebase.authReady =
                    true;


                window.JufelixFirebase.error =
                    error;


                document.dispatchEvent(
                    new CustomEvent(
                        "jufelix:firebase-auth-error",
                        {
                            detail: {

                                error:
                                    error,

                                message:
                                    error.message ||
                                    "Firebase Authentication failed."
                            }
                        }
                    )
                );
            }
        );


    } catch (
        error
    ) {

        console.error(
            "❌ Jufelix Firebase initialization failed:",
            error
        );


        window.JufelixFirebase.app =
            null;

        window.JufelixFirebase.db =
            null;

        window.JufelixFirebase.auth =
            null;

        window.JufelixFirebase.user =
            null;

        window.JufelixFirebase.ready =
            false;

        window.JufelixFirebase.authReady =
            true;

        window.JufelixFirebase.initialized =
            false;

        window.JufelixFirebase.error =
            error;


        document.dispatchEvent(
            new CustomEvent(
                "jufelix:firebase-error",
                {
                    detail: {

                        error:
                            error,

                        message:
                            error.message ||
                            "Firebase initialization failed."
                    }
                }
            )
        );
    }
}


/* =========================================
   FIREBASE WAIT HELPER
========================================= */

window.waitForJufelixFirebase =
    function (
        options
    ) {

        const settings =
            options || {};


        const requireUser =
            settings.requireUser === true;


        const timeout =
            Number(
                settings.timeout ||
                20000
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


                    /* =================================
                       FATAL INITIALIZATION ERROR
                    ================================= */

                    if (
                        firebase &&
                        firebase.error &&
                        !firebase.db &&
                        !firebase.auth
                    ) {

                        reject(
                            firebase.error
                        );

                        return;
                    }


                    /* =================================
                       CORE FIREBASE READY
                    ================================= */

                    if (
                        firebase &&
                        firebase.app &&
                        firebase.db &&
                        firebase.auth
                    ) {

                        /*
                         * Login page only needs
                         * Firebase core.
                         */

                        if (!requireUser) {

                            resolve(
                                firebase
                            );

                            return;
                        }


                        /*
                         * Cloud pages need an
                         * authenticated user.
                         */

                        const authenticatedUser =

                            firebase.user ||

                            firebase.auth.currentUser;


                        if (authenticatedUser) {

                            firebase.user =
                                authenticatedUser;


                            resolve(
                                firebase
                            );

                            return;
                        }
                    }


                    /* =================================
                       TIMEOUT
                    ================================= */

                    if (
                        Date.now() -
                        startedAt >=
                        timeout
                    ) {

                        if (
                            requireUser
                        ) {

                            reject(
                                new Error(
                                    "Firebase user is not authenticated."
                                )
                            );

                        } else {

                            reject(
                                new Error(
                                    "Firebase initialization timed out."
                                )
                            );
                        }


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


/* =========================================
   PUBLIC FIREBASE STATUS
========================================= */

window.getJufelixFirebaseStatus =
    function () {

        const firebase =
            window.JufelixFirebase ||
            {};


        return {

            initialized:
                Boolean(
                    firebase.app &&
                    firebase.db &&
                    firebase.auth
                ),

            firebaseReady:
                Boolean(
                    firebase.ready
                ),

            authReady:
                Boolean(
                    firebase.authReady
                ),

            authenticated:
                Boolean(
                    firebase.user ||
                    (
                        firebase.auth &&
                        firebase.auth.currentUser
                    )
                ),

            email:
                firebase.user
                    ? (
                        firebase.user.email ||
                        ""
                    )
                    : "",

            error:
                firebase.error
                    ? (
                        firebase.error.message ||
                        String(
                            firebase.error
                        )
                    )
                    : null
        };
    };


console.log(
    "🔥 Jufelix Firebase Core v704 loaded."
);