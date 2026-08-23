/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   FIREBASE LOGIN MODULE v523

   File:
   js/modules/login.js

   + Firebase Authentication
   + Firestore User Profile
   + Remember Me
   + Session Storage
   + Active Branch Setup
   + Friendly Login Errors
   + Login Diagnostics
========================================== */


import {
    signInWithEmailAndPassword,
    browserLocalPersistence,
    browserSessionPersistence,
    setPersistence,
    signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* ==========================================
   CONSTANTS
========================================== */

const DEFAULT_BRANCH =
    "head-office";


/* ==========================================
   STATE
========================================== */

let auth =
    null;

let db =
    null;

let initialized =
    false;


/* ==========================================
   START
========================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeLogin
    );

} else {

    initializeLogin();
}


/* ==========================================
   INITIALIZE LOGIN
========================================== */

async function initializeLogin() {

    if (initialized) {

        return;
    }


    initialized =
        true;


    try {

        await waitForFirebase();


        auth =
            window.JufelixFirebase.auth;


        db =
            window.JufelixFirebase.db;


        if (
            !auth ||
            !db
        ) {

            throw new Error(
                "Firebase Authentication is not ready."
            );
        }


        setupPasswordToggle();

        setupLoginForm();


        console.log(
            "✅ Jufelix Login module v523 ready."
        );


    } catch (error) {

        console.error(
            "Login initialization failed:",
            error
        );


        showMessage(
            error.message ||
            "Firebase could not initialize.",
            "error"
        );
    }
}


/* ==========================================
   WAIT FOR FIREBASE
========================================== */

function waitForFirebase() {

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
                    firebase.auth &&
                    firebase.db
                ) {

                    resolve(
                        firebase
                    );

                    return;
                }


                if (
                    Date.now() -
                    startedAt >
                    20000
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
}


/* ==========================================
   PASSWORD TOGGLE
========================================== */

function setupPasswordToggle() {

    const passwordInput =
        document.getElementById(
            "password"
        );


    const passwordToggle =
        document.getElementById(
            "passwordToggle"
        );


    if (
        !passwordInput ||
        !passwordToggle
    ) {

        return;
    }


    passwordToggle.addEventListener(
        "click",
        function () {

            const isHidden =
                passwordInput.type ===
                "password";


            passwordInput.type =
                isHidden
                    ? "text"
                    : "password";


            passwordToggle.textContent =
                isHidden
                    ? "Hide"
                    : "Show";
        }
    );
}


/* ==========================================
   LOGIN FORM
========================================== */

function setupLoginForm() {

    const loginForm =
        document.getElementById(
            "loginForm"
        );


    if (!loginForm) {

        return;
    }


    loginForm.addEventListener(
        "submit",
        handleLogin
    );
}


/* ==========================================
   HANDLE LOGIN
========================================== */

async function handleLogin(
    event
) {

    event.preventDefault();

    event.stopPropagation();


    const emailInput =
        document.getElementById(
            "loginEmail"
        );


    const passwordInput =
        document.getElementById(
            "password"
        );


    const rememberMe =
        document.getElementById(
            "rememberMe"
        );


    const loginButton =
        document.getElementById(
            "loginButton"
        );


    if (
        !emailInput ||
        !passwordInput ||
        !loginButton
    ) {

        showMessage(
            "Login form is incomplete.",
            "error"
        );

        return;
    }


    const email =
        emailInput.value
            .trim()
            .toLowerCase();


    const password =
        passwordInput.value;


    if (
        !email ||
        !password
    ) {

        showMessage(
            "Enter your email address and password.",
            "error"
        );

        return;
    }


    loginButton.disabled =
        true;


    loginButton.textContent =
        "Signing in...";


    hideMessage();


    try {

        /* ======================================
           FIREBASE PERSISTENCE
        ====================================== */

        await setPersistence(
            auth,
            rememberMe &&
            rememberMe.checked

                ? browserLocalPersistence

                : browserSessionPersistence
        );


        console.log(
            "Firebase persistence configured."
        );


        /* ======================================
           FIREBASE SIGN-IN
        ====================================== */

        const credential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        if (
            !credential ||
            !credential.user
        ) {

            throw new Error(
                "Firebase login did not return a user."
            );
        }


        console.log(
            "✅ FIREBASE LOGIN SUCCESS:",
            credential.user.email,
            credential.user.uid
        );


        showMessage(
            "Firebase login successful. Loading ERP profile...",
            "success"
        );


        /* ======================================
           ERP PROFILE
        ====================================== */

        await loadUserProfile(
            credential.user.uid,
            email
        );


    } catch (error) {

        console.error(
            "❌ Login failed:",
            error
        );


        showMessage(
            getLoginErrorMessage(
                error
            ),
            "error"
        );


        loginButton.disabled =
            false;


        loginButton.textContent =
            "Sign In";
    }
}


/* ==========================================
   LOAD USER PROFILE
========================================== */

async function loadUserProfile(
    uid,
    email
) {

    if (
        !uid
    ) {

        throw new Error(
            "Firebase user ID is missing."
        );
    }


    const profileReference =
        doc(
            db,
            "users",
            String(
                uid
            )
        );


    console.log(
        "Loading ERP user profile:",
        uid
    );


    const profileSnapshot =
        await getDoc(
            profileReference
        );


    console.log(
        "ERP PROFILE EXISTS:",
        profileSnapshot.exists()
    );


    if (
        !profileSnapshot.exists()
    ) {

        await signOut(
            auth
        );


        throw new Error(
            "Your Firebase login exists, but the ERP user profile was not found."
        );
    }


    const profile =
        profileSnapshot.data() ||
        {};


    console.log(
        "ERP PROFILE LOADED:",
        profile
    );


    /* ======================================
       ACCOUNT STATUS
    ====================================== */

    const status =
        String(
            profile.status ||
            "active"
        )
            .trim()
            .toLowerCase();


    if (
        status !==
        "active"
    ) {

        await signOut(
            auth
        );


        throw new Error(
            "This user account is inactive."
        );
    }


    /* ======================================
       BRANCH
    ====================================== */

    const branchId =
        String(
            profile.branchId ||
            DEFAULT_BRANCH
        );


    const branchName =
        profile.branchName ||
        (
            branchId ===
            DEFAULT_BRANCH

                ? "Head Office"

                : "Assigned Branch"
        );


    /* ======================================
       CURRENT USER
    ====================================== */

    const currentUser = {

        id:
            String(
                uid
            ),

        uid:
            String(
                uid
            ),

        fullName:
            profile.fullName ||
            profile.name ||
            email,

        name:
            profile.fullName ||
            profile.name ||
            email,

        email:
            profile.email ||
            email,

        username:
            profile.username ||
            profile.email ||
            email,

        phone:
            profile.phone ||
            "",

        role:
            profile.role ||
            "sales-officer",

        branchId:
            branchId,

        branchName:
            branchName,

        status:
            "active",

        loginTime:
            new Date()
                .toISOString(),

        firebaseAuthenticated:
            true
    };


    /* ======================================
       ACTIVE BRANCH
    ====================================== */

    const activeBranch = {

        id:
            branchId,

        branchId:
            branchId,

        branchName:
            branchName,

        name:
            branchName,

        status:
            "active",

        isHeadOffice:
            branchId ===
            DEFAULT_BRANCH
    };


    /* ======================================
       SAVE ERP SESSION
    ====================================== */

    localStorage.setItem(
        "jufelix_v7_current_user",
        JSON.stringify(
            currentUser
        )
    );


    localStorage.setItem(
        "currentUser",
        JSON.stringify(
            currentUser
        )
    );


    localStorage.setItem(
        "jufelix_v7_active_branch",
        JSON.stringify(
            activeBranch
        )
    );


    localStorage.setItem(
        "loggedIn",
        "true"
    );


    sessionStorage.setItem(
        "jufelixSessionActive",
        "true"
    );


    console.log(
        "✅ ERP local session saved:",
        currentUser.email,
        currentUser.role,
        currentUser.branchName
    );


    /* ======================================
       VERIFY SESSION BEFORE REDIRECT
    ====================================== */

    const savedUser =
        readStoredObject(
            "jufelix_v7_current_user"
        );


    if (
        !savedUser ||
        !savedUser.uid
    ) {

        throw new Error(
            "ERP session could not be saved."
        );
    }


    /* ======================================
       UPDATE LAST LOGIN
    ====================================== */

    try {

        await updateDoc(
            profileReference,
            {

                lastLogin:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }
        );


    } catch (error) {

        console.warn(
            "Last login could not be updated:",
            error
        );
    }


    /* ======================================
       SUCCESS
    ====================================== */

    showMessage(
        "Login successful. Opening dashboard...",
        "success"
    );


    console.log(
        "✅ Login complete. Opening dashboard..."
    );


    /*
     * Give storage and Firebase a short
     * moment before changing pages.
     */

    window.setTimeout(
        function () {

            const finalUser =
                readStoredObject(
                    "jufelix_v7_current_user"
                );


            if (
                !finalUser
            ) {

                showMessage(
                    "Login session was lost before opening the dashboard.",
                    "error"
                );


                const loginButton =
                    document.getElementById(
                        "loginButton"
                    );


                if (loginButton) {

                    loginButton.disabled =
                        false;


                    loginButton.textContent =
                        "Sign In";
                }


                return;
            }


            window.location.replace(
                "dashboard.html"
            );

        },
        700
    );
}


/* ==========================================
   READ STORED OBJECT
========================================== */

function readStoredObject(
    key
) {

    try {

        const stored =
            localStorage.getItem(
                key
            );


        if (!stored) {

            return null;
        }


        const parsed =
            JSON.parse(
                stored
            );


        if (
            parsed &&
            typeof parsed ===
                "object" &&
            !Array.isArray(
                parsed
            )
        ) {

            return parsed;
        }


        return null;


    } catch (error) {

        console.error(
            "Login storage read failed:",
            key,
            error
        );


        return null;
    }
}


/* ==========================================
   SHOW MESSAGE
========================================== */

function showMessage(
    message,
    type
) {

    const loginMessage =
        document.getElementById(
            "loginMessage"
        );


    if (!loginMessage) {

        window.alert(
            message
        );

        return;
    }


    loginMessage.textContent =
        message;


    loginMessage.className =
        "login-message " +
        (
            type ||
            "error"
        );


    loginMessage.style.display =
        "block";
}


/* ==========================================
   HIDE MESSAGE
========================================== */

function hideMessage() {

    const loginMessage =
        document.getElementById(
            "loginMessage"
        );


    if (!loginMessage) {

        return;
    }


    loginMessage.textContent =
        "";


    loginMessage.className =
        "login-message";


    loginMessage.style.display =
        "none";
}


/* ==========================================
   FRIENDLY LOGIN ERRORS
========================================== */

function getLoginErrorMessage(
    error
) {

    const code =
        String(
            error &&
            error.code ||
            ""
        );


    const rawMessage =
        String(
            error &&
            error.message ||
            ""
        );


    const messages = {

        "auth/invalid-credential":
            "Incorrect email address or password.",

        "auth/wrong-password":
            "Incorrect email address or password.",

        "auth/user-not-found":
            "Incorrect email address or password.",

        "auth/invalid-email":
            "Enter a valid email address.",

        "auth/user-disabled":
            "This Firebase login has been disabled.",

        "auth/too-many-requests":
            "Too many login attempts. Wait briefly and try again.",

        "auth/network-request-failed":
            "Network error. Check your internet connection.",

        "auth/operation-not-allowed":
            "Email and password login is not enabled in Firebase Authentication."

    };


    if (
        messages[
            code
        ]
    ) {

        return messages[
            code
        ];
    }


    if (
        code.includes(
            "permission-denied"
        ) ||
        rawMessage
            .toLowerCase()
            .includes(
                "missing or insufficient permissions"
            )
    ) {

        return (
            "Firebase signed you in, but Firestore blocked access to your ERP user profile."
        );
    }


    return (
        rawMessage ||
        "Login failed."
    );
}