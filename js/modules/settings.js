/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   SETTINGS MODULE

   File:
   js/modules/settings.js

   + Company Settings
   + Compressed Logo
   + Theme
   + Firebase Settings Sync
   + Logo Sync Across Devices
   + Reset Business Data
   + Factory Reset
   + Admin Protection
========================================== */

(function () {
    "use strict";


    /* ==========================================
       SETTINGS STORAGE
    ========================================== */

    const SETTINGS_KEY =
        "jufelix_v7_settings";

    const COMPANY_KEY =
        "jufelix_v7_company";

    const LOGO_KEY =
        "jufelix_v7_company_logo";

    const THEME_KEY =
        "jufelix_v7_theme";


    /* ==========================================
       BUSINESS STORAGE
    ========================================== */

    const BUSINESS_STORAGE_KEYS = [

        "jufelix_products",

        "jufelix_v7_sales",

        "jufelix_v7_purchases",

        "jufelix_v7_expenses",

        "jufelix_v7_transfers",

        "jufelix_v7_customers",

        "jufelix_v7_suppliers",

        "jufelix_v7_branches",

        "jufelix_stock_ledger",

        "jufelix_v7_payments",

        "jufelix_v7_supplier_payments"
    ];


    const FIRESTORE_COLLECTIONS = [

        "products",

        "sales",

        "purchases",

        "expenses",

        "transfers",

        "customers",

        "suppliers",

        "branches"
    ];


    /* ==========================================
       STATE
    ========================================== */

    let settings = {};

    let firestoreTools =
        null;

    let resetRunning =
        false;


    /* ==========================================
       INITIALIZE
    ========================================== */

    document.addEventListener(
        "DOMContentLoaded",
        initializeSettings
    );


    function initializeSettings() {

        settings =
            loadSettings();


        loadSettingsIntoForm();

        loadUserInformation();

        connectEvents();


        applyTheme(
            settings.theme ||
            "jufelix-blue"
        );


        const savedLogo =
            getSavedLogo();


        if (savedLogo) {

            settings.logo =
                savedLogo;


            showLogo(
                savedLogo
            );
        }


        applyDangerZoneSecurity();


        console.log(
            "✅ Jufelix Settings initialized."
        );
    }


    /* ==========================================
       EVENTS
    ========================================== */

    function connectEvents() {

        const saveButton =
            document.getElementById(
                "saveSettings"
            );


        const themeSelect =
            document.getElementById(
                "themeSelect"
            );


        const logoInput =
            document.getElementById(
                "companyLogo"
            );


        const businessResetButton =
            document.getElementById(
                "resetBusinessDataButton"
            );


        const factoryResetButton =
            document.getElementById(
                "factoryResetButton"
            );


        if (saveButton) {

            saveButton.type =
                "button";


            saveButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    saveAllSettings();
                }
            );
        }


        if (themeSelect) {

            themeSelect.addEventListener(
                "change",
                function () {

                    applyTheme(
                        themeSelect.value
                    );
                }
            );
        }


        if (logoInput) {

            logoInput.addEventListener(
                "change",
                handleLogoSelection
            );
        }


        if (businessResetButton) {

            businessResetButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    resetBusinessData();
                }
            );
        }


        if (factoryResetButton) {

            factoryResetButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    factoryReset();
                }
            );
        }


        /*
         * Settings received from another device.
         */

        document.addEventListener(
            "jufelix:cloud-settings-updated",
            function () {

                settings =
                    loadSettings();


                loadSettingsIntoForm();


                const logo =
                    getSavedLogo();


                if (logo) {

                    showLogo(
                        logo
                    );
                }


                applyTheme(
                    settings.theme ||
                    "jufelix-blue"
                );


                updateVisibleBranding();


                console.log(
                    "☁️ Settings page refreshed from cloud."
                );
            }
        );
    }


    /* ==========================================
       ADMIN SECURITY
    ========================================== */

    function applyDangerZoneSecurity() {

        const dangerZone =
            document.getElementById(
                "settingsDangerZone"
            );


        if (!dangerZone) {
            return;
        }


        dangerZone.style.display =
            isAdministrator()
                ? ""
                : "none";
    }


    function isAdministrator() {

        const user =
            getCurrentUser();


        if (!user) {
            return false;
        }


        return normalizeRole(
            user.role
        ) === "admin";
    }


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


        if (
            value === "admin" ||
            value === "administrator" ||
            value === "system-administrator"
        ) {

            return "admin";
        }


        return value;
    }


    function getCurrentUser() {

        return (
            readObject(
                "jufelix_v7_current_user"
            ) ||
            readObject(
                "currentUser"
            ) ||
            null
        );
    }


    /* ==========================================
       SAVE SETTINGS
    ========================================== */

    async function saveAllSettings() {

        const companyName =
            getValue(
                "companyName"
            );


        if (!companyName) {

            showToast(
                "Enter the company name.",
                "error"
            );

            return;
        }


        const currency =
            getValue(
                "currency"
            ) ||
            "GHS";


        const theme =
            getValue(
                "themeSelect"
            ) ||
            "jufelix-blue";


        settings = {

            companyName:
                companyName,

            phone:
                getValue(
                    "companyPhone"
                ),

            email:
                getValue(
                    "companyEmail"
                ),

            taxId:
                getValue(
                    "companyTaxId"
                ),

            address:
                getValue(
                    "companyAddress"
                ),

            currency:
                currency,

            currencySymbol:
                getCurrencySymbol(
                    currency
                ),

            theme:
                theme,

            receiptFooter:
                getValue(
                    "receiptFooter"
                ) ||
                "Thank you for doing business with us.",

            updatedAt:
                new Date()
                    .toISOString()
        };


        const companyData = {

            companyName:
                settings.companyName,

            name:
                settings.companyName,

            phone:
                settings.phone,

            email:
                settings.email,

            taxId:
                settings.taxId,

            address:
                settings.address,

            currency:
                settings.currency,

            currencySymbol:
                settings.currencySymbol,

            theme:
                settings.theme,

            updatedAt:
                settings.updatedAt
        };


        try {

            /* ==================================
               SAVE LOCALLY
            ================================== */

            localStorage.setItem(
                SETTINGS_KEY,
                JSON.stringify(
                    settings
                )
            );


            localStorage.setItem(
                COMPANY_KEY,
                JSON.stringify(
                    companyData
                )
            );


            localStorage.setItem(
                "companySettings",
                JSON.stringify(
                    companyData
                )
            );


            localStorage.setItem(
                THEME_KEY,
                settings.theme
            );


            applyTheme(
                settings.theme
            );


            updateVisibleBranding();


            if (
                window.JufelixSidebar &&
                typeof window
                    .JufelixSidebar
                    .refresh ===
                    "function"
            ) {

                window.JufelixSidebar
                    .refresh();
            }


            /* ==================================
               SAVE TO FIREBASE
            ================================== */

            const cloud =
                await waitForSettingsCloud(
                    15000
                );


            await cloud.save({

                ...settings,

                logo:
                    getSavedLogo()
            });


            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:settingsChanged",
                    {
                        detail: {

                            ...settings,

                            logo:
                                getSavedLogo()
                        }
                    }
                )
            );


            showToast(
                "Settings and logo synced successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "Settings save failed:",
                error
            );


            showToast(
                (
                    error &&
                    error.message
                ) ||
                "Settings saved locally, but cloud sync failed.",
                "error"
            );
        }
    }


    /* ==========================================
       WAIT FOR SETTINGS CLOUD
    ========================================== */

    function waitForSettingsCloud(
        timeout
    ) {

        return new Promise(
            function (
                resolve,
                reject
            ) {

                const started =
                    Date.now();


                function check() {

                    if (
                        window.JufelixSettingsCloud &&
                        typeof window
                            .JufelixSettingsCloud
                            .save ===
                        "function"
                    ) {

                        resolve(
                            window.JufelixSettingsCloud
                        );

                        return;
                    }


                    if (
                        Date.now() -
                        started >=
                        timeout
                    ) {

                        reject(
                            new Error(
                                "Settings Cloud did not become ready."
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
       RESET BUSINESS DATA
    ========================================== */

    async function resetBusinessData() {

        if (resetRunning) {
            return;
        }


        if (!isAdministrator()) {

            showToast(
                "Administrator access is required.",
                "error"
            );

            return;
        }


        const confirmation =
            getValue(
                "businessResetConfirmation"
            )
                .trim()
                .toUpperCase();


        if (
            confirmation !==
            "RESET"
        ) {

            showToast(
                "Type RESET before resetting business data.",
                "error"
            );

            return;
        }


        const first =
            window.confirm(
                "WARNING:\n\n" +
                "This will permanently delete all business records from this device and Firebase.\n\n" +
                "Your Administrator login, company information, logo and theme will remain.\n\n" +
                "Continue?"
            );


        if (!first) {
            return;
        }


        const second =
            window.confirm(
                "FINAL CONFIRMATION\n\n" +
                "This cannot be undone.\n\n" +
                "Delete all business data now?"
            );


        if (!second) {
            return;
        }


        resetRunning =
            true;


        setResetButtonsState(
            true,
            "Resetting business data..."
        );


        try {

            await deleteBusinessDataFromFirestore();


            clearLocalBusinessData();


            const input =
                document.getElementById(
                    "businessResetConfirmation"
                );


            if (input) {
                input.value = "";
            }


            showToast(
                "Business data reset successfully.",
                "success"
            );


            window.setTimeout(
                function () {

                    window.location.href =
                        "dashboard.html";
                },
                1200
            );


        } catch (error) {

            console.error(
                "Business reset failed:",
                error
            );


            showResetError(
                error
            );


        } finally {

            resetRunning =
                false;


            setResetButtonsState(
                false
            );
        }
    }


    /* ==========================================
       FACTORY RESET
    ========================================== */

    async function factoryReset() {

        if (resetRunning) {
            return;
        }


        if (!isAdministrator()) {

            showToast(
                "Administrator access is required.",
                "error"
            );

            return;
        }


        const confirmation =
            getValue(
                "factoryResetConfirmation"
            )
                .trim()
                .toUpperCase();


        if (
            confirmation !==
            "FACTORY RESET"
        ) {

            showToast(
                "Type FACTORY RESET before continuing.",
                "error"
            );

            return;
        }


        const first =
            window.confirm(
                "FACTORY RESET\n\n" +
                "Business records, company settings, logo, theme, currency and receipt preferences will be removed.\n\n" +
                "Your Firebase Authentication account and Users collection will remain.\n\n" +
                "Continue?"
            );


        if (!first) {
            return;
        }


        const second =
            window.confirm(
                "FINAL FACTORY RESET CONFIRMATION\n\n" +
                "There is no undo.\n\n" +
                "Reset Jufelix ERP now?"
            );


        if (!second) {
            return;
        }


        resetRunning =
            true;


        setResetButtonsState(
            true,
            "Factory reset in progress..."
        );


        try {

            /*
             * Save login/session before clearing.
             */

            const user =
                getCurrentUser();


            const activeBranch =
                readObject(
                    "jufelix_v7_active_branch"
                );


            /*
             * Clear operational cloud records.
             */

            await deleteBusinessDataFromFirestore();


            /*
             * Factory Reset must also remove
             * shared company settings/logo.
             */

            await deleteCloudCompanySettings();


            clearLocalBusinessData();

            clearLocalSettings();


            /*
             * Restore Administrator login.
             */

            if (user) {

                localStorage.setItem(
                    "jufelix_v7_current_user",
                    JSON.stringify(
                        user
                    )
                );


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
            }


            if (activeBranch) {

                localStorage.setItem(
                    "jufelix_v7_active_branch",
                    JSON.stringify(
                        activeBranch
                    )
                );
            }


            sessionStorage.setItem(
                "jufelixSessionActive",
                "true"
            );


            showToast(
                "Factory reset completed successfully.",
                "success"
            );


            window.setTimeout(
                function () {

                    window.location.href =
                        "settings.html";
                },
                1300
            );


        } catch (error) {

            console.error(
                "Factory reset failed:",
                error
            );


            showResetError(
                error
            );


        } finally {

            resetRunning =
                false;


            setResetButtonsState(
                false
            );
        }
    }


    /* ==========================================
       DELETE FIRESTORE BUSINESS DATA
    ========================================== */

    async function deleteBusinessDataFromFirestore() {

        const db =
            await waitForFirebase();


        const tools =
            await getFirestoreTools();


        for (
            const collectionName of
            FIRESTORE_COLLECTIONS
        ) {

            await deleteFirestoreCollection(
                db,
                tools,
                collectionName
            );
        }
    }


    async function deleteFirestoreCollection(
        db,
        tools,
        collectionName
    ) {

        const reference =
            tools.collection(
                db,
                collectionName
            );


        const snapshot =
            await tools.getDocs(
                reference
            );


        if (snapshot.empty) {
            return;
        }


        const documents =
            snapshot.docs;


        const BATCH_SIZE =
            400;


        for (
            let start = 0;
            start < documents.length;
            start += BATCH_SIZE
        ) {

            const batch =
                tools.writeBatch(
                    db
                );


            documents
                .slice(
                    start,
                    start +
                    BATCH_SIZE
                )
                .forEach(
                    function (
                        documentSnapshot
                    ) {

                        batch.delete(
                            documentSnapshot.ref
                        );
                    }
                );


            await batch.commit();
        }
    }


    /* ==========================================
       DELETE CLOUD COMPANY SETTINGS
    ========================================== */

    async function deleteCloudCompanySettings() {

        const db =
            await waitForFirebase();


        const tools =
            await getFirestoreTools();


        await tools.deleteDoc(

            tools.doc(
                db,
                "system",
                "company"
            )
        );


        console.log(
            "✅ Cloud company settings removed."
        );
    }


    /* ==========================================
       FIREBASE
    ========================================== */

    async function getFirestoreTools() {

        if (firestoreTools) {

            return firestoreTools;
        }


        firestoreTools =
            await import(
                "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
            );


        return firestoreTools;
    }


    function waitForFirebase(
        timeout = 15000
    ) {

        return new Promise(
            function (
                resolve,
                reject
            ) {

                const started =
                    Date.now();


                function check() {

                    if (
                        window.JufelixFirebase &&
                        window.JufelixFirebase.db &&
                        window.JufelixFirebase.auth &&
                        window.JufelixFirebase
                            .auth.currentUser
                    ) {

                        resolve(
                            window.JufelixFirebase.db
                        );

                        return;
                    }


                    if (
                        Date.now() -
                        started >
                        timeout
                    ) {

                        reject(
                            new Error(
                                "Firebase database was not ready."
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
       LOCAL RESET
    ========================================== */

    function clearLocalBusinessData() {

        BUSINESS_STORAGE_KEYS.forEach(
            function (
                key
            ) {

                localStorage.removeItem(
                    key
                );
            }
        );


        [
            "products",
            "sales",
            "purchases",
            "expenses",
            "customers",
            "suppliers",
            "transfers",
            "stockLedger",
            "stock_ledger"
        ].forEach(
            function (
                key
            ) {

                localStorage.removeItem(
                    key
                );
            }
        );
    }


    function clearLocalSettings() {

        [
            SETTINGS_KEY,

            COMPANY_KEY,

            LOGO_KEY,

            THEME_KEY,

            "companySettings",

            "theme",

            "companyLogo"
        ].forEach(
            function (
                key
            ) {

                localStorage.removeItem(
                    key
                );
            }
        );
    }


    /* ==========================================
       RESET BUTTON STATE
    ========================================== */

    function setResetButtonsState(
        working,
        message
    ) {

        const businessButton =
            document.getElementById(
                "resetBusinessDataButton"
            );


        const factoryButton =
            document.getElementById(
                "factoryResetButton"
            );


        if (businessButton) {

            businessButton.disabled =
                working;


            businessButton.textContent =
                working
                    ? (
                        message ||
                        "Working..."
                    )
                    : "🧹 Reset Business Data";
        }


        if (factoryButton) {

            factoryButton.disabled =
                working;


            factoryButton.textContent =
                working
                    ? (
                        message ||
                        "Working..."
                    )
                    : "🗑️ Factory Reset ERP";
        }
    }


    function showResetError(
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
                "permission-denied"
            )
        ) {

            showToast(
                "Firebase denied this reset operation.",
                "error"
            );

            return;
        }


        showToast(
            error &&
            error.message
                ? error.message
                : "Reset could not be completed.",
            "error"
        );
    }


    /* ==========================================
       LOAD SETTINGS
    ========================================== */

    function loadSettings() {

        const defaults = {

            companyName:
                "Jufelix Services",

            phone:
                "",

            email:
                "",

            taxId:
                "",

            address:
                "",

            currency:
                "GHS",

            currencySymbol:
                "GH₵",

            theme:
                "jufelix-blue",

            receiptFooter:
                "Thank you for doing business with us."
        };


        try {

            const stored =
                localStorage.getItem(
                    SETTINGS_KEY
                );


            if (stored) {

                return {

                    ...defaults,

                    ...JSON.parse(
                        stored
                    )
                };
            }


            const companyStored =
                localStorage.getItem(
                    COMPANY_KEY
                );


            if (companyStored) {

                return {

                    ...defaults,

                    ...JSON.parse(
                        companyStored
                    )
                };
            }


            return defaults;


        } catch (error) {

            return defaults;
        }
    }


    /* ==========================================
       LOAD FORM
    ========================================== */

    function loadSettingsIntoForm() {

        setValue(
            "companyName",
            settings.companyName
        );


        setValue(
            "companyPhone",
            settings.phone
        );


        setValue(
            "companyEmail",
            settings.email
        );


        setValue(
            "companyTaxId",
            settings.taxId
        );


        setValue(
            "companyAddress",
            settings.address
        );


        setValue(
            "currency",
            settings.currency ||
            "GHS"
        );


        setValue(
            "themeSelect",
            settings.theme ||
            "jufelix-blue"
        );


        setValue(
            "receiptFooter",
            settings.receiptFooter
        );
    }


    /* ==========================================
       LOGO
    ========================================== */

    async function handleLogoSelection(
        event
    ) {

        const file =
            event.target.files &&
            event.target.files[0];


        if (!file) {
            return;
        }


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            showToast(
                "Select a valid image file.",
                "error"
            );

            return;
        }


        try {

            showToast(
                "Preparing logo...",
                "success"
            );


            const compressedLogo =
                await compressLogo(
                    file
                );


            localStorage.setItem(
                LOGO_KEY,
                compressedLogo
            );


            settings.logo =
                compressedLogo;


            showLogo(
                compressedLogo
            );


            showToast(
                "Logo ready. Tap Save Settings to sync it.",
                "success"
            );


        } catch (error) {

            console.error(
                "Logo processing failed:",
                error
            );


            showToast(
                "Logo could not be prepared.",
                "error"
            );
        }
    }


    function compressLogo(
        file
    ) {

        return new Promise(
            function (
                resolve,
                reject
            ) {

                const reader =
                    new FileReader();


                reader.onload =
                    function () {

                        const image =
                            new Image();


                        image.onload =
                            function () {

                                const maxSize =
                                    320;


                                let width =
                                    image.width;


                                let height =
                                    image.height;


                                if (
                                    width > height &&
                                    width > maxSize
                                ) {

                                    height =
                                        Math.round(
                                            height *
                                            maxSize /
                                            width
                                        );


                                    width =
                                        maxSize;


                                } else if (
                                    height > maxSize
                                ) {

                                    width =
                                        Math.round(
                                            width *
                                            maxSize /
                                            height
                                        );


                                    height =
                                        maxSize;
                                }


                                const canvas =
                                    document.createElement(
                                        "canvas"
                                    );


                                canvas.width =
                                    width;


                                canvas.height =
                                    height;


                                const context =
                                    canvas.getContext(
                                        "2d"
                                    );


                                context.clearRect(
                                    0,
                                    0,
                                    width,
                                    height
                                );


                                context.drawImage(
                                    image,
                                    0,
                                    0,
                                    width,
                                    height
                                );


                                const output =
                                    canvas.toDataURL(
                                        "image/webp",
                                        0.72
                                    );


                                if (
                                    output.length >
                                    450000
                                ) {

                                    reject(
                                        new Error(
                                            "Compressed logo is still too large."
                                        )
                                    );

                                    return;
                                }


                                resolve(
                                    output
                                );
                            };


                        image.onerror =
                            function () {

                                reject(
                                    new Error(
                                        "Unable to load image."
                                    )
                                );
                            };


                        image.src =
                            reader.result;
                    };


                reader.onerror =
                    function () {

                        reject(
                            new Error(
                                "Unable to read image."
                            )
                        );
                    };


                reader.readAsDataURL(
                    file
                );
            }
        );
    }


    function getSavedLogo() {

        try {

            return (
                localStorage.getItem(
                    LOGO_KEY
                ) ||
                ""
            );


        } catch (error) {

            return "";
        }
    }


    function showLogo(
        source
    ) {

        const preview =
            document.getElementById(
                "logoPreview"
            );


        if (!preview) {
            return;
        }


        if (!source) {

            preview.innerHTML =
                "J";

            return;
        }


        preview.innerHTML = `
            <img
                src="${source}"
                alt="Company Logo"
            >
        `;
    }


    /* ==========================================
       THEME
    ========================================== */

    function applyTheme(
        themeName
    ) {

        if (
            window.JufelixTheme &&
            typeof window
                .JufelixTheme
                .apply ===
                "function"
        ) {

            window.JufelixTheme.apply(
                themeName
            );


            return;
        }


        localStorage.setItem(
            THEME_KEY,
            themeName
        );
    }


    /* ==========================================
       USER / BRANCH
    ========================================== */

    function loadUserInformation() {

        const user =
            getCurrentUser();


        const branch =
            readObject(
                "jufelix_v7_active_branch"
            );


        const userElement =
            document.getElementById(
                "settingsCurrentUser"
            );


        const branchElement =
            document.getElementById(
                "settingsActiveBranch"
            );


        if (userElement) {

            userElement.textContent =
                user
                    ? (
                        user.fullName ||
                        user.name ||
                        user.email ||
                        "Administrator"
                    )
                    : "—";
        }


        if (branchElement) {

            branchElement.textContent =
                branch
                    ? (
                        branch.branchName ||
                        branch.name ||
                        "Head Office"
                    )
                    : (
                        user &&
                        user.branchName
                            ? user.branchName
                            : "Head Office"
                    );
        }
    }


    /* ==========================================
       BRANDING
    ========================================== */

    function updateVisibleBranding() {

        document
            .querySelectorAll(
                "[data-company-name]"
            )
            .forEach(
                function (
                    element
                ) {

                    element.textContent =
                        settings.companyName;
                }
            );


        const savedLogo =
            getSavedLogo();


        if (savedLogo) {

            document
                .querySelectorAll(
                    "[data-company-logo]"
                )
                .forEach(
                    function (
                        image
                    ) {

                        if (
                            image.tagName &&
                            image.tagName
                                .toLowerCase() ===
                            "img"
                        ) {

                            image.src =
                                savedLogo;
                        }
                    }
                );
        }
    }


    /* ==========================================
       CURRENCY
    ========================================== */

    function getCurrencySymbol(
        currency
    ) {

        const symbols = {

            GHS:
                "GH₵",

            USD:
                "$",

            EUR:
                "€",

            GBP:
                "£",

            NGN:
                "₦"
        };


        return (
            symbols[
                currency
            ] ||
            currency
        );
    }


    /* ==========================================
       STORAGE
    ========================================== */

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


            return (
                parsed &&
                typeof parsed ===
                    "object" &&
                !Array.isArray(
                    parsed
                )
            )
                ? parsed
                : null;


        } catch (error) {

            return null;
        }
    }


    /* ==========================================
       FORM HELPERS
    ========================================== */

    function getValue(
        id
    ) {

        const element =
            document.getElementById(
                id
            );


        return element
            ? String(
                element.value ||
                ""
            ).trim()
            : "";
    }


    function setValue(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.value =
                value ===
                    undefined ||
                value ===
                    null
                    ? ""
                    : value;
        }
    }


    /* ==========================================
       TOAST
    ========================================== */

    function showToast(
        message,
        type
    ) {

        const existing =
            document.querySelector(
                ".settings-toast"
            );


        if (existing) {

            existing.remove();
        }


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            "settings-toast";


        toast.textContent =
            message;


        Object.assign(
            toast.style,
            {

                position:
                    "fixed",

                left:
                    "18px",

                right:
                    "18px",

                bottom:
                    "25px",

                zIndex:
                    "50000",

                maxWidth:
                    "600px",

                margin:
                    "auto",

                padding:
                    "16px",

                borderRadius:
                    "11px",

                color:
                    "#ffffff",

                fontSize:
                    "16px",

                fontWeight:
                    "700",

                textAlign:
                    "center",

                background:
                    type ===
                    "error"
                        ? "#dc3545"
                        : "#198754",

                boxShadow:
                    "0 8px 25px rgba(0,0,0,.22)"
            }
        );


        document.body.appendChild(
            toast
        );


        window.setTimeout(
            function () {

                toast.remove();
            },
            4000
        );
    }


    /* ==========================================
       PUBLIC API
    ========================================== */

    window.JufelixSettings = {

        save:
            saveAllSettings,

        get:
            function () {

                return {

                    ...settings,

                    logo:
                        getSavedLogo()
                };
            },

        applyTheme:
            applyTheme,

        resetBusinessData:
            resetBusinessData,

        factoryReset:
            factoryReset
    };

})();