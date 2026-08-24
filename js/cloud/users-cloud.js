/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   USERS CLOUD BRIDGE

   File:
   js/cloud/users-cloud.js

   Version: 513

   COMPLETE REPLACEMENT

   + Firebase Authentication user creation
   + Secondary Firebase app keeps Admin logged in
   + Firestore user profiles
   + Safe profile updates
   + Account deactivation
   + No password stored in Firestore
   + Standard ERP roles
   + Permanent Firebase UID
   + Firebase/local synchronization events
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
    getDoc,
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
   CONSTANTS
========================================== */

const DEFAULT_BRANCH_ID =
    "head-office";


const DEFAULT_BRANCH_NAME =
    "Head Office";


const ALLOWED_ROLES = [

    "admin",
    "manager",
    "sales-officer",
    "cashier",
    "store-keeper",
    "accountant"

];


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
     * First use the normal Jufelix Firebase
     * connection when it is already available.
     */

    if (
        window.JufelixFirebase &&
        window.JufelixFirebase.db
    ) {

        return window.JufelixFirebase;
    }


    /*
     * Give firebase.js time to initialize.
     */

    const started =
        Date.now();


    while (
        Date.now() -
        started <
        5000
    ) {

        if (
            window.JufelixFirebase &&
            window.JufelixFirebase.db
        ) {

            return window.JufelixFirebase;
        }


        await wait(
            100
        );
    }


    /*
     * Fallback connection.
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


    if (
        !window.JufelixFirebase
    ) {

        window.JufelixFirebase =
            {};
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
   WAIT
========================================== */

function wait(
    milliseconds
) {

    return new Promise(
        function (resolve) {

            setTimeout(
                resolve,
                milliseconds
            );
        }
    );
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


    const result =
        {};


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
   NORMALIZE EMAIL
========================================== */

function normalizeEmail(
    value
) {

    return String(
        value ||
        ""
    )
        .trim()
        .toLowerCase();
}


/* ==========================================
   NORMALIZE ROLE
========================================== */

function normalizeRole(
    value
) {

    const role =
        String(
            value ||
            ""
        )
            .trim()
            .toLowerCase();


    const aliases = {

        administrator:
            "admin",

        admin:
            "admin",

        manager:
            "manager",

        sales:
            "sales-officer",

        "sales officer":
            "sales-officer",

        "sales-officer":
            "sales-officer",

        "sales personnel":
            "sales-officer",

        cashier:
            "cashier",

        stockkeeper:
            "store-keeper",

        "stock keeper":
            "store-keeper",

        "store keeper":
            "store-keeper",

        "store-keeper":
            "store-keeper",

        accountant:
            "accountant"
    };


    const normalized =
        aliases[
            role
        ] ||
        role;


    if (
        ALLOWED_ROLES.includes(
            normalized
        )
    ) {

        return normalized;
    }


    return "sales-officer";
}


/* ==========================================
   NORMALIZE STATUS
========================================== */

function normalizeStatus(
    value
) {

    const status =
        String(
            value ||
            "active"
        )
            .trim()
            .toLowerCase();


    return status ===
        "inactive"
            ? "inactive"
            : "active";
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


    const email =
        normalizeEmail(
            userData.email
        );


    const password =
        String(
            userData.password ||
            ""
        );


    if (
        !email
    ) {

        throw new Error(
            "User email is required."
        );
    }


    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(
                email
            )
    ) {

        throw new Error(
            "Enter a valid email address."
        );
    }


    if (
        password.length <
        6
    ) {

        throw new Error(
            "Password must contain at least 6 characters."
        );
    }


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
     * Create the employee using a secondary
     * Firebase application.
     *
     * This keeps the current administrator
     * signed into the main Firebase app.
     */

    const secondaryAppName =
        "jufelix-user-creator-" +
        Date.now() +
        "-" +
        Math.random()
            .toString(
                36
            )
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


    let createdUid =
        null;


    try {

        const credential =
            await createUserWithEmailAndPassword(
                secondaryAuth,
                email,
                password
            );


        createdUid =
            credential.user.uid;


        const uid =
            String(
                createdUid
            );


        const fullName =
            String(
                userData.fullName ||
                userData.name ||
                ""
            ).trim();


        const username =
            String(
                userData.username ||
                email.split("@")[0]
            )
                .trim()
                .toLowerCase();


        const role =
            normalizeRole(
                userData.role
            );


        const status =
            normalizeStatus(
                userData.status
            );


        const branchId =
            String(
                userData.branchId ||
                DEFAULT_BRANCH_ID
            );


        const branchName =
            String(
                userData.branchName ||
                DEFAULT_BRANCH_NAME
            );


        /*
         * IMPORTANT:
         *
         * Password is deliberately NOT placed
         * inside this profile.
         */

        const profile = {

            uid:
                uid,

            id:
                uid,

            fullName:
                fullName,

            name:
                fullName,

            email:
                email,

            loginEmail:
                email,

            phone:
                String(
                    userData.phone ||
                    ""
                ).trim(),

            username:
                username,

            role:
                role,

            branchId:
                branchId,

            branchName:
                branchName,

            status:
                status,

            authProvider:
                "password",

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp(),

            lastLogin:
                null
        };


        /*
         * Save profile through the main
         * administrator Firestore connection.
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
         * Sign out ONLY the secondary user.
         */

        try {

            await signOut(
                secondaryAuth
            );

        } catch (
            signOutError
        ) {

            console.warn(
                "Secondary user sign-out warning:",
                signOutError
            );
        }


        const now =
            new Date()
                .toISOString();


        const localUser = {

            uid:
                uid,

            id:
                uid,

            fullName:
                fullName,

            name:
                fullName,

            email:
                email,

            loginEmail:
                email,

            phone:
                profile.phone,

            username:
                username,

            role:
                role,

            branchId:
                branchId,

            branchName:
                branchName,

            status:
                status,

            authProvider:
                "password",

            createdAt:
                now,

            updatedAt:
                now
        };


        dispatchUserSaved(
            localUser,
            "created"
        );


        console.log(
            "✅ Firebase user created:",
            localUser.email,
            localUser.role,
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


        /*
         * Important:
         *
         * If Authentication succeeded but
         * Firestore failed, the Auth account
         * may already exist.
         *
         * We report this clearly rather than
         * pretending everything succeeded.
         */

        if (
            createdUid
        ) {

            console.error(
                "⚠️ Authentication account was created but the profile operation may have failed. UID:",
                createdUid
            );
        }


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
            cleanupError
        ) {

            console.warn(
                "Secondary Firebase app cleanup warning:",
                cleanupError
            );
        }
    }
}


