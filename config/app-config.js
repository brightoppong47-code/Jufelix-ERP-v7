/* =========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   APPLICATION CONFIGURATION

   Production Build: 1204

   File:
   config/app-config.js
========================================= */

window.JUFELIX_CONFIG = {

    /* =====================================
       APPLICATION
    ====================================== */

    appName:
        "Jufelix ERP",

    fullName:
        "Jufelix ERP v7.0 Professional",

    version:
        "7.0.0",

    build:
        "1204",

    environment:
        "production",


    /* =====================================
       COMPANY
    ====================================== */

    companyName:
        "Jufelix Services",


    /* =====================================
       CURRENCY
    ====================================== */

    currency: {

        code:
            "GHS",

        symbol:
            "GH₵",

        name:
            "Ghana Cedi"
    },


    /* =====================================
       LOCALIZATION
    ====================================== */

    locale:
        "en-GH",


    /* =====================================
       STORAGE
    ====================================== */

    storagePrefix:
        "jufelix_v7_",


    /*
     * Keep this as "local" for now.
     *
     * The individual cloud bridges already
     * synchronize local ERP data with Firebase.
     *
     * We will verify app.js before changing
     * this setting.
     */

    databaseMode:
        "local",


    /* =====================================
       INVENTORY
    ====================================== */

    defaultLowStockLevel:
        5,


    /* =====================================
       FEATURES
    ====================================== */

    features: {

        branches:
            true,

        inventory:
            true,

        sales:
            true,

        purchases:
            true,

        transfers:
            true,

        customers:
            true,

        suppliers:
            true,

        expenses:
            true,

        reports:
            true,

        userRoles:
            true,

        firebase:
            true,

        offlineMode:
            true,

        pwa:
            true
    }
};