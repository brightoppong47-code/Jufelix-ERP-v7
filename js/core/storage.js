/* =========================================================
   JUFELIX ERP v7.0 PROFESSIONAL
   CORE STORAGE SERVICE

   File:
   js/core/storage.js

   COMPLETE STABLE REPLACEMENT
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STORAGE KEYS
    ===================================================== */

    const STORAGE_KEYS = {

        company:
            "jufelix_v7_company",

        currentUser:
            "jufelix_v7_current_user",

        users:
            "jufelix_v7_users",

        branches:
            "jufelix_v7_branches",

        activeBranch:
            "jufelix_v7_active_branch",

        /*
         * IMPORTANT:
         * Existing Inventory, Sales,
         * Purchases and Reports use this key.
         */
        products:
            "jufelix_products",

        sales:
            "jufelix_v7_sales",

        purchases:
            "jufelix_v7_purchases",

        transfers:
            "jufelix_v7_transfers",

        customers:
            "jufelix_v7_customers",

        suppliers:
            "jufelix_v7_suppliers",

        expenses:
            "jufelix_v7_expenses",

        payments:
            "jufelix_v7_payments",

        settings:
            "jufelix_v7_settings",

        activityLogs:
            "jufelix_v7_activity_logs",

        stockLedger:
            "jufelix_stock_ledger"

    };


    /* =====================================================
       LEGACY KEYS
    ===================================================== */

    const LEGACY_PRODUCTS_KEY =
        "jufelix_v7_products";


    /* =====================================================
       DEFAULT DATA
    ===================================================== */

    function createDefaultCompany() {

        const now =
            new Date().toISOString();


        return {

            id:
                "company-main",

            companyName:
                "Jufelix Services",

            name:
                "Jufelix Services",

            phone:
                "",

            email:
                "",

            address:
                "",

            logo:
                "",

            currency:
                "GHS",

            currencySymbol:
                "GH₵",

            country:
                "Ghana",

            createdAt:
                now,

            updatedAt:
                now

        };

    }


    function createDefaultBranch() {

        const now =
            new Date().toISOString();


        return {

            id:
                "head-office",

            branchName:
                "Head Office",

            name:
                "Head Office",

            code:
                "HO",

            phone:
                "",

            address:
                "",

            status:
                "active",

            type:
                "head-office",

            isHeadOffice:
                true,

            createdAt:
                now,

            updatedAt:
                now

        };

    }


    function createDefaultAdmin() {

        const now =
            new Date().toISOString();


        return {

            id:
                "user-admin",

            fullName:
                "System Administrator",

            name:
                "System Administrator",

            username:
                "admin",

            password:
                "admin123",

            role:
                "admin",

            branchId:
                "head-office",

            branchName:
                "Head Office",

            status:
                "active",

            createdAt:
                now,

            updatedAt:
                now

        };

    }


    /* =====================================================
       STORAGE AVAILABILITY
    ===================================================== */

    function ensureStorageAvailable() {

        try {

            const testKey =
                "__jufelix_storage_test__";


            localStorage.setItem(
                testKey,
                "working"
            );


            localStorage.removeItem(
                testKey
            );


            return true;

        } catch (error) {

            console.error(
                "Jufelix localStorage unavailable:",
                error
            );


            return false;

        }

    }


    /* =====================================================
       BASIC METHODS
    ===================================================== */

    function has(
        storageKey
    ) {

        try {

            return (
                localStorage.getItem(
                    storageKey
                ) !== null
            );

        } catch (error) {

            return false;

        }

    }


    function get(
        storageKey,
        fallbackValue
    ) {

        const safeFallback =
            fallbackValue === undefined
                ? null
                : fallbackValue;


        try {

            const savedData =
                localStorage.getItem(
                    storageKey
                );


            if (
                savedData === null
            ) {

                return safeFallback;

            }


            return JSON.parse(
                savedData
            );

        } catch (error) {

            console.error(
                "Jufelix Storage Read Error:",
                storageKey,
                error
            );


            return safeFallback;

        }

    }


    function set(
        storageKey,
        value
    ) {

        try {

            localStorage.setItem(
                storageKey,
                JSON.stringify(
                    value
                )
            );


            dispatchStorageUpdate(
                storageKey,
                value
            );


            return true;

        } catch (error) {

            console.error(
                "Jufelix Storage Save Error:",
                storageKey,
                error
            );


            return false;

        }

    }


    function remove(
        storageKey
    ) {

        try {

            localStorage.removeItem(
                storageKey
            );


            dispatchStorageUpdate(
                storageKey,
                null
            );


            return true;

        } catch (error) {

            console.error(
                "Jufelix Storage Remove Error:",
                storageKey,
                error
            );


            return false;

        }

    }


    /* =====================================================
       OBJECT METHODS
    ===================================================== */

    function getObject(
        storageKey,
        fallbackValue
    ) {

        const safeFallback =
            fallbackValue === undefined
                ? {}
                : fallbackValue;


        const storedValue =
            get(
                storageKey,
                safeFallback
            );


        if (
            storedValue &&
            typeof storedValue ===
                "object" &&
            !Array.isArray(
                storedValue
            )
        ) {

            return storedValue;

        }


        return safeFallback;

    }


    function saveObject(
        storageKey,
        objectData
    ) {

        if (
            !objectData ||
            typeof objectData !==
                "object" ||
            Array.isArray(
                objectData
            )
        ) {

            console.error(
                "Jufelix Storage: saveObject requires an object."
            );


            return false;

        }


        return set(
            storageKey,
            objectData
        );

    }


    function updateObject(
        storageKey,
        updates
    ) {

        if (
            !updates ||
            typeof updates !==
                "object" ||
            Array.isArray(
                updates
            )
        ) {

            return null;

        }


        const currentObject =
            getObject(
                storageKey,
                {}
            );


        const updatedObject = {

            ...currentObject,

            ...updates,

            updatedAt:
                new Date()
                    .toISOString()

        };


        if (
            !saveObject(
                storageKey,
                updatedObject
            )
        ) {

            return null;

        }


        return updatedObject;

    }


    /* =====================================================
       ARRAY METHODS
    ===================================================== */

    function getArray(
        storageKey
    ) {

        const storedValue =
            get(
                storageKey,
                []
            );


        return Array.isArray(
            storedValue
        )
            ? storedValue
            : [];

    }


    function saveArray(
        storageKey,
        arrayData
    ) {

        if (
            !Array.isArray(
                arrayData
            )
        ) {

            console.error(
                "Jufelix Storage: saveArray requires an array."
            );


            return false;

        }


        return set(
            storageKey,
            arrayData
        );

    }


    function addToArray(
        storageKey,
        record
    ) {

        if (
            !record ||
            typeof record !==
                "object" ||
            Array.isArray(
                record
            )
        ) {

            return null;

        }


        const records =
            getArray(
                storageKey
            );


        const now =
            new Date()
                .toISOString();


        const newRecord = {

            ...record,

            id:
                record.id ||
                generateId(),

            createdAt:
                record.createdAt ||
                now,

            updatedAt:
                now

        };


        records.push(
            newRecord
        );


        if (
            !saveArray(
                storageKey,
                records
            )
        ) {

            return null;

        }


        return newRecord;

    }


    function updateArrayItem(
        storageKey,
        recordId,
        updates
    ) {

        const records =
            getArray(
                storageKey
            );


        const recordIndex =
            records.findIndex(
                function (record) {

                    return (
                        String(
                            record.id
                        ) ===
                        String(
                            recordId
                        )
                    );

                }
            );


        if (
            recordIndex ===
            -1
        ) {

            return null;

        }


        records[
            recordIndex
        ] = {

            ...records[
                recordIndex
            ],

            ...updates,

            id:
                records[
                    recordIndex
                ].id,

            updatedAt:
                new Date()
                    .toISOString()

        };


        if (
            !saveArray(
                storageKey,
                records
            )
        ) {

            return null;

        }


        return records[
            recordIndex
        ];

    }


    function deleteArrayItem(
        storageKey,
        recordId
    ) {

        const records =
            getArray(
                storageKey
            );


        const remainingRecords =
            records.filter(
                function (record) {

                    return (
                        String(
                            record.id
                        ) !==
                        String(
                            recordId
                        )
                    );

                }
            );


        if (
            remainingRecords.length ===
            records.length
        ) {

            return false;

        }


        return saveArray(
            storageKey,
            remainingRecords
        );

    }


    function findArrayItem(
        storageKey,
        recordId
    ) {

        return (
            getArray(
                storageKey
            ).find(
                function (record) {

                    return (
                        String(
                            record.id
                        ) ===
                        String(
                            recordId
                        )
                    );

                }
            ) ||
            null
        );

    }


    function findByField(
        storageKey,
        fieldName,
        fieldValue
    ) {

        return (
            getArray(
                storageKey
            ).find(
                function (record) {

                    return (
                        String(
                            record[
                                fieldName
                            ] ??
                            ""
                        )
                            .toLowerCase() ===
                        String(
                            fieldValue ??
                            ""
                        )
                            .toLowerCase()
                    );

                }
            ) ||
            null
        );

    }


    function filterArray(
        storageKey,
        callback
    ) {

        const records =
            getArray(
                storageKey
            );


        if (
            typeof callback !==
            "function"
        ) {

            return records;

        }


        return records.filter(
            callback
        );

    }


    /* =====================================================
       BRANCH METHODS
    ===================================================== */

    function getActiveBranch() {

        return getObject(
            STORAGE_KEYS.activeBranch,
            createDefaultBranch()
        );

    }


    function getActiveBranchId() {

        const activeBranch =
            getActiveBranch();


        return String(
            activeBranch.id ||
            "head-office"
        );

    }


    function setActiveBranch(
        branch
    ) {

        if (
            !branch ||
            typeof branch !==
                "object" ||
            !branch.id
        ) {

            return false;

        }


        return saveObject(
            STORAGE_KEYS.activeBranch,
            branch
        );

    }


    function getBranchRecords(
        storageKey,
        branchId
    ) {

        const selectedBranchId =
            branchId ||
            getActiveBranchId();


        return getArray(
            storageKey
        ).filter(
            function (record) {

                return (
                    String(
                        record.branchId ||
                        "head-office"
                    ) ===
                    String(
                        selectedBranchId
                    )
                );

            }
        );

    }


    /* =====================================================
       CURRENT USER
    ===================================================== */

    function getCurrentUser() {

        const user =
            getObject(
                STORAGE_KEYS.currentUser,
                null
            );


        if (user) {

            return user;

        }


        /*
         * Compatibility with older login code.
         */

        return getObject(
            "currentUser",
            null
        );

    }


    function setCurrentUser(
        user
    ) {

        if (
            !user ||
            typeof user !==
                "object"
        ) {

            return false;

        }


        const saved =
            saveObject(
                STORAGE_KEYS.currentUser,
                user
            );


        if (saved) {

            try {

                localStorage.setItem(
                    "currentUser",
                    JSON.stringify(
                        user
                    )
                );


                localStorage.setItem(
                    "loggedIn",
                    "true"
                );

            } catch (error) {

                console.warn(
                    "Legacy login compatibility save failed:",
                    error
                );

            }

        }


        return saved;

    }


    function clearCurrentUser() {

        remove(
            STORAGE_KEYS.currentUser
        );


        try {

            localStorage.removeItem(
                "currentUser"
            );


            localStorage.removeItem(
                "loggedIn"
            );


            sessionStorage.removeItem(
                "jufelixSessionActive"
            );

        } catch (error) {

            console.warn(
                "Session cleanup warning:",
                error
            );

        }


        return true;

    }


    /* =====================================================
       ACTIVITY LOGS
    ===================================================== */

    function addActivityLog(
        action,
        details
    ) {

        const currentUser =
            getCurrentUser();


        const activeBranch =
            getActiveBranch();


        return addToArray(
            STORAGE_KEYS.activityLogs,
            {

                action:
                    action ||
                    "Unknown activity",

                details:
                    details ||
                    "",

                userId:
                    currentUser
                        ? currentUser.id ||
                          ""
                        : "",

                userName:
                    currentUser
                        ? (
                            currentUser.fullName ||
                            currentUser.name ||
                            currentUser.username ||
                            "User"
                        )
                        : "System",

                branchId:
                    activeBranch.id ||
                    "head-office",

                branchName:
                    activeBranch.branchName ||
                    activeBranch.name ||
                    "Head Office",

                timestamp:
                    new Date()
                        .toISOString()

            }
        );

    }


    /* =====================================================
       BACKUP
    ===================================================== */

    function exportAllData() {

        const exportData = {

            application:
                "Jufelix ERP v7.0 Professional",

            version:
                "7.0",

            exportedAt:
                new Date()
                    .toISOString(),

            data:
                {}

        };


        Object.entries(
            STORAGE_KEYS
        ).forEach(
            function (entry) {

                const name =
                    entry[0];


                const storageKey =
                    entry[1];


                exportData.data[
                    name
                ] =
                    get(
                        storageKey,
                        null
                    );

            }
        );


        return exportData;

    }


    function restoreAllData(
        backupData
    ) {

        if (
            !backupData ||
            typeof backupData !==
                "object" ||
            !backupData.data
        ) {

            return false;

        }


        Object.entries(
            backupData.data
        ).forEach(
            function (entry) {

                const name =
                    entry[0];


                const value =
                    entry[1];


                const storageKey =
                    STORAGE_KEYS[
                        name
                    ];


                if (
                    storageKey &&
                    value !==
                    undefined
                ) {

                    set(
                        storageKey,
                        value
                    );

                }

            }
        );


        dispatchStorageUpdate(
            "restore",
            backupData.data
        );


        return true;

    }


    /* =====================================================
       CLEAR ALL
    ===================================================== */

    function clearAll() {

        const confirmed =
            window.confirm(
                "This will permanently clear all Jufelix ERP data on this device. Continue?"
            );


        if (!confirmed) {

            return false;

        }


        Object.values(
            STORAGE_KEYS
        ).forEach(
            function (storageKey) {

                try {

                    localStorage.removeItem(
                        storageKey
                    );

                } catch (error) {

                    console.error(
                        "Could not remove:",
                        storageKey
                    );

                }

            }
        );


        createDefaultData();


        dispatchStorageUpdate(
            "all",
            null
        );


        return true;

    }


    /* =====================================================
       MIGRATION
    ===================================================== */

    function migrateLegacyData() {

        /*
         * Only migrate old product data when
         * the current product key is empty.
         *
         * Existing working inventory data
         * will never be overwritten.
         */

        const currentProducts =
            getArray(
                STORAGE_KEYS.products
            );


        if (
            currentProducts.length >
            0
        ) {

            return;

        }


        const legacyProducts =
            getArray(
                LEGACY_PRODUCTS_KEY
            );


        if (
            legacyProducts.length >
            0
        ) {

            saveArray(
                STORAGE_KEYS.products,
                legacyProducts
            );


            console.log(
                "Legacy product data migrated."
            );

        }

    }


    /* =====================================================
       DEFAULT DATA
    ===================================================== */

    function createDefaultData() {

        if (
            !has(
                STORAGE_KEYS.company
            )
        ) {

            saveObject(
                STORAGE_KEYS.company,
                createDefaultCompany()
            );

        }


        if (
            !has(
                STORAGE_KEYS.branches
            )
        ) {

            saveArray(
                STORAGE_KEYS.branches,
                [
                    createDefaultBranch()
                ]
            );

        }


        if (
            !has(
                STORAGE_KEYS.users
            )
        ) {

            saveArray(
                STORAGE_KEYS.users,
                [
                    createDefaultAdmin()
                ]
            );

        }


        if (
            !has(
                STORAGE_KEYS.activeBranch
            )
        ) {

            saveObject(
                STORAGE_KEYS.activeBranch,
                createDefaultBranch()
            );

        }


        createEmptyArrayIfMissing(
            STORAGE_KEYS.products
        );


        createEmptyArrayIfMissing(
            STORAGE_KEYS.sales
        );


        createEmptyArrayIfMissing(
            STORAGE_KEYS.purchases
        );


        createEmptyArrayIfMissing(
            STORAGE_KEYS.transfers
        );


        createEmptyArrayIfMissing(
            STORAGE_KEYS.customers
        );


        createEmptyArrayIfMissing(
            STORAGE_KEYS.suppliers
        );


        createEmptyArrayIfMissing(
            STORAGE_KEYS.expenses
        );


        createEmptyArrayIfMissing(
            STORAGE_KEYS.payments
        );


        createEmptyArrayIfMissing(
            STORAGE_KEYS.activityLogs
        );


        createEmptyArrayIfMissing(
            STORAGE_KEYS.stockLedger
        );


        if (
            !has(
                STORAGE_KEYS.settings
            )
        ) {

            const now =
                new Date()
                    .toISOString();


            saveObject(
                STORAGE_KEYS.settings,
                {

                    theme:
                        "light",

                    primaryColor:
                        "#0b5ed7",

                    lowStockLevel:
                        5,

                    receiptFooter:
                        "Thank you for doing business with us.",

                    createdAt:
                        now,

                    updatedAt:
                        now

                }
            );

        }

    }


    function createEmptyArrayIfMissing(
        storageKey
    ) {

        if (
            !has(
                storageKey
            )
        ) {

            saveArray(
                storageKey,
                []
            );

        }

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initializeStorage() {

        if (
            !ensureStorageAvailable()
        ) {

            return false;

        }


        migrateLegacyData();


        createDefaultData();


        console.log(
            "Jufelix ERP v7.0 storage initialized."
        );


        return true;

    }


    /* =====================================================
       HELPERS
    ===================================================== */

    function generateId() {

        return (
            "jfx-" +
            Date.now()
                .toString(
                    36
                ) +
            "-" +
            Math.random()
                .toString(
                    36
                )
                .substring(
                    2,
                    9
                )
        );

    }


    function dispatchStorageUpdate(
        storageKey,
        value
    ) {

        document.dispatchEvent(
            new CustomEvent(
                "jufelix:data-updated",
                {

                    detail: {

                        key:
                            storageKey,

                        value:
                            value

                    }

                }
            )
        );

    }


    /* =====================================================
       PUBLIC STORAGE SERVICE
    ===================================================== */

    window.JufelixStorage = {

        keys:
            STORAGE_KEYS,
getMode:
    function () {
        return "localStorage";
    },

        initialize:
            initializeStorage,


        isAvailable:
            ensureStorageAvailable,


        has:
            has,

        get:
            get,

        set:
            set,

        remove:
            remove,

        clearAll:
            clearAll,


        getObject:
            getObject,

        saveObject:
            saveObject,

        updateObject:
            updateObject,


        getArray:
            getArray,

        saveArray:
            saveArray,

        addToArray:
            addToArray,

        updateArrayItem:
            updateArrayItem,

        deleteArrayItem:
            deleteArrayItem,

        findArrayItem:
            findArrayItem,

        findByField:
            findByField,

        filterArray:
            filterArray,


        getActiveBranch:
            getActiveBranch,

        getActiveBranchId:
            getActiveBranchId,

        setActiveBranch:
            setActiveBranch,

        getBranchRecords:
            getBranchRecords,


        getCurrentUser:
            getCurrentUser,

        setCurrentUser:
            setCurrentUser,

        clearCurrentUser:
            clearCurrentUser,


        addActivityLog:
            addActivityLog,


        exportAllData:
            exportAllData,

        restoreAllData:
            restoreAllData,


        generateId:
            generateId

    };


    /* =====================================================
       START STORAGE
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeStorage
        );

    } else {

        initializeStorage();

    }

})();