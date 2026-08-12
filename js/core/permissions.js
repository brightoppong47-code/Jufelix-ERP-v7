/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   Central Roles & Permissions

   File:
   js/core/permissions.js
========================================== */

(function () {
    "use strict";

    const CURRENT_USER_KEY =
        "jufelix_v7_current_user";


    /* ======================================
       ROLE PERMISSIONS
    ====================================== */

    const PERMISSIONS = {

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


    /* ======================================
       CURRENT USER
    ====================================== */

    function getCurrentUser() {

        return (
            readObject(
                CURRENT_USER_KEY
            ) ||
            readObject(
                "currentUser"
            ) ||
            null
        );
    }


    /* ======================================
       CURRENT ROLE
    ====================================== */

    function getRole() {

        const user =
            getCurrentUser();

        if (!user) {
            return "";
        }

        return normalizeRole(
            user.role
        );
    }


    /* ======================================
       CHECK PERMISSION
    ====================================== */

    function hasPermission(
        permission
    ) {

        const role =
            getRole();

        if (!role) {
            return false;
        }


        const rolePermissions =
            PERMISSIONS[
                role
            ] || [];


        /*
         * Administrator gets everything.
         */

        if (
            rolePermissions.includes(
                "*"
            )
        ) {
            return true;
        }


        return (
            rolePermissions.includes(
                String(
                    permission ||
                    ""
                )
                    .trim()
                    .toLowerCase()
            )
        );
    }


    /* ======================================
       ROLE NORMALIZATION
    ====================================== */

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


    /* ======================================
       ROLE DISPLAY NAME
    ====================================== */

    function getRoleLabel(
        role
    ) {

        const normalized =
            normalizeRole(
                role
            );


        const labels = {

            admin:
                "Administrator",

            manager:
                "Manager",

            "sales-officer":
                "Sales Officer",

            cashier:
                "Cashier",

            "store-keeper":
                "Store Keeper",

            accountant:
                "Accountant"
        };


        return (
            labels[
                normalized
            ] ||
            role ||
            "User"
        );
    }


    /* ======================================
       STORAGE
    ====================================== */

    function readObject(
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
                "Permissions storage error:",
                error
            );


            return null;
        }
    }


    /* ======================================
       PUBLIC API
    ====================================== */

    window.JufelixPermissions = {

        permissions:
            PERMISSIONS,

        getCurrentUser:
            getCurrentUser,

        getRole:
            getRole,

        normalizeRole:
            normalizeRole,

        getRoleLabel:
            getRoleLabel,

        hasPermission:
            hasPermission

    };


    console.log(
        "Jufelix permissions loaded."
    );

})();