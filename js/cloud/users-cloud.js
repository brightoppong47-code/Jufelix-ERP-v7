/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   USERS CLOUD BRIDGE

   File:
   js/cloud/users-cloud.js

   COMPLETE REPLACEMENT

   + Does not depend only on firebase.js timing
   + Creates users in Firebase Authentication
   + Saves user profiles to Firestore
   + Keeps administrator logged in
   + Update Firestore users
   + Delete Firestore user profiles
========================================== */

import {
    initializeApp,
    getApps,
    getApp,
    deleteApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";


import {
    createUserWithEmailAndPassword,
    getAuth,
    signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


import {
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* ==========================================
   CONFIG
========================================== */

const FALLBACK_FIREBASE_CONFIG = {

    apiKey:
        "AIzaSyAC3sMFu0LnchFFP1Wrqc_r_fcZWSOWt5I",

    authDomain:
        "jufelix-erp-v7.firebaseapp.com",

    projectId:
        "jufelix-erp-v7",

    storageBucket:
        "jufelix-erp-v7.firebasestorage.app",

    messagingSenderId:
        "1012255951864",

    appId:
        "1:1012255951864:web:539c79ddb4433f1dcb640d"
};


/* ==========================================
   GET CONFIG
========================================== */

function getFirebaseConfig() {

    if (
        window.JUFELIX_FIREBASE_CONFIG &&
        window.JUFELIX_FIREBASE_CONFIG.apiKey &&
        window.JUFELIX_FIREBASE_CONFIG.projectId
    ) {

        return window.JUFELIX_FIREBASE_CONFIG;
    }


    return FALLBACK_FIREBASE_CONFIG;
}


/* ==========================================
   GET MAIN FIREBASE
========================================== */

async function getMainFirebase() {

    /*
     * FIRST:
     * Use the normal Jufelix Firebase connection.
     */

    if (
        window.JufelixFirebase &&
        window.JufelixFirebase.db
    ) {

        return window.JufelixFirebase;
    }


    /*
     * Give firebase.js a short chance
     * to initialize normally.
     */

    const started =
        Date.now();


    while (
        Date.now() -
        started <
        3000
    ) {

        if (
            window.JufelixFirebase &&
            window.JufelixFirebase.db
        ) {

            return window.JufelixFirebase;
        }


        await new Promise(
            function (resolve) {

                setTimeout(
                    resolve,
                    100
                );
            }
        );
    }


    /*
     * FALLBACK:
     *
     * If firebase.js did not create the
     * connection, access the default Firebase
     * app directly.
     */

    console.warn(
        "Users Cloud: using direct Firebase fallback."
    );


    const config =
        getFirebaseConfig();


    const app =
        getApps().length
            ? getApp()
            : initializeApp(
                config
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
     * Restore/update shared global object
     * so other Jufelix modules can use it.
     */

    if (
        !window.JufelixFirebase
    ) {

        window.JufelixFirebase = {};
    }


    window.JufelixFirebase.app =
        app;

    window.JufelixFirebase.db =
        db;

    window.JufelixFirebase.auth =
        auth;


    return {

        app:
            app,

        db:
            db,

        auth:
            auth,

        user:
            auth.currentUser ||
            null
    };
}


/* ==========================================
   CLEAN VALUE
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
        function (key) {

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
   CREATE USER
========================================== */

async function createUser(
    userData
) {

    if (
        !userData
    ) {

        throw new Error(
            "User information is missing."
        );
    }


    if (
        !userData.email
    ) {

        throw new Error(
            "User email is required."
        );
    }


    if (
        !userData.password ||
        String(
            userData.password
        ).length <
        6
    ) {

        throw new Error(
            "Password must contain at least 6 characters."
        );
    }


    /*
     * Get main Firestore connection.
     */

    const firebase =
        await getMainFirebase();


    if (
        !firebase ||
        !firebase.db
    ) {

        throw new Error(
            "Firestore connection is unavailable."
        );
    }


    /*
     * IMPORTANT:
     *
     * Create the employee with a SECONDARY
     * Firebase application.
     *
     * This prevents the administrator's
     * current login from being replaced by
     * the newly created user's login.
     */

    const secondaryAppName =
        "jufelix-user-creator-" +
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .slice(
                2,
                8
            );


    const secondaryApp =
        initializeApp(
            getFirebaseConfig(),
            secondaryAppName
        );


    const secondaryAuth =
        getAuth(
            secondaryApp
        );


    try {

        const credential =
            await createUserWithEmailAndPassword(
                secondaryAuth,
                String(
                    userData.email
                )
                    .trim()
                    .toLowerCase(),
                String(
                    userData.password
                )
            );


        const uid =
            credential.user.uid;


        const profile = {

            uid:
                uid,

            id:
                uid,

            fullName:
                userData.fullName ||
                userData.name ||
                "",

            name:
                userData.fullName ||
                userData.name ||
                "",

            email:
                String(
                    userData.email ||
                    ""
                )
                    .trim()
                    .toLowerCase(),

            phone:
                userData.phone ||
                "",

            username:
                userData.username ||
                userData.email ||
                "",

            role:
                userData.role ||
                "sales",

            branchId:
                userData.branchId ||
                "head-office",

            branchName:
                userData.branchName ||
                "Head Office",

            status:
                userData.status ||
                "active",

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp(),

            lastLogin:
                null
        };


        /*
         * Save the employee profile using the
         * administrator's MAIN Firestore session.
         */

        await setDoc(

            doc(
                firebase.db,
                "users",
                uid
            ),

            cleanValue(
                profile
            ),

            {
                merge:
                    true
            }
        );


        /*
         * Sign out secondary user only.
         */

        try {

            await signOut(
                secondaryAuth
            );

        } catch (
            error
        ) {

            console.warn(
                "Secondary user sign-out warning:",
                error
            );
        }


        const localUser = {

            uid:
                uid,

            id:
                uid,

            fullName:
                profile.fullName,

            name:
                profile.name,

            email:
                profile.email,

            phone:
                profile.phone,

            username:
                profile.username,

            role:
                profile.role,

            branchId:
                profile.branchId,

            branchName:
                profile.branchName,

            status:
                profile.status,

            createdAt:
                new Date()
                    .toISOString(),

            updatedAt:
                new Date()
                    .toISOString()
        };


        document.dispatchEvent(

            new CustomEvent(
                "jufelix:user-cloud-saved",
                {
                    detail: {

                        user:
                            localUser
                    }
                }
            )

        );


        console.log(
            "✅ Firebase user created:",
            localUser.email,
            localUser.branchName
        );


        return localUser;


    } catch (
        error
    ) {

        console.error(
            "❌ Firebase user creation failed:",
            error
        );


        throw error;


    } finally {

        /*
         * Remove temporary Firebase app.
         */

        try {

            await deleteApp(
                secondaryApp
            );

        } catch (
            error
        ) {

            console.warn(
                "Secondary Firebase app cleanup warning:",
                error
            );
        }
    }
}


/* ==========================================
   UPDATE USER PROFILE
========================================== */

async function updateUser(
    userId,
    userData
) {

    if (!userId) {

        throw new Error(
            "User ID is required."
        );
    }


    const firebase =
        await getMainFirebase();


    const profile = {

        fullName:
            userData.fullName ||
            userData.name ||
            "",

        name:
            userData.fullName ||
            userData.name ||
            "",

        email:
            userData.email ||
            "",

        phone:
            userData.phone ||
            "",

        username:
            userData.username ||
            userData.email ||
            "",

        role:
            userData.role ||
            "sales",

        branchId:
            userData.branchId ||
            "head-office",

        branchName:
            userData.branchName ||
            "Head Office",

        status:
            userData.status ||
            "active",

        updatedAt:
            serverTimestamp()
    };


    await updateDoc(

        doc(
            firebase.db,
            "users",
            String(
                userId
            )
        ),

        cleanValue(
            profile
        )
    );


    const localUser = {

        id:
            String(
                userId
            ),

        uid:
            String(
                userId
            ),

        fullName:
            profile.fullName,

        name:
            profile.name,

        email:
            profile.email,

        phone:
            profile.phone,

        username:
            profile.username,

        role:
            profile.role,

        branchId:
            profile.branchId,

        branchName:
            profile.branchName,

        status:
            profile.status,

        updatedAt:
            new Date()
                .toISOString()
    };


    document.dispatchEvent(

        new CustomEvent(
            "jufelix:user-cloud-saved",
            {
                detail: {

                    user:
                        localUser
                }
            }
        )

    );


    console.log(
        "✅ Firebase user profile updated:",
        userId
    );


    return localUser;
}


/* ==========================================
   DELETE USER PROFILE
========================================== */

async function deleteUser(
    user
) {

    const firebase =
        await getMainFirebase();


    const userId =
        typeof user ===
        "object"

            ? (
                user.uid ||
                user.id
            )

            : user;


    if (!userId) {

        throw new Error(
            "User ID is required."
        );
    }


    await deleteDoc(

        doc(
            firebase.db,
            "users",
            String(
                userId
            )
        )

    );


    console.log(
        "✅ Firestore user profile deleted:",
        userId
    );


    return true;
}


/* ==========================================
   PUBLIC API
========================================== */

window.JufelixUsersCloud = {

    createUser:
        createUser,

    updateUser:
        updateUser,

    deleteUser:
        deleteUser,

    getFirebase:
        getMainFirebase
};


/* ==========================================
   READY
========================================== */

console.log(
    "✅ Jufelix Users Cloud loaded."
);


document.dispatchEvent(

    new CustomEvent(
        "jufelix:users-cloud-ready"
    )

);