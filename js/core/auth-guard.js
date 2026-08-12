/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   STRICT PAGE ACCESS GUARD

   File:
   js/core/auth-guard.js
========================================== */

(function () {
    "use strict";

    const CURRENT_USER_KEY =
        "jufelix_v7_current_user";

    let accessChecked = false;


    /* ==========================================
       PAGE PERMISSIONS
    ========================================== */

    const PAGE_PERMISSIONS = {

        "dashboard.html":
            "dashboard",

        "sales.html":
            "sales",

        "inventory.html":
            "inventory",

        "purchases.html":
            "purchases",

        "transfers.html":
            "transfers",

        "customers.html":
            "customers",

        "suppliers.html":
            "suppliers",

        "expenses.html":
            "expenses",

        "reports.html":
            "reports",

        "branches.html":
            "branches",

        "users.html":
            "users",

        "settings.html":
            "settings"
    };


    /* ==========================================
       FALLBACK ROLE PERMISSIONS
    ========================================== */

    const ROLE_PERMISSIONS = {

        admin: [
            "*"
        ],

        manager: [
            "dashboard",
            "sales",
            "inventory",
            "purchases",
            "transfers",
            "customers",
            "suppliers",
            "expenses",
            "reports"
        ],

        "sales-officer": [
            "dashboard",
            "sales",
            "customers"
        ],

        cashier: [
            "dashboard",
            "sales",
            "customers"
        ],

        "store-keeper": [
            "dashboard",
            "inventory",
            "purchases",
            "transfers",
            "suppliers"
        ],

        accountant: [
            "dashboard",
            "expenses",
            "reports"
        ]
    };


    /*
     * Check immediately.
     */

    checkPageAccess();


    /*
     * Check once more after HTML loads.
     */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            checkPageAccess(true);
        }
    );


    /* ==========================================
       ACCESS CHECK
    ========================================== */

    function checkPageAccess(
        forceCheck
    ) {

        if (
            accessChecked &&
            !forceCheck
        ) {
            return;
        }


        const currentPage =
            getCurrentPage();


        /*
         * Login page must always remain open.
         */

        if (
            currentPage ===
            "login.html"
        ) {
            return;
        }


        const requiredPermission =
            PAGE_PERMISSIONS[
                currentPage
            ];


        /*
         * Page is not registered as a
         * protected ERP page.
         */

        if (!requiredPermission) {

            console.warn(
                "Auth Guard: No permission rule for",
                currentPage
            );

            return;
        }


        const currentUser =
            getCurrentUser();


        /* ======================================
           NOT LOGGED IN
        ====================================== */

        if (!currentUser) {

            denyToLogin(
                "Please sign in to continue."
            );

            return;
        }


        /* ======================================
           ACCOUNT STATUS
        ====================================== */

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

            clearSession();

            window.alert(
                "Your account is inactive."
            );

            window.location.replace(
                "login.html"
            );

            return;
        }


        const role =
            normalizeRole(
                currentUser.role
            );


        console.log(
            "AUTH GUARD:",
            {
                page:
                    currentPage,

                permission:
                    requiredPermission,

                role:
                    role,

                user:
                    currentUser.email ||
                    currentUser.fullName ||
                    currentUser.username
            }
        );


        /* ======================================
           ADMIN
        ====================================== */

        if (
            role ===
            "admin"
        ) {

            accessChecked =
                true;

            return;
        }


        /* ======================================
           CENTRAL PERMISSIONS
        ====================================== */

        if (
            window.JufelixPermissions &&
            typeof window
                .JufelixPermissions
                .hasPermission ===
                "function"
        ) {

            const allowed =
                window
                    .JufelixPermissions
                    .hasPermission(
                        requiredPermission
                    );


            if (allowed) {

                accessChecked =
                    true;

                return;
            }


            denyAccess(
                currentPage
            );

            return;
        }


        /* ======================================
           FALLBACK PERMISSIONS
        ====================================== */

        const permissions =
            ROLE_PERMISSIONS[
                role
            ] || [];


        if (
            permissions.includes(
                requiredPermission
            )
        ) {

            accessChecked =
                true;

            return;
        }


        denyAccess(
            currentPage
        );
    }


    /* ==========================================
       DENY ACCESS
    ========================================== */

    function denyAccess(
        currentPage
    ) {

        accessChecked =
            true;


        window.alert(
            "Access denied. Your account does not have permission to open this page."
        );


        if (
            currentPage !==
            "dashboard.html"
        ) {

            window.location.replace(
                "dashboard.html"
            );

            return;
        }


        clearSession();


        window.location.replace(
            "login.html"
        );
    }


    function denyToLogin(
        message
    ) {

        clearSession();


        if (message) {

            console.warn(
                message
            );
        }


        window.location.replace(
            "login.html"
        );
    }


    /* ==========================================
       CURRENT USER
    ========================================== */

    function getCurrentUser() {

        return (
            readStoredObject(
                CURRENT_USER_KEY
            ) ||
            readStoredObject(
                "currentUser"
            ) ||
            null
        );
    }


    /* ==========================================
       CURRENT PAGE
    ========================================== */

    function getCurrentPage() {

        let pathname =
            String(
                window.location.pathname ||
                ""
            );


        /*
         * Remove trailing slash.
         */

        pathname =
            pathname.replace(
                /\/+$/,
                ""
            );


        let page =
            pathname
                .split("/")
                .pop();


        page =
            String(
                page ||
                ""
            )
                .split("?")[0]
                .split("#")[0]
                .trim()
                .toLowerCase();


        if (
            !page ||
            page ===
                "index.html"
        ) {

            return "dashboard.html";
        }


        return page;
    }


    /* ==========================================
       ROLE NORMALIZATION
    ========================================== */

    function normalizeRole(
        role
    ) {

        const value =
            String(
                role ||
                ""
            )
                .trim()
                .toLowerCase()
                .replace(
                    /_/g,
                    "-"
                )
                .replace(
                    /\s+/g,
                    "-"
                );


        const aliases = {

            admin:
                "admin",

            administrator:
                "admin",

            "system-administrator":
                "admin",


            manager:
                "manager",

            "branch-manager":
                "manager",


            sales:
                "sales-officer",

            salesperson:
                "sales-officer",

            "sales-person":
                "sales-officer",

            "sales-personnel":
                "sales-officer",

            "sales-officer":
                "sales-officer",


            cashier:
                "cashier",


            stockkeeper:
                "store-keeper",

            "stock-keeper":
                "store-keeper",

            storekeeper:
                "store-keeper",

            "store-keeper":
                "store-keeper",


            accountant:
                "accountant",

            accounts:
                "accountant"
        };


        return (
            aliases[
                value
            ] ||
            value
        );
    }


    /* ==========================================
       STORAGE
    ========================================== */

    function readStoredObject(
        storageKey
    ) {

        try {

            const saved =
                localStorage.getItem(
                    storageKey
                );


            if (!saved) {
                return null;
            }


            const parsed =
                JSON.parse(
                    saved
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
                "Auth Guard storage error:",
                storageKey,
                error
            );


            return null;
        }
    }


    function clearSession() {

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
            "jufelix_v7_active_branch"
        );

        sessionStorage.removeItem(
            "jufelixSessionActive"
        );
    }


    /* ==========================================
       PUBLIC API
    ========================================== */

    window.JufelixAuthGuard = {

        check:
            function () {

                checkPageAccess(
                    true
                );
            },

        getCurrentUser:
            getCurrentUser,

        getCurrentPage:
            getCurrentPage
    };

})();