/* ==========================================
   JUFELIX ERP v7.0
   Firebase Login Module
   Part 1A
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

const DEFAULT_BRANCH = "head-office";

let auth = null;
let db = null;

document.addEventListener(
    "DOMContentLoaded",
    initializeLogin
);

async function initializeLogin() {

    await waitForFirebase();

    auth = window.JufelixFirebase.auth;
    db = window.JufelixFirebase.db;

    setupPasswordToggle();
    setupLoginForm();
}

function waitForFirebase() {

    return new Promise(function(resolve){

        function check(){

            if(
                window.JufelixFirebase &&
                window.JufelixFirebase.auth &&
                window.JufelixFirebase.db
            ){
                resolve();
                return;
            }

            setTimeout(check,100);

        }

        check();

    });

}
function setupPasswordToggle() {

    const passwordInput =
        document.getElementById("password");

    const passwordToggle =
        document.getElementById("passwordToggle");

    if (!passwordInput || !passwordToggle) {
        return;
    }

    passwordToggle.addEventListener(
        "click",
        function () {

            const isHidden =
                passwordInput.type === "password";

            passwordInput.type =
                isHidden ? "text" : "password";

            passwordToggle.textContent =
                isHidden ? "Hide" : "Show";
        }
    );
}


function setupLoginForm() {

    const loginForm =
        document.getElementById("loginForm");

    if (!loginForm) {
        return;
    }

    loginForm.addEventListener(
        "submit",
        handleLogin
    );
}


async function handleLogin(event) {

    event.preventDefault();

    const emailInput =
        document.getElementById("loginEmail");

    const passwordInput =
        document.getElementById("password");

    const rememberMe =
        document.getElementById("rememberMe");

    const loginButton =
        document.getElementById("loginButton");

    const email =
        emailInput.value
            .trim()
            .toLowerCase();

    const password =
        passwordInput.value;

    if (!email || !password) {

        showMessage(
            "Enter your email address and password.",
            "error"
        );

        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    try {

        await setPersistence(
            auth,
            rememberMe.checked
                ? browserLocalPersistence
                : browserSessionPersistence
        );

        const credential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        await loadUserProfile(
            credential.user.uid,
            email
        );

    } catch (error) {

        console.error(error);

        showMessage(
            getLoginErrorMessage(error),
            "error"
        );

        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    }
}
async function loadUserProfile(uid, email) {

    const profileReference =
        doc(db, "users", uid);

    const profileSnapshot =
        await getDoc(profileReference);

    if (!profileSnapshot.exists()) {

        await signOut(auth);

        throw new Error(
            "Your Firebase login exists, but the ERP user profile was not found."
        );
    }

    const profile =
        profileSnapshot.data();

    const status =
        String(
            profile.status || "active"
        ).toLowerCase();

    if (status !== "active") {

        await signOut(auth);

        throw new Error(
            "This user account is inactive."
        );
    }

    const branchId =
        String(
            profile.branchId ||
            DEFAULT_BRANCH
        );

    const branchName =
        profile.branchName ||
        (
            branchId === DEFAULT_BRANCH
                ? "Head Office"
                : "Assigned Branch"
        );

    const currentUser = {

        id: uid,
        uid: uid,

        fullName:
            profile.fullName || email,

        name:
            profile.fullName || email,

        email:
            profile.email || email,

        username:
            profile.email || email,

        phone:
            profile.phone || "",

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
            new Date().toISOString(),

        firebaseAuthenticated:
            true
    };

    const activeBranch = {

        id:
            branchId,

        branchName:
            branchName,

        name:
            branchName,

        status:
            "active",

        isHeadOffice:
            branchId === DEFAULT_BRANCH
    };

    localStorage.setItem(
        "jufelix_v7_current_user",
        JSON.stringify(currentUser)
    );

    localStorage.setItem(
        "currentUser",
        JSON.stringify(currentUser)
    );

    localStorage.setItem(
        "jufelix_v7_active_branch",
        JSON.stringify(activeBranch)
    );

    localStorage.setItem(
        "loggedIn",
        "true"
    );

    sessionStorage.setItem(
        "jufelixSessionActive",
        "true"
    );

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

    showMessage(
        "Login successful. Opening dashboard...",
        "success"
    );

    window.setTimeout(
        function () {

            window.location.href =
                "dashboard.html";

        },
        350
    );
}
function showMessage(message, type) {

    const loginMessage =
        document.getElementById("loginMessage");

    if (!loginMessage) {
        window.alert(message);
        return;
    }

    loginMessage.textContent = message;
    loginMessage.className =
        "login-message " + type;
    loginMessage.style.display = "block";
}


function getLoginErrorMessage(error) {

    const code =
        String(error && error.code || "");

    const messages = {
        "auth/invalid-credential":
            "Incorrect email address or password.",

        "auth/invalid-email":
            "Enter a valid email address.",

        "auth/user-disabled":
            "This Firebase login has been disabled.",

        "auth/too-many-requests":
            "Too many attempts. Wait briefly and try again.",

        "auth/network-request-failed":
            "Network error. Check your internet connection."
    };

    return (
        messages[code] ||
        error.message ||
        "Login failed."
    );
}