/* ==========================================
   GET USER PROFILE
========================================== */

async function getUserProfile(
    userId
) {

    if (
        !userId
    ) {

        throw new Error(
            "User ID is required."
        );
    }


    const firebase =
        await getMainFirebase();


    const reference =
        doc(
            firebase.db,
            "users",
            String(
                userId
            )
        );


    const snapshot =
        await getDoc(
            reference
        );


    if (
        !snapshot.exists()
    ) {

        return null;
    }


    return {

        id:
            snapshot.id,

        ...snapshot.data()
    };
}


/* ==========================================
   UPDATE USER PROFILE
========================================== */

async function updateUser(
    userId,
    userData
) {

    if (
        !userId
    ) {

        throw new Error(
            "User ID is required."
        );
    }


    if (
        !userData
    ) {

        throw new Error(
            "User information is missing."
        );
    }


    const firebase =
        await getMainFirebase();


    const uid =
        String(
            userId
        );


    /*
     * Read the current Firestore profile first.
     *
     * The existing login email is preserved.
     * Editing a profile must not pretend that
     * Firebase Authentication email changed.
     */

    const existing =
        await getUserProfile(
            uid
        );


    if (
        !existing
    ) {

        throw new Error(
            "The Firebase user profile was not found."
        );
    }


    const existingEmail =
        normalizeEmail(
            existing.loginEmail ||
            existing.email
        );


    const requestedEmail =
        normalizeEmail(
            userData.email ||
            existingEmail
        );


    /*
     * Firebase Authentication email cannot be
     * safely changed here for another user.
     *
     * users.js v513 will lock email while
     * editing, but this protects the cloud
     * bridge too.
     */

    if (
        requestedEmail &&
        existingEmail &&
        requestedEmail !==
        existingEmail
    ) {

        throw new Error(
            "The login email cannot be changed from User Management. Create a new account if a different login email is required."
        );
    }


    const fullName =
        String(
            userData.fullName ||
            userData.name ||
            existing.fullName ||
            existing.name ||
            ""
        ).trim();


    const username =
        String(
            userData.username ||
            existing.username ||
            existingEmail.split("@")[0] ||
            ""
        )
            .trim()
            .toLowerCase();


    const role =
        normalizeRole(
            userData.role ||
            existing.role
        );


    const status =
        normalizeStatus(
            userData.status ||
            existing.status
        );


    const branchId =
        String(
            userData.branchId ||
            existing.branchId ||
            DEFAULT_BRANCH_ID
        );


    const branchName =
        String(
            userData.branchName ||
            existing.branchName ||
            DEFAULT_BRANCH_NAME
        );


    const profile = {

        uid:
            uid,

        id:
            uid,

        fullName:
            fullName,

        name:
            fullName,

        email:
            existingEmail,

        loginEmail:
            existingEmail,

        phone:
            String(
                userData.phone ??
                existing.phone ??
                ""
            ).trim(),

        username:
            username,

        role:
            role,

        branchId:
            branchId,

        branchName:
            branchName,

        status:
            status,

        updatedAt:
            serverTimestamp()
    };


    await updateDoc(

        doc(
            firebase.db,
            "users",
            uid
        ),

        cleanValue(
            profile
        )
    );


    const localUser = {

        ...existing,

        id:
            uid,

        uid:
            uid,

        fullName:
            fullName,

        name:
            fullName,

        email:
            existingEmail,

        loginEmail:
            existingEmail,

        phone:
            profile.phone,

        username:
            username,

        role:
            role,

        branchId:
            branchId,

        branchName:
            branchName,

        status:
            status,

        updatedAt:
            new Date()
                .toISOString()
    };


    /*
     * Never expose an old locally stored
     * password through the returned object.
     */

    delete localUser.password;


    dispatchUserSaved(
        localUser,
        "updated"
    );


    console.log(
        "✅ Firebase user profile updated:",
        uid
    );


    return localUser;
}


