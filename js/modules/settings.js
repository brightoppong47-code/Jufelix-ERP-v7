/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   SETTINGS MODULE - COMPRESSED LOGO VERSION

   File:
   js/modules/settings.js
========================================== */

(function () {
    "use strict";

    const SETTINGS_KEY =
        "jufelix_v7_settings";

    const COMPANY_KEY =
        "jufelix_v7_company";

    const LOGO_KEY =
        "jufelix_v7_company_logo";

    const THEME_KEY =
        "jufelix_v7_theme";

    let settings = {};


    document.addEventListener(
        "DOMContentLoaded",
        initializeSettings
    );


    /* ==========================================
       INITIALIZE
    ========================================== */

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

        console.log(
            "Jufelix Settings initialized."
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
    }


    /* ==========================================
       SAVE SETTINGS
    ========================================== */

    function saveAllSettings() {

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


            /*
             * Keep old compatibility data,
             * but WITHOUT duplicating the logo.
             */

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


            /*
             * Refresh sidebar immediately.
             */

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
                "Settings saved successfully.",
                "success"
            );

        } catch (error) {

            console.error(
                "Settings save failed:",
                error
            );


            showToast(
                "Settings could not be saved.",
                "error"
            );
        }
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

                const company =
                    JSON.parse(
                        companyStored
                    );


                return {
                    ...defaults,
                    ...company
                };
            }


            return defaults;

        } catch (error) {

            console.error(
                "Unable to load settings:",
                error
            );


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
                "Logo ready. Tap Save Settings.",
                "success"
            );

        } catch (error) {

            console.error(
                "Logo processing failed:",
                error
            );


            showToast(
                "Logo could not be saved. Try a smaller image.",
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
                                    width >
                                    height
                                ) {

                                    if (
                                        width >
                                        maxSize
                                    ) {

                                        height =
                                            Math.round(
                                                height *
                                                maxSize /
                                                width
                                            );

                                        width =
                                            maxSize;
                                    }

                                } else {

                                    if (
                                        height >
                                        maxSize
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
                                }


                                const canvas =
                                    document
                                        .createElement(
                                            "canvas"
                                        );


                                canvas.width =
                                    width;

                                canvas.height =
                                    height;


                                const context =
                                    canvas
                                        .getContext(
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
                                        0.78
                                    );


                                if (
                                    output.length >
                                    700000
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
            readObject(
                "jufelix_v7_current_user"
            ) ||
            readObject(
                "currentUser"
            );


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
                function (element) {

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
            3500
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
            applyTheme
    };

})();