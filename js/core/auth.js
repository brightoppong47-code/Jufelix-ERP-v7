/* =========================================================
   JUFELIX ERP v7.0 PROFESSIONAL
   Reliable Authentication Service

   File:
   assets/js/core/auth.js
========================================================= */

(function () {
    "use strict";

    const USERS_KEY = "jufelix_v7_users";
    const BRANCHES_KEY = "jufelix_v7_branches";
    const CURRENT_USER_KEY = "jufelix_v7_current_user";
    const ACTIVE_BRANCH_KEY = "jufelix_v7_active_branch";

    const LOGIN_PAGE = "login.html";
    const DASHBOARD_PAGE = "dashboard.html";

    createRequiredLoginData();

    document.addEventListener(
        "DOMContentLoaded",
        initializeAuthentication
    );

    function createRequiredLoginData() {
        const branches = readArray(BRANCHES_KEY);

        let headOffice = branches.find(function (branch) {
            return branch.id === "head-office";
        });

        if (!headOffice) {
            headOffice = {
                id: "head-office",
                branchName: "Head Office",
                name: "Head Office",
                code: "HO",
                status: "active",
                isHeadOffice: true,
                createdAt: new Date().toISOString()
            };

            branches.push(headOffice);
            saveArray(BRANCHES_KEY, branches);
        }

        const users = readArray(USERS_KEY);

        const adminExists = users.some(function (user) {
            return (
                String(user.username || "")
                    .trim()
                    .toLowerCase() === "admin"
            );
        });

        if (!adminExists) {
            users.push({
                id: "user-admin",
                fullName: "System Administrator",
                name: "System Administrator",
                username: "admin",
                password: "admin123",
                role: "admin",
                branchId: "head-office",
                branchName: "Head Office",
                status: "active",
                createdAt: new Date().toISOString()
            });

            saveArray(USERS_KEY, users);
        }
    }

    function initializeAuthentication() {
        const currentPage = getCurrentPage();

        if (currentPage === LOGIN_PAGE) {
            connectLoginForm();

            if (isLoggedIn()) {
                window.location.replace(DASHBOARD_PAGE);
            }

            return;
        }

        if (
            currentPage !== "" &&
            currentPage !== "index.html" &&
            !isLoggedIn()
        ) {
            window.location.replace(LOGIN_PAGE);
        }
    }

    function connectLoginForm() {
        const loginForm =
            document.getElementById("loginForm");

        if (!loginForm) {
            console.error(
                "Jufelix login error: #loginForm was not found."
            );

            return;
        }

        loginForm.onsubmit = function (event) {
            event.preventDefault();
            loginUser();
        };
    }

    function loginUser() {
        const usernameInput =
            document.getElementById("username");

        const passwordInput =
            document.getElementById("password");

        if (!usernameInput || !passwordInput) {
            showMessage(
                "The username or password field is missing.",
                "error"
            );

            return;
        }

        const username =
            usernameInput.value.trim().toLowerCase();

        const password =
            passwordInput.value;

        if (!username) {
            showMessage(
                "Please enter your username.",
                "error"
            );

            usernameInput.focus();
            return;
        }

        if (!password) {
            showMessage(
                "Please enter your password.",
                "error"
            );

            passwordInput.focus();
            return;
        }

        const loginButton =
            document.getElementById("loginButton");

        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = "Signing in...";
        }

        createRequiredLoginData();

        const users = readArray(USERS_KEY);

        const user = users.find(function (savedUser) {
            return (
                String(savedUser.username || "")
                    .trim()
                    .toLowerCase() === username &&
                String(savedUser.password || "") ===
                    String(password)
            );
        });

        if (!user) {
            resetLoginButton();

            showMessage(
                "Invalid username or password.",
                "error"
            );

            return;
        }

        const userStatus =
            String(user.status || "active").toLowerCase();

        if (userStatus !== "active") {
            resetLoginButton();

            showMessage(
                "This account is inactive.",
                "error"
            );

            return;
        }

        const branches = readArray(BRANCHES_KEY);

        const branch =
            branches.find(function (savedBranch) {
                return (
                    String(savedBranch.id) ===
                    String(user.branchId || "head-office")
                );
            }) ||
            {
                id: "head-office",
                branchName: "Head Office",
                name: "Head Office",
                status: "active"
            };

        const sessionUser = {
            id: user.id,
            fullName:
                user.fullName ||
                user.name ||
                user.username,
            name:
                user.fullName ||
                user.name ||
                user.username,
            username: user.username,
            role: normalizeRole(user.role),
            branchId: branch.id,
            branchName:
                branch.branchName ||
                branch.name ||
                "Head Office",
            status: "active",
            loginTime: new Date().toISOString()
        };

        localStorage.setItem(
            CURRENT_USER_KEY,
            JSON.stringify(sessionUser)
        );

        localStorage.setItem(
            ACTIVE_BRANCH_KEY,
            JSON.stringify(branch)
        );

        localStorage.setItem(
            "currentUser",
            JSON.stringify(sessionUser)
        );

        localStorage.setItem(
            "loggedIn",
            "true"
        );

        sessionStorage.setItem(
            "jufelixSessionActive",
            "true"
        );

        showMessage(
            "Login successful. Opening dashboard...",
            "success"
        );

        window.setTimeout(function () {
            window.location.replace(DASHBOARD_PAGE);
        }, 300);
    }

    function logoutUser() {
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem("currentUser");
        localStorage.removeItem("loggedIn");
        sessionStorage.removeItem("jufelixSessionActive");

        window.location.replace(LOGIN_PAGE);
    }

    function getCurrentUser() {
        return (
            readObject(CURRENT_USER_KEY) ||
            readObject("currentUser")
        );
    }

    function isLoggedIn() {
        const user = getCurrentUser();

        return Boolean(
            user &&
            user.id &&
            user.username &&
            user.role
        );
    }

    function showMessage(message, type) {
        const messageBox =
            document.getElementById("loginMessage");

        if (!messageBox) {
            window.alert(message);
            return;
        }

        messageBox.textContent = message;
        messageBox.className =
            "login-message " + type;
        messageBox.style.display = "block";
    }

    function resetLoginButton() {
        const loginButton =
            document.getElementById("loginButton");

        if (!loginButton) {
            return;
        }

        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    }

    function normalizeRole(role) {
        const normalizedRole =
            String(role || "sales")
                .trim()
                .toLowerCase();

        const aliases = {
            administrator: "admin",
            "sales personnel": "sales",
            salesperson: "sales",
            "stock keeper": "stockkeeper"
        };

        return aliases[normalizedRole] || normalizedRole;
    }

    function readArray(storageKey) {
        try {
            const savedData =
                localStorage.getItem(storageKey);

            if (!savedData) {
                return [];
            }

            const parsedData =
                JSON.parse(savedData);

            return Array.isArray(parsedData)
                ? parsedData
                : [];
        } catch (error) {
            console.error(
                "Unable to read:",
                storageKey,
                error
            );

            return [];
        }
    }

    function saveArray(storageKey, data) {
        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify(data)
            );

            return true;
        } catch (error) {
            console.error(
                "Unable to save:",
                storageKey,
                error
            );

            return false;
        }
    }

    function readObject(storageKey) {
        try {
            const savedData =
                localStorage.getItem(storageKey);

            if (!savedData) {
                return null;
            }

            const parsedData =
                JSON.parse(savedData);

            if (
                parsedData &&
                typeof parsedData === "object" &&
                !Array.isArray(parsedData)
            ) {
                return parsedData;
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    function getCurrentPage() {
        return window.location.pathname
            .split("/")
            .pop()
            .split("?")[0]
            .split("#")[0];
    }

    window.JufelixAuth = {
        login: loginUser,
        logout: logoutUser,
        isLoggedIn: isLoggedIn,
        getCurrentUser: getCurrentUser
    };

})();