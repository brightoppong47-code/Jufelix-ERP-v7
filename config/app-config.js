/* =========================================
   JUFELIX ERP APPLICATION CONFIGURATION
========================================= */

window.JUFELIX_CONFIG = {
    appName: "Jufelix ERP",
    fullName: "Jufelix ERP v7.0 Professional",
    version: "7.0.0",

    companyName: "Jufelix Services",

    currency: {
        code: "GHS",
        symbol: "GH₵",
        name: "Ghana Cedi"
    },

    locale: "en-GH",

    storagePrefix: "jufelix_v7_",

    databaseMode: "local",

    defaultLowStockLevel: 5,

    features: {
        branches: true,
        inventory: true,
        sales: true,
        purchases: true,
        transfers: true,
        customers: true,
        suppliers: true,
        expenses: true,
        reports: true,
        userRoles: true,
        firebase: false
    }
};