/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   FIREBASE LOGIN MODULE v524

   File:
   js/modules/login.js

   COMPLETE REPLACEMENT

   + Firebase Authentication
   + Firestore User Profile
   + Remember Me
   + Safe Offline Session Resume
   + NO local password storage
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


const CURRENT_USER_KEY =
    "jufelix_v7_current_user";


const ACTIVE_BRANCH_KEY =
    "jufelix_v7_active_branch";


const OFFLINE_ACCESS_KEY =
    "jufelix_v7_offline_access";


const LAST_AUTH_KEY =
    "jufelix_v7_last_authenticated";


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
   INITIALIZE
========================================== */

async function initializeLogin() {

    if (initialized) {

        return;
    }


    initialized =
        true;


    /*
     * IMPORTANT:
     *
     * Setup the form immediately.
     * Do not make the whole login page depend
     * on Firebase being online.
     */

    setupPasswordToggle();

    setupLoginForm();

    setupConnectionEvents();


    /*
     * OFFLINE STARTUP
     */

    if (!navigator.onLine) {

        const resumed =
            resumeOfflineSession();


        if (resumed) {

            return;
        }


        showMessage(
            "You are offline. Connect to the internet and sign in once with Remember me enabled before using offline mode.",
            "error"
        );


        console.log(
            "Jufelix Login: offline with no remembered ERP session."
        );


        return;
    }


    /*
     * ONLINE FIREBASE STARTUP
     */

    try {

        const firebase =
            await waitForFirebase();


        auth =
            firebase.auth;


        db =
            firebase.db;


        if (
            !auth ||
            !db
        ) {

            throw new Error(
                "Firebase Authentication is not ready."
            );
        }


        console.log(
            "✅ Jufelix Login module v524 ready."
        );


        /*
         * If Firebase already restored a
         * remembered authenticated session
         * and the ERP local session is valid,
         * we can reopen the dashboard.
         */

        tryResumeOnlineSession();


    } catch (error) {

        console.error(
            "Login initialization failed:",
            error
        );


        /*
         * If Firebase failed because the
         * connection disappeared while loading,
         * try the remembered offline session.
         */

        if (
            !navigator.onLine &&
            resumeOfflineSession()
        ) {

            return;
        }


        showMessage(
            getLoginErrorMessage(
                error
            ),
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
                    !navigator.onLine
                ) {

                    reject(
                        new Error(
                            "Network connection is unavailable."
                        )
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
   CONNECTION EVENTS
========================================== */

function setupConnectionEvents() {

    window.addEventListener(
        "online",
        function () {

            hideMessage();


            console.log(
                "Jufelix Login: internet connection restored."
            );


            /*
             * Reload once so firebase.js and
             * its external Firebase modules can
             * establish a clean connection.
             */

            window.setTimeout(
                function () {

                    window.location.reload();

                },
                300
            );
        }
    );


    window.addEventListener(
        "offline",
        function () {

            showMessage(
                "Internet connection lost. A previously remembered ERP session can still be used offline.",
                "error"
            );
        }
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


    /*
     * ==========================================
     * OFFLINE LOGIN ATTEMPT
     * ==========================================
     *
     * We DO NOT verify passwords locally.
     *
     * Offline access is allowed only through
     * a previously authenticated remembered
     * ERP session.
     */

    if (!navigator.onLine) {

        const resumed =
            resumeOfflineSession(
                email
            );


        if (resumed) {

            return;
        }


        showMessage(
            "You are offline. For security, passwords cannot be verified without Firebase. Connect to the internet and sign in once with Remember me enabled.",
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

        /*
         * Firebase may not have finished loading
         * when the user taps Sign In.
         */

        if (
            !auth ||
            !db
        ) {

            const firebase =
                await waitForFirebase();


            auth =
                firebase.auth;


            db =
                firebase.db;
        }


        if (
            !auth ||
            !db
        ) {

            throw new Error(
                "Firebase Authentication is not ready."
            );
        }


        const remember =
            Boolean(
                rememberMe &&
                rememberMe.checked
            );


        /* ======================================
           FIREBASE PERSISTENCE
        ====================================== */

        await setPersistence(
    auth,
    browserLocalPersistence
);

        console.log(
            "Firebase persistence configured:",
            remember
                ? "LOCAL"
                : "SESSION"
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
            email,
            remember
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
    email,
    remember
) {

    if (!uid) {

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


        clearLocalErpSession();


        throw new Error(
            "Your Firebase login exists, but the ERP user profile was not found."
        );
    }


    const profile =
        profileSnapshot.data() ||
        {};


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


        clearLocalErpSession();


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


    const now =
        new Date()
            .toISOString();


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
            now,

        lastOnlineAuthentication:
            now,

        firebaseAuthenticated:
            true,

        offlineAccess:
            Boolean(
                remember
            )
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
        CURRENT_USER_KEY,
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
        ACTIVE_BRANCH_KEY,
        JSON.stringify(
            activeBranch
        )
    );


    localStorage.setItem(
        "loggedIn",
        "true"
    );


    localStorage.setItem(
        LAST_AUTH_KEY,
        now
    );


    /*
     * Offline access is only enabled when
     * Remember me was explicitly selected.
     */

    if (remember) {

        localStorage.setItem(
            OFFLINE_ACCESS_KEY,
            "true"
        );

    } else {

        localStorage.removeItem(
            OFFLINE_ACCESS_KEY
        );
    }


    sessionStorage.setItem(
        "jufelixSessionActive",
        "true"
    );


    console.log(
        "✅ ERP local session saved:",
        currentUser.email,
        currentUser.role,
        currentUser.branchName,
        "Offline:",
        remember
    );


    /* ======================================
       VERIFY SESSION
    ====================================== */

    const savedUser =
        readStoredObject(
            CURRENT_USER_KEY
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
        remember

            ? "Login successful. Offline access enabled."

            : "Login successful. Opening dashboard...",

        "success"
    );


    openDashboard();
}


/* ==========================================
   SAFE OFFLINE SESSION RESUME
========================================== */

function resumeOfflineSession(
    requestedEmail
) {

    if (
        navigator.onLine
    ) {

        return false;
    }


    const offlineAllowed =
        localStorage.getItem(
            OFFLINE_ACCESS_KEY
        ) ===
        "true";


    if (!offlineAllowed) {

        return false;
    }


    const currentUser =
        readStoredObject(
            CURRENT_USER_KEY
        ) ||
        readStoredObject(
            "currentUser"
        );


    if (!currentUser) {

        return false;
    }


    /*
     * It must originate from a previous
     * successful Firebase authentication.
     */

    if (
        currentUser.firebaseAuthenticated !==
        true
    ) {

        return false;
    }


    if (
        !currentUser.uid ||
        !currentUser.email
    ) {

        return false;
    }


    const status =
        String(
            currentUser.status ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        status !==
        "active"
    ) {

        return false;
    }


    /*
     * If the user typed an email on the
     * offline login page, it must match the
     * remembered authenticated account.
     */

    if (
        requestedEmail &&
        String(
            currentUser.email
        )
            .trim()
            .toLowerCase() !==
        String(
            requestedEmail
        )
            .trim()
            .toLowerCase()
    ) {

        showMessage(
            "The offline session belongs to a different user. Connect to the internet to change accounts.",
            "error"
        );


        return false;
    }


    const activeBranch =
        readStoredObject(
            ACTIVE_BRANCH_KEY
        );


    /*
     * Restore active branch if required.
     */

    if (!activeBranch) {

        localStorage.setItem(
            ACTIVE_BRANCH_KEY,
            JSON.stringify({

                id:
                    currentUser.branchId ||
                    DEFAULT_BRANCH,

                branchId:
                    currentUser.branchId ||
                    DEFAULT_BRANCH,

                branchName:
                    currentUser.branchName ||
                    "Head Office",

                name:
                    currentUser.branchName ||
                    "Head Office",

                status:
                    "active",

                isHeadOffice:
                    String(
                        currentUser.branchId ||
                        DEFAULT_BRANCH
                    ) ===
                    DEFAULT_BRANCH
            })
        );
    }


    localStorage.setItem(
        "loggedIn",
        "true"
    );


    sessionStorage.setItem(
        "jufelixSessionActive",
        "true"
    );


    console.log(
        "✅ OFFLINE ERP SESSION RESTORED:",
        currentUser.email,
        currentUser.role,
        currentUser.branchName
    );


    showMessage(
        "Offline session restored. Opening dashboard...",
        "success"
    );


    window.setTimeout(
        function () {

            window.location.replace(
                "dashboard.html"
            );

        },
        300
    );


    return true;
}


/* ==========================================
   ONLINE SESSION RESUME
========================================== */

function tryResumeOnlineSession() {

    if (
        !navigator.onLine ||
        !auth ||
        !auth.currentUser
    ) {

        return false;
    }


    const currentUser =
        readStoredObject(
            CURRENT_USER_KEY
        );


    if (
        !currentUser ||
        !currentUser.uid
    ) {

        return false;
    }


    if (
        String(
            currentUser.uid
        ) !==
        String(
            auth.currentUser.uid
        )
    ) {

        return false;
    }


    const status =
        String(
            currentUser.status ||
            "active"
        )
            .trim()
            .toLowerCase();


    if (
        status !==
        "active"
    ) {

        return false;
    }


    localStorage.setItem(
        "loggedIn",
        "true"
    );


    sessionStorage.setItem(
        "jufelixSessionActive",
        "true"
    );


    console.log(
        "✅ Existing Firebase session restored."
    );


    window.setTimeout(
        function () {

            window.location.replace(
                "dashboard.html"
            );

        },
        200
    );


    return true;
}


/* ==========================================
   OPEN DASHBOARD
========================================== */

function openDashboard() {

    window.setTimeout(
        function () {

            const finalUser =
                readStoredObject(
                    CURRENT_USER_KEY
                );


            if (
                !finalUser ||
                !finalUser.uid
            ) {

                showMessage(
                    "Login session was lost before opening the dashboard.",
                    "error"
                );


                resetLoginButton();


                return;
            }


            window.location.replace(
                "dashboard.html"
            );

        },
        500
    );
}


/* ==========================================
   CLEAR ERP SESSION
========================================== */

function clearLocalErpSession() {

    localStorage.removeItem(
        CURRENT_USER_KEY
    );


    localStorage.removeItem(
        "currentUser"
    );


    localStorage.removeItem(
        "loggedIn"
    );


    localStorage.removeItem(
        ACTIVE_BRANCH_KEY
    );


    localStorage.removeItem(
        OFFLINE_ACCESS_KEY
    );


    localStorage.removeItem(
        LAST_AUTH_KEY
    );


    sessionStorage.removeItem(
        "jufelixSessionActive"
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
   LOGIN BUTTON
========================================== */

function resetLoginButton() {

    const loginButton =
        document.getElementById(
            "loginButton"
        );


    if (!loginButton) {

        return;
    }


    loginButton.disabled =
        false;


    loginButton.textContent =
        "Sign In";
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


    const lowerMessage =
        rawMessage.toLowerCase();


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
        lowerMessage.includes(
            "missing or insufficient permissions"
        )
    ) {

        return (
            "Firebase signed you in, but Firestore blocked access to your ERP user profile."
        );
    }


    if (
        lowerMessage.includes(
            "network"
        )
    ) {

        return (
            "Network error. Check your internet connection."
        );
    }


    return (
        rawMessage ||
        "Login failed."
    );
}


/* ==========================================
   PUBLIC API
========================================== */

window.JufelixLogin = {

    resumeOffline:
        resumeOfflineSession,

    clearSession:
        clearLocalErpSession,

    isOfflineAccessEnabled:
        function () {

            return (
                localStorage.getItem(
                    OFFLINE_ACCESS_KEY
                ) ===
                "true"
            );
        }
};