/* ==========================================
   DEACTIVATE USER
========================================== */

async function deactivateUser(
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


    if (
        !userId
    ) {

        throw new Error(
            "User ID is required."
        );
    }


    const uid =
        String(
            userId
        );


    const existing =
        await getUserProfile(
            uid
        );


    if (
        !existing
    ) {

        throw new Error(
            "The Firebase user profile was not found."
        );
    }


    await updateDoc(

        doc(
            firebase.db,
            "users",
            uid
        ),

        {
            status:
                "inactive",

            updatedAt:
                serverTimestamp()
        }
    );


    const localUser = {

        ...existing,

        id:
            uid,

        uid:
            uid,

        status:
            "inactive",

        updatedAt:
            new Date()
                .toISOString()
    };


    delete localUser.password;


    dispatchUserSaved(
        localUser,
        "deactivated"
    );


    console.log(
        "✅ Firebase user deactivated:",
        uid
    );


    return localUser;
}


/* ==========================================
   REACTIVATE USER
========================================== */

async function activateUser(
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


    if (
        !userId
    ) {

        throw new Error(
            "User ID is required."
        );
    }


    const uid =
        String(
            userId
        );


    const existing =
        await getUserProfile(
            uid
        );


    if (
        !existing
    ) {

        throw new Error(
            "The Firebase user profile was not found."
        );
    }


    await updateDoc(

        doc(
            firebase.db,
            "users",
            uid
        ),

        {
            status:
                "active",

            updatedAt:
                serverTimestamp()
        }
    );


    const localUser = {

        ...existing,

        id:
            uid,

        uid:
            uid,

        status:
            "active",

        updatedAt:
            new Date()
                .toISOString()
    };


    delete localUser.password;


    dispatchUserSaved(
        localUser,
        "activated"
    );


    console.log(
        "✅ Firebase user activated:",
        uid
    );


    return localUser;
}


/* ==========================================
   DELETE USER COMPATIBILITY
========================================== */

/*
 * IMPORTANT:
 *
 * Browser Firebase cannot securely delete
 * another employee's Firebase Authentication
 * account.
 *
 * Therefore the old deleteUser() API now
 * safely DEACTIVATES the account profile.
 *
 * This keeps older users.js code from
 * performing a dangerous partial deletion.
 */

async function deleteUser(
    user
) {

    console.warn(
        "Users Cloud: deleteUser() now performs safe deactivation."
    );


    return deactivateUser(
        user
    );
}


/* ==========================================
   DISPATCH USER SAVED EVENT
========================================== */

function dispatchUserSaved(
    user,
    action
) {

    document.dispatchEvent(

        new CustomEvent(
            "jufelix:user-cloud-saved",
            {
                detail: {

                    user:
                        user,

                    action:
                        action
                }
            }
        )

    );


    document.dispatchEvent(

        new CustomEvent(
            "jufelix:data-updated",
            {
                detail: {

                    key:
                        "jufelix_v7_users",

                    action:
                        action,

                    user:
                        user
                }
            }
        )

    );
}


/* ==========================================
   FRIENDLY FIREBASE ERROR
========================================== */

function friendlyFirebaseError(
    error
) {

    const code =
        String(
            error &&
            error.code ||
            ""
        );


    if (
        code.includes(
            "email-already-in-use"
        )
    ) {

        return "This email is already registered in Firebase Authentication.";
    }


    if (
        code.includes(
            "weak-password"
        )
    ) {

        return "Password must contain at least 6 characters.";
    }


    if (
        code.includes(
            "invalid-email"
        )
    ) {

        return "Enter a valid email address.";
    }


    if (
        code.includes(
            "permission-denied"
        )
    ) {

        return "Firestore denied this operation. Check the administrator account and Firestore security rules.";
    }


    if (
        code.includes(
            "network-request-failed"
        )
    ) {

        return "Firebase could not be reached. Check your internet connection.";
    }


    return (
        error &&
        error.message
            ? error.message
            : "Firebase user operation failed."
    );
}


/* ==========================================
   PUBLIC API
========================================== */

window.JufelixUsersCloud = {

    createUser:
        createUser,

    updateUser:
        updateUser,

    getUserProfile:
        getUserProfile,

    deactivateUser:
        deactivateUser,

    activateUser:
        activateUser,

    /*
     * Compatibility with users.js v512.
     * This now deactivates instead of
     * deleting the Firestore profile.
     */

    deleteUser:
        deleteUser,

    getFirebase:
        getMainFirebase,

    normalizeRole:
        normalizeRole,

    friendlyError:
        friendlyFirebaseError
};


/* ==========================================
   READY
========================================== */

console.log(
    "✅ Jufelix Users Cloud v513 loaded."
);


document.dispatchEvent(

    new CustomEvent(
        "jufelix:users-cloud-ready",
        {
            detail: {

                version:
                    513
            }
        }
    )

);