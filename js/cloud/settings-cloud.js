/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   SETTINGS CLOUD BRIDGE

   File:
   js/cloud/settings-cloud.js

   + Firestore company settings sync
   + Business logo sync across devices
   + Spark-plan compatible
   + Realtime settings updates
   + Verifies system/company after saving
========================================== */


import {
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* ==========================================
   CONSTANTS
========================================== */

const SETTINGS_KEY =
    "jufelix_v7_settings";

const COMPANY_KEY =
    "jufelix_v7_company";

const LOGO_KEY =
    "jufelix_v7_company_logo";

const THEME_KEY =
    "jufelix_v7_theme";

const COLLECTION_NAME =
    "system";

const DOCUMENT_ID =
    "company";

const MAX_LOGO_LENGTH =
    450000;


/* ==========================================
   STATE
========================================== */

let unsubscribe =
    null;

let started =
    false;


/* ==========================================
   FIREBASE
========================================== */

async function getFirebase() {

    if (
        typeof window
            .waitForJufelixFirebase ===
        "function"
    ) {

        return await window
            .waitForJufelixFirebase({

                requireUser:
                    true,

                timeout:
                    20000
            });
    }


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
                    firebase.app &&
                    firebase.db &&
                    firebase.auth &&
                    firebase.auth.currentUser
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
                            "Firebase Authentication is not ready."
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
   LOCAL STORAGE HELPERS
========================================== */

function readObject(
    key
) {

    try {

        const value =
            localStorage.getItem(
                key
            );


        if (!value) {

            return null;
        }


        const parsed =
            JSON.parse(
                value
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
            "Settings Cloud read error:",
            key,
            error
        );


        return null;
    }
}


function getLocalLogo() {

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


/* ==========================================
   LOGO VALIDATION
========================================== */

function validateLogo(
    logo
) {

    if (!logo) {

        return true;
    }


    if (
        typeof logo !==
        "string"
    ) {

        throw new Error(
            "Invalid company logo."
        );
    }


    if (
        !logo.startsWith(
            "data:image/"
        )
    ) {

        throw new Error(
            "Company logo format is invalid."
        );
    }


    if (
        logo.length >
        MAX_LOGO_LENGTH
    ) {

        throw new Error(
            "Company logo is too large for Firebase synchronization."
        );
    }


    return true;
}


/* ==========================================
   LOCAL SETTINGS
========================================== */

function getLocalSettings() {

    const settings =
        readObject(
            SETTINGS_KEY
        ) ||
        {};


    const company =
        readObject(
            COMPANY_KEY
        ) ||
        {};


    const logo =
        getLocalLogo();


    return {

        ...company,

        ...settings,

        logo:
            logo
    };
}


/* ==========================================
   SAVE SETTINGS TO FIRESTORE
========================================== */

async function saveSettings(
    suppliedSettings
) {

    const firebase =
        await getFirebase();


    const localSettings =
        suppliedSettings &&
        typeof suppliedSettings ===
            "object"
            ? suppliedSettings
            : getLocalSettings();


    const logo =

        localSettings.logo ||

        getLocalLogo() ||

        "";


    if (logo) {

        validateLogo(
            logo
        );
    }


    const cloudData = {

        companyName:
            localSettings.companyName ||
            localSettings.name ||
            "Jufelix Services",

        name:
            localSettings.companyName ||
            localSettings.name ||
            "Jufelix Services",

        phone:
            localSettings.phone ||
            "",

        email:
            localSettings.email ||
            "",

        taxId:
            localSettings.taxId ||
            "",

        address:
            localSettings.address ||
            "",

        currency:
            localSettings.currency ||
            "GHS",

        currencySymbol:
            localSettings.currencySymbol ||
            "GH₵",

        theme:
            localSettings.theme ||
            "jufelix-blue",

        receiptFooter:
            localSettings.receiptFooter ||
            "Thank you for doing business with us.",

        logo:
            logo,

        updatedAt:
            serverTimestamp()
    };


    try {

        const companyRef =
            doc(
                firebase.db,
                COLLECTION_NAME,
                DOCUMENT_ID
            );


        await setDoc(

            companyRef,

            cloudData,

            {
                merge:
                    true
            }
        );


        /* ==================================
           VERIFY FIRESTORE SAVE
        ================================== */

        const verifySnapshot =
            await getDoc(
                companyRef
            );


        if (
            !verifySnapshot.exists()
        ) {

            throw new Error(
                "Firebase reported success, but system/company was not found."
            );
        }


        const verifiedData =
            verifySnapshot.data();


        console.log(
            "✅ VERIFIED: system/company exists in Firebase."
        );


        console.log(
            "Firebase Project:",
            firebase.app.options.projectId
        );


        console.log(
            "Company Cloud Data:",
            verifiedData
        );


        document.dispatchEvent(

            new CustomEvent(
                "jufelix:settings-cloud-saved",
                {
                    detail: {

                        projectId:
                            firebase.app.options.projectId,

                        document:
                            "system/company",

                        data:
                            verifiedData
                    }
                }
            )
        );


        return {

            success:
                true,

            projectId:
                firebase.app.options.projectId,

            document:
                "system/company",

            data:
                verifiedData
        };


    } catch (error) {

        console.error(
            "❌ Settings Firebase sync failed:",
            error
        );


        throw createFriendlyError(
            error
        );
    }
}


/* ==========================================
   APPLY CLOUD SETTINGS LOCALLY
========================================== */

function applyCloudSettings(
    cloudData
) {

    if (
        !cloudData ||
        typeof cloudData !==
            "object"
    ) {

        return;
    }


    const currentSettings =
        readObject(
            SETTINGS_KEY
        ) ||
        {};


    const settings = {

        ...currentSettings,

        companyName:
            cloudData.companyName ||
            cloudData.name ||
            currentSettings.companyName ||
            "Jufelix Services",

        phone:
            cloudData.phone ||
            "",

        email:
            cloudData.email ||
            "",

        taxId:
            cloudData.taxId ||
            "",

        address:
            cloudData.address ||
            "",

        currency:
            cloudData.currency ||
            "GHS",

        currencySymbol:
            cloudData.currencySymbol ||
            "GH₵",

        theme:
            cloudData.theme ||
            "jufelix-blue",

        receiptFooter:
            cloudData.receiptFooter ||
            "Thank you for doing business with us."
    };


    const company = {

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
            settings.theme
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
                company
            )
        );


        localStorage.setItem(
            "companySettings",
            JSON.stringify(
                company
            )
        );


        localStorage.setItem(
            THEME_KEY,
            settings.theme
        );


        if (
            typeof cloudData.logo ===
                "string" &&
            cloudData.logo.startsWith(
                "data:image/"
            )
        ) {

            localStorage.setItem(
                LOGO_KEY,
                cloudData.logo
            );
        }


    } catch (error) {

        console.error(
            "Unable to save cloud settings locally:",
            error
        );
    }


    refreshVisibleBranding(
        settings,
        cloudData.logo ||
        ""
    );


    document.dispatchEvent(

        new CustomEvent(
            "jufelix:settingsChanged",
            {
                detail: {

                    ...settings,

                    logo:
                        cloudData.logo ||
                        getLocalLogo(),

                    source:
                        "cloud"
                }
            }
        )
    );


    document.dispatchEvent(

        new CustomEvent(
            "jufelix:cloud-settings-updated",
            {
                detail: {

                    ...settings,

                    logo:
                        cloudData.logo ||
                        getLocalLogo()
                }
            }
        )
    );
}


/* ==========================================
   VISIBLE BRANDING
========================================== */

function refreshVisibleBranding(
    settings,
    logo
) {

    document
        .querySelectorAll(
            "[data-company-name]"
        )
        .forEach(
            function (
                element
            ) {

                element.textContent =
                    settings.companyName ||
                    "Jufelix Services";
            }
        );


    if (logo) {

        document
            .querySelectorAll(
                "[data-company-logo]"
            )
            .forEach(
                function (
                    element
                ) {

                    if (
                        element.tagName &&
                        element.tagName
                            .toLowerCase() ===
                        "img"
                    ) {

                        element.src =
                            logo;
                    }
                }
            );
    }


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


    const logoPreview =
        document.getElementById(
            "logoPreview"
        );


    if (
        logoPreview &&
        logo
    ) {

        logoPreview.innerHTML = `
            <img
                src="${logo}"
                alt="Company Logo"
            >
        `;
    }
}


/* ==========================================
   REALTIME LISTENER
========================================== */

async function startRealtimeListener() {

    const firebase =
        await getFirebase();


    if (
        typeof unsubscribe ===
        "function"
    ) {

        unsubscribe();

        unsubscribe =
            null;
    }


    const companyRef =
        doc(
            firebase.db,
            COLLECTION_NAME,
            DOCUMENT_ID
        );


    const snapshot =
        await getDoc(
            companyRef
        );


    if (
        snapshot.exists()
    ) {

        applyCloudSettings(
            snapshot.data()
        );


        console.log(
            "☁️ Initial company settings loaded."
        );
    }


    unsubscribe =
        onSnapshot(

            companyRef,

            function (
                documentSnapshot
            ) {

                if (
                    !documentSnapshot.exists()
                ) {

                    console.log(
                        "Cloud company document does not exist yet."
                    );

                    return;
                }


                applyCloudSettings(
                    documentSnapshot.data()
                );


                console.log(
                    "☁️ Company settings received from Firebase."
                );
            },


            function (
                error
            ) {

                console.error(
                    "❌ Settings realtime listener failed:",
                    error
                );
            }
        );
}


/* ==========================================
   MANUAL VERIFY
========================================== */

async function verifyCompanyDocument() {

    const firebase =
        await getFirebase();


    const companyRef =
        doc(
            firebase.db,
            COLLECTION_NAME,
            DOCUMENT_ID
        );


    const snapshot =
        await getDoc(
            companyRef
        );


    return {

        exists:
            snapshot.exists(),

        projectId:
            firebase.app.options.projectId,

        data:
            snapshot.exists()
                ? snapshot.data()
                : null
    };
}


/* ==========================================
   FRIENDLY ERROR
========================================== */

function createFriendlyError(
    error
) {

    const code =
        String(
            error &&
            error.code ||
            ""
        );


    const message =
        String(
            error &&
            error.message ||
            ""
        );


    if (
        code.includes(
            "permission-denied"
        ) ||
        message
            .toLowerCase()
            .includes(
                "insufficient permissions"
            )
    ) {

        return new Error(
            "Firebase rejected the company settings update because this user does not have permission."
        );
    }


    if (
        code.includes(
            "unauthenticated"
        )
    ) {

        return new Error(
            "Firebase Authentication is not signed in."
        );
    }


    if (
        code.includes(
            "resource-exhausted"
        )
    ) {

        return new Error(
            "The company settings or logo are too large for Firebase."
        );
    }


    return error instanceof Error
        ? error
        : new Error(
            message ||
            "Settings synchronization failed."
        );
}


/* ==========================================
   PUBLIC API
========================================== */

window.JufelixSettingsCloud = {

    save:
        saveSettings,

    refresh:
        startRealtimeListener,

    verify:
        verifyCompanyDocument,

    getLocalSettings:
        getLocalSettings
};


/* ==========================================
   START
========================================== */

async function startSettingsCloud() {

    if (started) {

        return;
    }


    started =
        true;


    try {

        const firebase =
            await getFirebase();


        console.log(
            "Settings Cloud Project:",
            firebase.app.options.projectId
        );


        await startRealtimeListener();


        console.log(
            "✅ Jufelix Settings Cloud ready."
        );


        document.dispatchEvent(

            new CustomEvent(
                "jufelix:settings-cloud-ready",
                {
                    detail: {

                        projectId:
                            firebase.app.options.projectId
                    }
                }
            )
        );


    } catch (error) {

        console.error(
            "❌ Settings Cloud startup failed:",
            error
        );
    }
}


startSettingsCloud();