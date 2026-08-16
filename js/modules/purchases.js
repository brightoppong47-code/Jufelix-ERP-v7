/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   PURCHASES MODULE

   + Branch-Aware Stock
   + Supplier Accounts
   + Paid / Partial / Credit
   + Amount Paid / Amount Due
   + Stock Ledger
   + Firebase Cloud Sync
   + Mobile-Friendly Selects
   + Reliable Save Purchase Button

   File:
   js/modules/purchases.js
========================================== */

(function () {
    "use strict";


    /* ==========================================
       STORAGE KEYS
    ========================================== */

    const PRODUCTS_KEY =
        "jufelix_products";

    const PURCHASES_KEY =
        "jufelix_v7_purchases";

    const BRANCHES_KEY =
        "jufelix_v7_branches";

    const SUPPLIERS_KEY =
        "jufelix_v7_suppliers";

    const ACTIVE_BRANCH_KEY =
        "jufelix_v7_active_branch";

    const CURRENT_USER_KEY =
        "jufelix_v7_current_user";

    const LEDGER_KEY =
        "jufelix_stock_ledger";

    const DEFAULT_BRANCH_ID =
        "head-office";


    /* ==========================================
       STATE
    ========================================== */

    let products = [];
    let purchases = [];
    let branches = [];
    let suppliers = [];

    let saveInProgress = false;

    const el = {};


    document.addEventListener(
        "DOMContentLoaded",
        initializePurchases
    );


    /* ==========================================
       INITIALIZE
    ========================================== */

    function initializePurchases() {

        cacheElements();


        if (!el.form) {

            console.error(
                "Purchase form was not found."
            );

            return;
        }


        /*
         * IMPORTANT
         *
         * We use our own JavaScript validation.
         * Native browser validation can fail
         * silently because our real select
         * elements are hidden on mobile.
         */
        el.form.noValidate = true;


        loadData();

        ensureHeadOffice();

        populateBranches();

        populateSuppliers();

        populateProducts();

        installMobileSelectMenus();

        connectEvents();

        prepareNewPurchase();

        refreshPurchases();


        console.log(
            "✅ Jufelix Purchases module loaded."
        );
    }


    /* ==========================================
       CACHE ELEMENTS
    ========================================== */

    function cacheElements() {

        el.form =
            document.getElementById(
                "purchaseForm"
            );

        el.number =
            document.getElementById(
                "purchaseNo"
            );

        el.date =
            document.getElementById(
                "purchaseDate"
            );

        el.branch =
            document.getElementById(
                "purchaseBranch"
            );

        el.supplier =
            document.getElementById(
                "purchaseSupplier"
            );

        el.customSupplierGroup =
            document.getElementById(
                "customSupplierGroup"
            );

        el.customSupplier =
            document.getElementById(
                "customSupplierName"
            );

        el.product =
            document.getElementById(
                "purchaseProduct"
            );

        el.status =
            document.getElementById(
                "purchaseStatus"
            );

        el.quantity =
            document.getElementById(
                "purchaseQty"
            );

        el.cost =
            document.getElementById(
                "purchaseCost"
            );

        el.total =
            document.getElementById(
                "purchaseTotal"
            );

        el.reference =
            document.getElementById(
                "purchaseReference"
            );


        /* ======================================
           PAYMENT
        ====================================== */

        el.paymentStatus =
            document.getElementById(
                "purchasePaymentStatus"
            );

        el.paymentMethod =
            document.getElementById(
                "purchasePaymentMethod"
            );

        el.amountPaid =
            document.getElementById(
                "purchaseAmountPaid"
            );

        el.amountDue =
            document.getElementById(
                "purchaseAmountDue"
            );

        el.paymentSummary =
            document.getElementById(
                "purchasePaymentSummary"
            );


        /* ======================================
           FILTERS / HISTORY
        ====================================== */

        el.search =
            document.getElementById(
                "purchaseSearch"
            );

        el.statusFilter =
            document.getElementById(
                "purchaseStatusFilter"
            );

        el.dateFilter =
            document.getElementById(
                "purchaseDateFilter"
            );

        el.tableBody =
            document.getElementById(
                "purchaseTableBody"
            );

        el.resetButton =
            document.getElementById(
                "resetPurchaseButton"
            );

        el.saveButton =
            document.getElementById(
                "savePurchaseButton"
            );
    }


    /* ==========================================
       EVENTS
    ========================================== */

    function connectEvents() {

        /*
         * Keyboard / normal form submit.
         */
        el.form.addEventListener(
            "submit",
            savePurchase
        );


        /*
         * RELIABLE MOBILE SAVE BUTTON
         *
         * We prevent the browser's normal
         * submission and call our save function
         * directly.
         */
        if (el.saveButton) {

            el.saveButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    savePurchase(
                        event
                    );
                }
            );
        }


        if (el.product) {

            el.product.addEventListener(
                "change",
                onProductChanged
            );
        }


        if (el.supplier) {

            el.supplier.addEventListener(
                "change",
                onSupplierChanged
            );
        }


        if (el.quantity) {

            el.quantity.addEventListener(
                "input",
                calculateTotal
            );

            el.quantity.addEventListener(
                "change",
                calculateTotal
            );
        }


        if (el.cost) {

            el.cost.addEventListener(
                "input",
                calculateTotal
            );

            el.cost.addEventListener(
                "change",
                calculateTotal
            );
        }


        /* ======================================
           PAYMENT EVENTS
        ====================================== */

        if (el.paymentStatus) {

            el.paymentStatus.addEventListener(
                "change",
                onPaymentStatusChanged
            );
        }


        if (el.amountPaid) {

            el.amountPaid.addEventListener(
                "input",
                calculatePayment
            );

            el.amountPaid.addEventListener(
                "change",
                calculatePayment
            );
        }


        if (el.search) {

            el.search.addEventListener(
                "input",
                displayPurchases
            );
        }


        if (el.statusFilter) {

            el.statusFilter.addEventListener(
                "change",
                displayPurchases
            );
        }


        if (el.dateFilter) {

            el.dateFilter.addEventListener(
                "change",
                displayPurchases
            );
        }


        if (el.resetButton) {

            el.resetButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    prepareNewPurchase(
                        true
                    );
                }
            );
        }


        /* ======================================
           OTHER TAB / WINDOW CHANGES
        ====================================== */

        window.addEventListener(
            "storage",
            function (event) {

                if (
                    [
                        PRODUCTS_KEY,
                        PURCHASES_KEY,
                        BRANCHES_KEY,
                        SUPPLIERS_KEY
                    ].includes(
                        event.key
                    )
                ) {

                    loadData();

                    ensureHeadOffice();

                    populateBranches();

                    populateSuppliers();

                    populateProducts();

                    refreshPurchases();
                }
            }
        );


        document.addEventListener(
            "jufelix:data-updated",
            function (event) {

                const key =
                    event &&
                    event.detail
                        ? event.detail.key
                        : "";


                if (
                    !key ||
                    key === SUPPLIERS_KEY
                ) {

                    suppliers =
                        readArray(
                            SUPPLIERS_KEY
                        );
                }
            }
        );
    }


    /* ==========================================
       DATA
    ========================================== */

    function loadData() {

        products =
            readArray(
                PRODUCTS_KEY
            );

        purchases =
            readArray(
                PURCHASES_KEY
            );

        branches =
            readArray(
                BRANCHES_KEY
            );

        suppliers =
            readArray(
                SUPPLIERS_KEY
            );
    }


    /* ==========================================
       HEAD OFFICE
    ========================================== */

    function ensureHeadOffice() {

        const exists =
            branches.some(
                function (branch) {

                    return (
                        String(
                            branch.id
                        ) ===
                            DEFAULT_BRANCH_ID ||

                        branch.isHeadOffice ===
                            true ||

                        String(
                            branch.type ||
                            ""
                        )
                            .toLowerCase() ===
                            "head-office"
                    );
                }
            );


        if (!exists) {

            branches.unshift({

                id:
                    DEFAULT_BRANCH_ID,

                name:
                    "Head Office",

                branchName:
                    "Head Office",

                code:
                    "HO",

                status:
                    "active",

                type:
                    "head-office",

                isHeadOffice:
                    true
            });


            writeArray(
                BRANCHES_KEY,
                branches
            );
        }
    }


    /* ==========================================
       BRANCH DROPDOWN
    ========================================== */

    function populateBranches() {

        if (!el.branch) {
            return;
        }


        const previousValue =
            el.branch.value;


        const activeBranches =
            branches.filter(
                function (branch) {

                    return (
                        String(
                            branch.status ||
                            "active"
                        )
                            .toLowerCase() ===
                        "active"
                    );
                }
            );


        el.branch.innerHTML =
            '<option value="">Select branch</option>' +

            activeBranches
                .map(
                    function (branch) {

                        return `
                            <option value="${escapeHTML(
                                branch.id
                            )}">
                                ${escapeHTML(
                                    getBranchName(
                                        branch
                                    )
                                )}
                            </option>
                        `;
                    }
                )
                .join("");


        const preferredBranchId =
            getPreferredBranchId();


        const valueToUse =
            previousValue ||
            preferredBranchId;


        if (
            activeBranches.some(
                function (branch) {

                    return (
                        String(
                            branch.id
                        ) ===
                        String(
                            valueToUse
                        )
                    );
                }
            )
        ) {

            el.branch.value =
                valueToUse;
        }


        refreshMobileSelectButton(
            el.branch
        );
    }


    function getPreferredBranchId() {

        const currentUser =
            readObject(
                CURRENT_USER_KEY
            ) ||
            readObject(
                "currentUser"
            );


        if (
            currentUser &&
            currentUser.branchId &&
            normalizeRole(
                currentUser.role
            ) !==
                "admin"
        ) {

            return String(
                currentUser.branchId
            );
        }


        const activeBranch =
            readObject(
                ACTIVE_BRANCH_KEY
            );


        if (
            activeBranch &&
            activeBranch.id
        ) {

            return String(
                activeBranch.id
            );
        }


        return DEFAULT_BRANCH_ID;
    }


    /* ==========================================
       SUPPLIERS
    ========================================== */

    function populateSuppliers() {

        if (!el.supplier) {
            return;
        }


        const previousValue =
            el.supplier.value;


        suppliers =
            readArray(
                SUPPLIERS_KEY
            );


        const activeSuppliers =
            suppliers
                .filter(
                    function (supplier) {

                        return (
                            String(
                                supplier.status ||
                                "active"
                            )
                                .toLowerCase() ===
                            "active"
                        );
                    }
                )
                .sort(
                    function (
                        first,
                        second
                    ) {

                        return String(
                            first.name ||
                            ""
                        ).localeCompare(
                            String(
                                second.name ||
                                ""
                            )
                        );
                    }
                );


        el.supplier.innerHTML =
            '<option value="">Select supplier</option>' +

            activeSuppliers
                .map(
                    function (supplier) {

                        return `
                            <option value="${escapeHTML(
                                supplier.id
                            )}">
                                ${escapeHTML(
                                    supplier.name ||
                                    "Unnamed Supplier"
                                )}
                            </option>
                        `;
                    }
                )
                .join("") +

            '<option value="other">Other / Type supplier name</option>';


        if (
            activeSuppliers.some(
                function (supplier) {

                    return (
                        String(
                            supplier.id
                        ) ===
                        String(
                            previousValue
                        )
                    );
                }
            ) ||
            previousValue ===
                "other"
        ) {

            el.supplier.value =
                previousValue;
        }


        onSupplierChanged();


        refreshMobileSelectButton(
            el.supplier
        );
    }


    function onSupplierChanged() {

        if (
            !el.customSupplierGroup ||
            !el.customSupplier
        ) {
            return;
        }


        const isCustom =
            el.supplier.value ===
            "other";


        el.customSupplierGroup.hidden =
            !isCustom;


        /*
         * We do our own validation.
         */
        el.customSupplier.required =
            false;


        if (!isCustom) {

            el.customSupplier.value =
                "";
        }
    }


    /* ==========================================
       PRODUCTS
    ========================================== */

    function populateProducts() {

        if (!el.product) {
            return;
        }


        const previousValue =
            el.product.value;


        products =
            readArray(
                PRODUCTS_KEY
            );


        const sortedProducts =
            products
                .slice()
                .sort(
                    function (
                        first,
                        second
                    ) {

                        return String(
                            first.name ||
                            ""
                        ).localeCompare(
                            String(
                                second.name ||
                                ""
                            )
                        );
                    }
                );


        el.product.innerHTML =
            '<option value="">Select product</option>' +

            sortedProducts
                .map(
                    function (product) {

                        return `
                            <option value="${escapeHTML(
                                product.id
                            )}">
                                ${escapeHTML(
                                    product.name ||
                                    "Unnamed Product"
                                )}
                            </option>
                        `;
                    }
                )
                .join("");


        if (
            sortedProducts.some(
                function (product) {

                    return (
                        String(
                            product.id
                        ) ===
                        String(
                            previousValue
                        )
                    );
                }
            )
        ) {

            el.product.value =
                previousValue;
        }


        refreshMobileSelectButton(
            el.product
        );
    }


    function onProductChanged() {

        const product =
            getSelectedProduct();


        if (product) {

            el.cost.value =
                toNumber(
                    product.costPrice
                ).toFixed(2);

        } else {

            el.cost.value =
                "";
        }


        calculateTotal();
    }


    /* ==========================================
       PURCHASE TOTAL
    ========================================== */

    function calculateTotal() {

        const quantity =
            parseNumericValue(
                el.quantity
                    ? el.quantity.value
                    : ""
            );


        const cost =
            parseNumericValue(
                el.cost
                    ? el.cost.value
                    : ""
            );


        const total =
            quantity *
            cost;


        if (el.total) {

            el.total.value =
                total.toFixed(2);
        }


        calculatePayment();
    }


    /* ==========================================
       PAYMENT STATUS
    ========================================== */

    function onPaymentStatusChanged() {

        const paymentStatus =
            getPaymentStatus();


        const total =
            getCurrentPurchaseTotal();


        if (!el.amountPaid) {

            calculatePayment();

            return;
        }


        if (
            paymentStatus ===
            "paid"
        ) {

            el.amountPaid.readOnly =
                true;

            el.amountPaid.value =
                total.toFixed(2);

        } else if (
            paymentStatus ===
            "credit"
        ) {

            el.amountPaid.readOnly =
                true;

            el.amountPaid.value =
                "0.00";

        } else {

            el.amountPaid.readOnly =
                false;


            const currentPaid =
                parseNumericValue(
                    el.amountPaid.value
                );


            if (
                currentPaid >=
                total
            ) {

                el.amountPaid.value =
                    "";
            }
        }


        calculatePayment();


        refreshMobileSelectButton(
            el.paymentStatus
        );
    }


    /* ==========================================
       PAYMENT CALCULATION
    ========================================== */

    function calculatePayment() {

        const total =
            getCurrentPurchaseTotal();


        const paymentStatus =
            getPaymentStatus();


        let amountPaid =
            parseNumericValue(
                el.amountPaid
                    ? el.amountPaid.value
                    : 0
            );


        if (
            paymentStatus ===
            "paid"
        ) {

            amountPaid =
                total;


            if (el.amountPaid) {

                el.amountPaid.value =
                    total.toFixed(2);

                el.amountPaid.readOnly =
                    true;
            }

        } else if (
            paymentStatus ===
            "credit"
        ) {

            amountPaid =
                0;


            if (el.amountPaid) {

                el.amountPaid.value =
                    "0.00";

                el.amountPaid.readOnly =
                    true;
            }

        } else {

            if (el.amountPaid) {

                el.amountPaid.readOnly =
                    false;
            }


            amountPaid =
                Math.max(
                    0,
                    amountPaid
                );
        }


        const amountDue =
            Math.max(
                0,
                total -
                amountPaid
            );


        if (el.amountDue) {

            el.amountDue.value =
                amountDue.toFixed(2);
        }


        if (el.paymentSummary) {

            if (
                String(
                    el.status
                        ? el.status.value
                        : "received"
                ).toLowerCase() ===
                "draft"
            ) {

                el.paymentSummary.textContent =
                    "Draft purchase: supplier account will not change yet.";

            } else {

                el.paymentSummary.textContent =
                    "Supplier balance change: " +
                    formatMoney(
                        amountDue
                    );
            }
        }
    }


    function getCurrentPurchaseTotal() {

        return parseNumericValue(
            el.total
                ? el.total.value
                : 0
        );
    }


    function getPaymentStatus() {

        return String(
            el.paymentStatus
                ? (
                    el.paymentStatus.value ||
                    "paid"
                )
                : "paid"
        )
            .trim()
            .toLowerCase();
    }


    /* ==========================================
       SAVE PURCHASE
    ========================================== */

    function savePurchase(
        event
    ) {

        if (event) {

            event.preventDefault();

            if (
                typeof event.stopPropagation ===
                "function"
            ) {

                event.stopPropagation();
            }
        }


        /*
         * Prevent accidental double-save.
         */
        if (saveInProgress) {

            return;
        }


        console.log(
            "💾 Save Purchase clicked."
        );


        loadData();

        ensureHeadOffice();


        const product =
            getSelectedProduct();


        const branch =
            getSelectedBranch();


        const supplierData =
            getSelectedSupplier();


        const quantity =
            parseNumericValue(
                el.quantity
                    ? el.quantity.value
                    : ""
            );


        const costPrice =
            parseNumericValue(
                el.cost
                    ? el.cost.value
                    : ""
            );


        const total =
            quantity *
            costPrice;


        const status =
            String(
                el.status
                    ? (
                        el.status.value ||
                        "received"
                    )
                    : "received"
            )
                .trim()
                .toLowerCase();


        const paymentStatus =
            getPaymentStatus();


        let amountPaid =
            parseNumericValue(
                el.amountPaid
                    ? el.amountPaid.value
                    : 0
            );


        let paymentMethod =
            String(
                el.paymentMethod
                    ? (
                        el.paymentMethod.value ||
                        "Cash"
                    )
                    : "Cash"
            ).trim();


        /* ======================================
           BASIC VALIDATION
        ====================================== */

        if (
            !el.date ||
            !el.date.value
        ) {

            showToast(
                "Select a purchase date.",
                "error"
            );

            return;
        }


        if (!branch) {

            showToast(
                "Select the receiving branch.",
                "error"
            );

            return;
        }


        if (!supplierData.name) {

            showToast(
                "Select or enter a supplier.",
                "error"
            );

            return;
        }


        if (!product) {

            showToast(
                "Select a product.",
                "error"
            );

            return;
        }


        if (
            quantity <=
            0
        ) {

            showToast(
                "Enter a valid quantity.",
                "error"
            );

            return;
        }


        if (
            costPrice <
            0
        ) {

            showToast(
                "Enter a valid cost price.",
                "error"
            );

            return;
        }


        if (
            total <=
            0
        ) {

            showToast(
                "Purchase total must be greater than zero.",
                "error"
            );

            return;
        }


        /* ======================================
           PAYMENT VALIDATION
        ====================================== */

        if (
            paymentStatus ===
            "paid"
        ) {

            amountPaid =
                total;
        }


        if (
            paymentStatus ===
            "credit"
        ) {

            amountPaid =
                0;

            paymentMethod =
                "Credit";
        }


        if (
            amountPaid <
            0
        ) {

            showToast(
                "Amount paid cannot be negative.",
                "error"
            );

            return;
        }


        if (
            amountPaid >
            total
        ) {

            showToast(
                "Amount paid cannot be greater than the purchase total.",
                "error"
            );

            return;
        }


        if (
            paymentStatus ===
                "partial" &&
            amountPaid <=
                0
        ) {

            showToast(
                "Enter the amount already paid to the supplier.",
                "error"
            );

            return;
        }


        if (
            paymentStatus ===
                "partial" &&
            amountPaid >=
                total
        ) {

            showToast(
                "For Partly Paid, amount paid must be less than the total cost.",
                "error"
            );

            return;
        }


        if (
            status ===
                "received" &&
            (
                paymentStatus ===
                    "credit" ||
                paymentStatus ===
                    "partial"
            ) &&
            !supplierData.id
        ) {

            showToast(
                "Credit or partly-paid purchases require a registered supplier. Add the supplier first.",
                "error"
            );

            return;
        }


        const amountDue =
            Math.max(
                0,
                total -
                amountPaid
            );


        saveInProgress =
            true;


        setSaveButtonState(
            true
        );


        const oldProducts =
            readArray(
                PRODUCTS_KEY
            );


        const oldPurchases =
            readArray(
                PURCHASES_KEY
            );


        const oldLedger =
            readArray(
                LEDGER_KEY
            );


        const oldSuppliers =
            readArray(
                SUPPLIERS_KEY
            );


        try {

            const purchaseNumber =
                generatePurchaseNumber();


            const now =
                new Date()
                    .toISOString();


            const purchase = {

                id:
                    "purchase-" +
                    Date.now() +
                    "-" +
                    Math.random()
                        .toString(36)
                        .slice(2, 7),


                purchaseNo:
                    purchaseNumber,

                purchaseNumber:
                    purchaseNumber,


                date:
                    el.date.value,

                purchaseDate:
                    el.date.value,


                branchId:
                    String(
                        branch.id
                    ),

                branchName:
                    getBranchName(
                        branch
                    ),


                supplierId:
                    supplierData.id,

                supplier:
                    supplierData.name,

                supplierName:
                    supplierData.name,


                productId:
                    String(
                        product.id
                    ),

                productName:
                    product.name ||
                    "Unnamed Product",


                quantity:
                    quantity,

                costPrice:
                    costPrice,


                total:
                    total,

                totalCost:
                    total,

                amount:
                    total,


                paymentStatus:
                    paymentStatus,

                paymentMethod:
                    paymentMethod,

                amountPaid:
                    amountPaid,

                paidAmount:
                    amountPaid,

                amountDue:
                    amountDue,

                balanceDue:
                    amountDue,


                reference:
                    String(
                        el.reference
                            ? el.reference.value
                            : ""
                    ).trim(),


                status:
                    status,


                createdAt:
                    now,

                updatedAt:
                    now
            };


            /* ==================================
               RECEIVED = STOCK
            ================================== */

            if (
                status ===
                "received"
            ) {

                receiveStock(
                    product,
                    branch.id,
                    quantity,
                    costPrice,
                    purchase
                );
            }


            purchases =
                readArray(
                    PURCHASES_KEY
                );


            purchases.push(
                purchase
            );


            writeArray(
                PURCHASES_KEY,
                purchases
            );


            /* ==================================
               SUPPLIER ACCOUNT
            ================================== */

            if (
                status ===
                    "received" &&
                supplierData.id
            ) {

                const supplierUpdated =
                    updateSupplierAccount(
                        supplierData.id,
                        purchase
                    );


                if (!supplierUpdated) {

                    throw new Error(
                        "Supplier account could not be updated."
                    );
                }
            }


            notifyDataChanged(
                purchase
            );


            /* ==================================
               FIREBASE CLOUD SYNC
            ================================== */

            syncPurchaseToCloud(
                purchase,
                product,
                supplierData,
                status
            );


            /* ==================================
               SUCCESS MESSAGE
            ================================== */

            if (
                status ===
                "received"
            ) {

                if (
                    amountDue >
                    0
                ) {

                    showToast(
                        "Purchase saved. Stock increased and supplier balance updated.",
                        "success"
                    );

                } else {

                    showToast(
                        "Purchase saved and branch stock increased.",
                        "success"
                    );
                }

            } else {

                showToast(
                    "Draft purchase saved. Stock and supplier balance were not changed.",
                    "success"
                );
            }


            prepareNewPurchase(
                true
            );


            loadData();

            refreshPurchases();


            console.log(
                "✅ Purchase saved locally:",
                purchase.purchaseNo
            );


        } catch (error) {

            console.error(
                "❌ Purchase save error:",
                error
            );


            /*
             * Restore data if local transaction
             * failed.
             */
            writeArray(
                PRODUCTS_KEY,
                oldProducts
            );


            writeArray(
                PURCHASES_KEY,
                oldPurchases
            );


            writeArray(
                LEDGER_KEY,
                oldLedger
            );


            writeArray(
                SUPPLIERS_KEY,
                oldSuppliers
            );


            products =
                oldProducts;

            purchases =
                oldPurchases;

            suppliers =
                oldSuppliers;


            showToast(
                error.message ||
                "Purchase could not be saved.",
                "error"
            );


        } finally {

            saveInProgress =
                false;


            setSaveButtonState(
                false
            );
        }
    }


    /* ==========================================
       FIREBASE PURCHASE SYNC
    ========================================== */

    function syncPurchaseToCloud(
        purchase,
        product,
        supplierData,
        status
    ) {

        if (
            !window.JufelixPurchasesCloud
        ) {

            console.warn(
                "⚠️ Purchases Cloud API is not ready. Purchase remains saved locally."
            );

            return;
        }


        const cloudTasks = [];


        try {

            if (
                typeof window
                    .JufelixPurchasesCloud
                    .savePurchase ===
                "function"
            ) {

                cloudTasks.push(
                    window
                        .JufelixPurchasesCloud
                        .savePurchase(
                            purchase
                        )
                );
            }


            /* ==================================
               UPDATED PRODUCT STOCK
            ================================== */

            if (
                status ===
                "received" &&
                typeof window
                    .JufelixPurchasesCloud
                    .saveProduct ===
                "function"
            ) {

                const updatedProducts =
                    readArray(
                        PRODUCTS_KEY
                    );


                const updatedProduct =
                    updatedProducts.find(
                        function (item) {

                            return (
                                String(
                                    item.id
                                ) ===
                                String(
                                    product.id
                                )
                            );
                        }
                    );


                if (updatedProduct) {

                    cloudTasks.push(
                        window
                            .JufelixPurchasesCloud
                            .saveProduct(
                                updatedProduct
                            )
                    );
                }
            }


            /* ==================================
               UPDATED SUPPLIER
            ================================== */

            if (
                status ===
                    "received" &&
                supplierData.id &&
                typeof window
                    .JufelixPurchasesCloud
                    .saveSupplier ===
                    "function"
            ) {

                const updatedSuppliers =
                    readArray(
                        SUPPLIERS_KEY
                    );


                const updatedSupplier =
                    updatedSuppliers.find(
                        function (item) {

                            return (
                                String(
                                    item.id
                                ) ===
                                String(
                                    supplierData.id
                                )
                            );
                        }
                    );


                if (updatedSupplier) {

                    cloudTasks.push(
                        window
                            .JufelixPurchasesCloud
                            .saveSupplier(
                                updatedSupplier
                            )
                    );
                }
            }


            if (
                cloudTasks.length ===
                0
            ) {

                return;
            }


            Promise.all(
                cloudTasks
            )
                .then(
                    function () {

                        console.log(
                            "✅ Purchase, stock and supplier synced successfully to Firebase."
                        );
                    }
                )
                .catch(
                    function (error) {

                        console.error(
                            "❌ Purchase Firebase sync failed:",
                            error
                        );


                        /*
                         * Do NOT delete local purchase.
                         * Cloud sync can retry later.
                         */
                        showToast(
                            "Purchase saved locally. Firebase sync will retry.",
                            "error"
                        );
                    }
                );


        } catch (error) {

            console.error(
                "❌ Firebase purchase sync setup failed:",
                error
            );
        }
    }


    /* ==========================================
       UPDATE SUPPLIER ACCOUNT
    ========================================== */

    function updateSupplierAccount(
        supplierId,
        purchase
    ) {

        if (
            window.JufelixSuppliers &&
            typeof window
                .JufelixSuppliers
                .recordPurchase ===
                "function"
        ) {

            const result =
                window
                    .JufelixSuppliers
                    .recordPurchase(
                        supplierId,
                        {
                            amount:
                                purchase.total,

                            paidAmount:
                                purchase.amountPaid,

                            date:
                                purchase.date,

                            purchaseNo:
                                purchase.purchaseNo,

                            purchaseNumber:
                                purchase.purchaseNumber
                        }
                    );


            if (
                result ===
                false
            ) {

                return false;
            }


            suppliers =
                readArray(
                    SUPPLIERS_KEY
                );


            return true;
        }


        suppliers =
            readArray(
                SUPPLIERS_KEY
            );


        const supplierIndex =
            suppliers.findIndex(
                function (supplier) {

                    return (
                        String(
                            supplier.id
                        ) ===
                        String(
                            supplierId
                        )
                    );
                }
            );


        if (
            supplierIndex ===
            -1
        ) {

            return false;
        }


        const supplier =
            suppliers[
                supplierIndex
            ];


        supplier.totalPurchases =
            toNumber(
                supplier.totalPurchases
            ) +
            toNumber(
                purchase.total
            );


        supplier.totalPaid =
            toNumber(
                supplier.totalPaid
            ) +
            toNumber(
                purchase.amountPaid
            );


        supplier.balance =
            toNumber(
                supplier.balance
            ) +
            toNumber(
                purchase.amountDue
            );


        supplier.lastPurchaseDate =
            purchase.date;


        supplier.lastPurchaseNumber =
            purchase.purchaseNo;


        supplier.updatedAt =
            new Date()
                .toISOString();


        writeArray(
            SUPPLIERS_KEY,
            suppliers
        );


        return true;
    }


    /* ==========================================
       RECEIVE STOCK
    ========================================== */

    function receiveStock(
        product,
        branchId,
        quantity,
        costPrice,
        purchase
    ) {

        products =
            readArray(
                PRODUCTS_KEY
            );


        const productIndex =
            products.findIndex(
                function (item) {

                    return (
                        String(
                            item.id
                        ) ===
                        String(
                            product.id
                        )
                    );
                }
            );


        if (
            productIndex ===
            -1
        ) {

            throw new Error(
                "Product not found."
            );
        }


        const currentProduct =
            products[
                productIndex
            ];


        const branchStock =
            copyObject(
                currentProduct.branchStock
            );


        /*
         * Compatibility for old products
         * created before branchStock existed.
         */
        if (
            !Object.prototype
                .hasOwnProperty.call(
                    branchStock,
                    DEFAULT_BRANCH_ID
                ) &&
            toNumber(
                currentProduct.quantity
            ) >
                0 &&
            Object.keys(
                branchStock
            ).length ===
                0
        ) {

            branchStock[
                DEFAULT_BRANCH_ID
            ] =
                toNumber(
                    currentProduct.quantity
                );
        }


        const previousStock =
            toNumber(
                branchStock[
                    branchId
                ]
            );


        const newStock =
            previousStock +
            quantity;


        branchStock[
            branchId
        ] =
            newStock;


        currentProduct.branchStock =
            branchStock;


        currentProduct.quantity =
            sumObjectValues(
                branchStock
            );


        currentProduct.costPrice =
            costPrice;


        currentProduct.updatedAt =
            new Date()
                .toISOString();


        products[
            productIndex
        ] =
            currentProduct;


        writeArray(
            PRODUCTS_KEY,
            products
        );


        addLedgerEntry({

            type:
                "PURCHASE_IN",

            productId:
                String(
                    product.id
                ),

            productName:
                product.name ||
                "Unnamed Product",

            branchId:
                String(
                    branchId
                ),

            branchName:
                purchase.branchName,

            quantity:
                quantity,

            quantityIn:
                quantity,

            balance:
                newStock,

            costPrice:
                costPrice,

            costTotal:
                quantity *
                costPrice,

            reference:
                purchase.purchaseNo,

            date:
                purchase.date
        });
    }


    /* ==========================================
       STOCK LEDGER
    ========================================== */

    function addLedgerEntry(
        data
    ) {

        const ledger =
            readArray(
                LEDGER_KEY
            );


        ledger.push({

            id:
                "LED-" +
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .slice(2, 6),


            date:
                data.date,


            createdAt:
                new Date()
                    .toISOString(),


            productId:
                data.productId,


            productName:
                data.productName,


            branchId:
                data.branchId,


            branchName:
                data.branchName ||
                "",


            type:
                data.type,


            quantity:
                toNumber(
                    data.quantity
                ),


            quantityIn:
                toNumber(
                    data.quantityIn
                ),


            balance:
                toNumber(
                    data.balance
                ),


            costPrice:
                toNumber(
                    data.costPrice
                ),


            costTotal:
                toNumber(
                    data.costTotal
                ),


            reference:
                data.reference
        });


        writeArray(
            LEDGER_KEY,
            ledger
        );
    }


    /* ==========================================
       RESET / NEW PURCHASE
    ========================================== */

    function prepareNewPurchase(
        clearForm
    ) {

        if (
            clearForm ===
                true &&
            el.form
        ) {

            el.form.reset();
        }


        purchases =
            readArray(
                PURCHASES_KEY
            );


        if (el.number) {

            el.number.value =
                generatePurchaseNumber();
        }


        if (el.date) {

            el.date.value =
                dateKey(
                    new Date()
                );
        }


        if (el.status) {

            el.status.value =
                "received";
        }


        if (el.quantity) {

            el.quantity.value =
                "";
        }


        if (el.cost) {

            el.cost.value =
                "";
        }


        if (el.total) {

            el.total.value =
                "0.00";
        }


        if (el.reference) {

            el.reference.value =
                "";
        }


        if (el.customSupplier) {

            el.customSupplier.value =
                "";

            el.customSupplier.required =
                false;
        }


        if (el.customSupplierGroup) {

            el.customSupplierGroup.hidden =
                true;
        }


        /* ======================================
           PAYMENT DEFAULTS
        ====================================== */

        if (el.paymentStatus) {

            el.paymentStatus.value =
                "paid";
        }


        if (el.paymentMethod) {

            el.paymentMethod.value =
                "Cash";
        }


        if (el.amountPaid) {

            el.amountPaid.value =
                "0.00";

            el.amountPaid.readOnly =
                true;
        }


        if (el.amountDue) {

            el.amountDue.value =
                "0.00";
        }


        if (el.paymentSummary) {

            el.paymentSummary.textContent =
                "Supplier balance change: " +
                formatMoney(
                    0
                );
        }


        populateBranches();

        calculatePayment();

        refreshAllMobileButtons();
    }


    /* ==========================================
       PURCHASE HISTORY
    ========================================== */

    function refreshPurchases() {

        purchases =
            readArray(
                PURCHASES_KEY
            );


        displayPurchases();

        updateSummary();

        updateStatistics();


        if (el.number) {

            el.number.value =
                generatePurchaseNumber();
        }
    }


    function displayPurchases() {

        if (!el.tableBody) {
            return;
        }


        const search =
            String(
                el.search
                    ? el.search.value
                    : ""
            )
                .trim()
                .toLowerCase();


        const status =
            String(
                el.statusFilter
                    ? el.statusFilter.value
                    : ""
            )
                .trim()
                .toLowerCase();


        const selectedDate =
            el.dateFilter
                ? el.dateFilter.value
                : "";


        const rows =
            purchases
                .filter(
                    function (purchase) {

                        const searchable =
                            [
                                purchase.purchaseNo,
                                purchase.purchaseNumber,
                                purchase.supplier,
                                purchase.supplierName,
                                purchase.productName,
                                purchase.branchName,
                                purchase.paymentMethod,
                                purchase.paymentStatus
                            ]
                                .join(" ")
                                .toLowerCase();


                        const matchesSearch =
                            !search ||
                            searchable.includes(
                                search
                            );


                        const matchesStatus =
                            !status ||
                            String(
                                purchase.status ||
                                "received"
                            )
                                .toLowerCase() ===
                                status;


                        const matchesDate =
                            !selectedDate ||
                            getPurchaseDate(
                                purchase
                            ) ===
                                selectedDate;


                        return (
                            matchesSearch &&
                            matchesStatus &&
                            matchesDate
                        );
                    }
                )
                .sort(
                    function (
                        first,
                        second
                    ) {

                        return (
                            getTimestamp(
                                second
                            ) -
                            getTimestamp(
                                first
                            )
                        );
                    }
                );


        if (
            rows.length ===
            0
        ) {

            el.tableBody.innerHTML = `
                <tr>

                    <td
                        colspan="12"
                        class="table-empty"
                    >
                        No purchases match the current filters.
                    </td>

                </tr>
            `;

            return;
        }


        el.tableBody.innerHTML =
            rows
                .map(
                    function (purchase) {

                        const purchaseStatus =
                            String(
                                purchase.status ||
                                "received"
                            )
                                .trim()
                                .toLowerCase();


                        const paymentStatus =
                            getStoredPaymentStatus(
                                purchase
                            );


                        const total =
                            getPurchaseTotal(
                                purchase
                            );


                        const paid =
                            getPurchaseAmountPaid(
                                purchase
                            );


                        const due =
                            getPurchaseAmountDue(
                                purchase
                            );


                        return `

                            <tr>

                                <td>

                                    <strong>
                                        ${escapeHTML(
                                            purchase.purchaseNo ||
                                            purchase.purchaseNumber ||
                                            purchase.id
                                        )}
                                    </strong>

                                </td>


                                <td>
                                    ${escapeHTML(
                                        formatDate(
                                            getPurchaseDate(
                                                purchase
                                            )
                                        )
                                    )}
                                </td>


                                <td>
                                    ${escapeHTML(
                                        purchase.branchName ||
                                        getBranchNameById(
                                            purchase.branchId
                                        )
                                    )}
                                </td>


                                <td>
                                    ${escapeHTML(
                                        purchase.supplier ||
                                        purchase.supplierName ||
                                        "—"
                                    )}
                                </td>


                                <td>
                                    ${escapeHTML(
                                        purchase.productName ||
                                        "—"
                                    )}
                                </td>


                                <td>
                                    ${formatNumber(
                                        purchase.quantity
                                    )}
                                </td>


                                <td>
                                    ${formatMoney(
                                        purchase.costPrice
                                    )}
                                </td>


                                <td>

                                    <strong>
                                        ${formatMoney(
                                            total
                                        )}
                                    </strong>

                                </td>


                                <td>
                                    ${formatMoney(
                                        paid
                                    )}
                                </td>


                                <td>

                                    <strong>
                                        ${formatMoney(
                                            due
                                        )}
                                    </strong>

                                </td>


                                <td>

                                    <span
                                        class="status-badge payment-${escapeHTML(
                                            paymentStatus
                                        )}"
                                    >
                                        ${escapeHTML(
                                            formatPaymentStatus(
                                                paymentStatus
                                            )
                                        )}
                                    </span>

                                </td>


                                <td>

                                    <span
                                        class="status-badge status-${escapeHTML(
                                            purchaseStatus
                                        )}"
                                    >
                                        ${escapeHTML(
                                            capitalize(
                                                purchaseStatus
                                            )
                                        )}
                                    </span>

                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");
    }


    /* ==========================================
       SUMMARY
    ========================================== */

    function updateSummary() {

        setText(
            "totalPurchaseCount",
            formatNumber(
                purchases.length
            )
        );


        const totalValue =
            purchases.reduce(
                function (
                    total,
                    purchase
                ) {

                    return (
                        total +
                        getPurchaseTotal(
                            purchase
                        )
                    );
                },
                0
            );


        setText(
            "totalPurchaseValue",
            formatMoney(
                totalValue
            )
        );


        const totalItems =
            purchases.reduce(
                function (
                    total,
                    purchase
                ) {

                    return (
                        total +
                        toNumber(
                            purchase.quantity
                        )
                    );
                },
                0
            );


        setText(
            "totalPurchasedItems",
            formatNumber(
                totalItems
            )
        );
    }


    /* ==========================================
       STATISTICS
    ========================================== */

    function updateStatistics() {

        const today =
            dateKey(
                new Date()
            );


        const now =
            new Date();


        const monthPrefix =
            now.getFullYear() +
            "-" +
            String(
                now.getMonth() +
                1
            ).padStart(
                2,
                "0"
            );


        const receivedPurchases =
            purchases.filter(
                function (purchase) {

                    return (
                        String(
                            purchase.status ||
                            "received"
                        )
                            .toLowerCase() ===
                        "received"
                    );
                }
            );


        const todayTotal =
            receivedPurchases
                .filter(
                    function (purchase) {

                        return (
                            getPurchaseDate(
                                purchase
                            ) ===
                            today
                        );
                    }
                )
                .reduce(
                    function (
                        total,
                        purchase
                    ) {

                        return (
                            total +
                            getPurchaseTotal(
                                purchase
                            )
                        );
                    },
                    0
                );


        const monthTotal =
            receivedPurchases
                .filter(
                    function (purchase) {

                        return (
                            getPurchaseDate(
                                purchase
                            )
                                .slice(
                                    0,
                                    7
                                ) ===
                            monthPrefix
                        );
                    }
                )
                .reduce(
                    function (
                        total,
                        purchase
                    ) {

                        return (
                            total +
                            getPurchaseTotal(
                                purchase
                            )
                        );
                    },
                    0
                );


        const supplierNames =
            {};


        purchases.forEach(
            function (purchase) {

                const name =
                    String(
                        purchase.supplier ||
                        purchase.supplierName ||
                        ""
                    )
                        .trim()
                        .toLowerCase();


                if (name) {

                    supplierNames[
                        name
                    ] =
                        true;
                }
            }
        );


        setText(
            "todayPurchases",
            formatMoney(
                todayTotal
            )
        );


        setText(
            "monthPurchases",
            formatMoney(
                monthTotal
            )
        );


        setText(
            "supplierCount",
            formatNumber(
                Object.keys(
                    supplierNames
                ).length
            )
        );
    }


    /* ==========================================
       PURCHASE NUMBER
    ========================================== */

    function generatePurchaseNumber() {

        let highestNumber =
            0;


        purchases.forEach(
            function (purchase) {

                const match =
                    String(
                        purchase.purchaseNo ||
                        purchase.purchaseNumber ||
                        ""
                    )
                        .match(
                            /(\d+)$/
                        );


                if (match) {

                    highestNumber =
                        Math.max(
                            highestNumber,
                            Number(
                                match[1]
                            ) ||
                            0
                        );
                }
            }
        );


        return (
            "PUR-" +
            String(
                highestNumber +
                1
            ).padStart(
                6,
                "0"
            )
        );
    }


    /* ==========================================
       SELECTED RECORDS
    ========================================== */

    function getSelectedProduct() {

        if (!el.product) {
            return null;
        }


        return (
            products.find(
                function (product) {

                    return (
                        String(
                            product.id
                        ) ===
                        String(
                            el.product.value
                        )
                    );
                }
            ) ||
            null
        );
    }


    function getSelectedBranch() {

        if (!el.branch) {
            return null;
        }


        return (
            branches.find(
                function (branch) {

                    return (
                        String(
                            branch.id
                        ) ===
                        String(
                            el.branch.value
                        )
                    );
                }
            ) ||
            null
        );
    }


    function getSelectedSupplier() {

        if (!el.supplier) {

            return {

                id:
                    "",

                name:
                    ""
            };
        }


        if (
            el.supplier.value ===
            "other"
        ) {

            return {

                id:
                    "",

                name:
                    String(
                        el.customSupplier
                            ? el.customSupplier.value
                            : ""
                    ).trim()
            };
        }


        const supplier =
            suppliers.find(
                function (item) {

                    return (
                        String(
                            item.id
                        ) ===
                        String(
                            el.supplier.value
                        )
                    );
                }
            );


        return supplier
            ? {

                id:
                    String(
                        supplier.id
                    ),

                name:
                    supplier.name ||
                    ""

            }
            : {

                id:
                    "",

                name:
                    ""
            };
    }


    /* ==========================================
       PAYMENT HELPERS
    ========================================== */

    function getStoredPaymentStatus(
        purchase
    ) {

        if (
            purchase.paymentStatus
        ) {

            return String(
                purchase.paymentStatus
            )
                .trim()
                .toLowerCase();
        }


        return "paid";
    }


    function getPurchaseAmountPaid(
        purchase
    ) {

        if (
            purchase.amountPaid !==
            undefined
        ) {

            return toNumber(
                purchase.amountPaid
            );
        }


        if (
            purchase.paidAmount !==
            undefined
        ) {

            return toNumber(
                purchase.paidAmount
            );
        }


        return getPurchaseTotal(
            purchase
        );
    }


    function getPurchaseAmountDue(
        purchase
    ) {

        if (
            purchase.amountDue !==
            undefined
        ) {

            return toNumber(
                purchase.amountDue
            );
        }


        if (
            purchase.balanceDue !==
            undefined
        ) {

            return toNumber(
                purchase.balanceDue
            );
        }


        return Math.max(
            0,
            getPurchaseTotal(
                purchase
            ) -
            getPurchaseAmountPaid(
                purchase
            )
        );
    }


    function formatPaymentStatus(
        status
    ) {

        const values = {

            paid:
                "Paid",

            partial:
                "Partly Paid",

            credit:
                "Credit"
        };


        return (
            values[
                status
            ] ||
            capitalize(
                status
            )
        );
    }


    /* ==========================================
       MOBILE SELECTS
    ========================================== */

    function installMobileSelectMenus() {

        [
            el.branch,
            el.supplier,
            el.product,
            el.status,
            el.paymentStatus,
            el.paymentMethod,
            el.statusFilter
        ]
            .filter(
                Boolean
            )
            .forEach(
                function (select) {

                    enhanceSelect(
                        select
                    );
                }
            );


        addMobileSelectStyles();
    }


    function enhanceSelect(
        select
    ) {

        if (
            !select ||
            select.dataset
                .mobileSelectReady ===
                "true"
        ) {

            return;
        }


        select.dataset
            .mobileSelectReady =
            "true";


        select.style.display =
            "none";


        /*
         * Native required validation is not
         * needed because purchases.js validates.
         */
        select.required =
            false;


        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "mobile-select-button";


        button.dataset.forSelect =
            select.id;


        button.setAttribute(
            "aria-haspopup",
            "listbox"
        );


        select.insertAdjacentElement(
            "afterend",
            button
        );


        button.addEventListener(
            "click",
            function () {

                openSelectMenu(
                    select
                );
            }
        );


        select.addEventListener(
            "change",
            function () {

                refreshMobileSelectButton(
                    select
                );
            }
        );


        refreshMobileSelectButton(
            select
        );
    }


    function refreshMobileSelectButton(
        select
    ) {

        if (!select) {
            return;
        }


        const button =
            document.querySelector(
                '.mobile-select-button[data-for-select="' +
                select.id +
                '"]'
            );


        if (!button) {
            return;
        }


        const selectedOption =
            select.options[
                select.selectedIndex
            ];


        button.textContent =
            selectedOption
                ? selectedOption
                    .textContent
                : "Select option";


        button.classList.toggle(
            "placeholder",
            !select.value
        );
    }


    function refreshAllMobileButtons() {

        [
            el.branch,
            el.supplier,
            el.product,
            el.status,
            el.paymentStatus,
            el.paymentMethod,
            el.statusFilter
        ]
            .filter(
                Boolean
            )
            .forEach(
                refreshMobileSelectButton
            );
    }


    function openSelectMenu(
        select
    ) {

        closeSelectMenu();


        const overlay =
            document.createElement(
                "div"
            );


        overlay.id =
            "mobileSelectOverlay";


        overlay.className =
            "mobile-select-overlay";


        const panel =
            document.createElement(
                "div"
            );


        panel.className =
            "mobile-select-panel";


        const header =
            document.createElement(
                "div"
            );


        header.className =
            "mobile-select-header";


        header.innerHTML = `
            <strong>Select an option</strong>

            <button
                type="button"
                aria-label="Close"
            >
                ×
            </button>
        `;


        header
            .querySelector(
                "button"
            )
            .addEventListener(
                "click",
                closeSelectMenu
            );


        panel.appendChild(
            header
        );


        const list =
            document.createElement(
                "div"
            );


        list.className =
            "mobile-select-list";


        Array.from(
            select.options
        ).forEach(
            function (option) {

                const item =
                    document.createElement(
                        "button"
                    );


                item.type =
                    "button";


                item.className =
                    "mobile-select-option";


                item.textContent =
                    option.textContent;


                item.disabled =
                    option.disabled;


                if (
                    option.value ===
                    select.value
                ) {

                    item.classList.add(
                        "selected"
                    );
                }


                item.addEventListener(
                    "click",
                    function () {

                        select.value =
                            option.value;


                        select.dispatchEvent(
                            new Event(
                                "change",
                                {
                                    bubbles:
                                        true
                                }
                            )
                        );


                        refreshMobileSelectButton(
                            select
                        );


                        closeSelectMenu();
                    }
                );


                list.appendChild(
                    item
                );
            }
        );


        panel.appendChild(
            list
        );


        overlay.appendChild(
            panel
        );


        document.body.appendChild(
            overlay
        );


        overlay.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    overlay
                ) {

                    closeSelectMenu();
                }
            }
        );
    }


    function closeSelectMenu() {

        const overlay =
            document.getElementById(
                "mobileSelectOverlay"
            );


        if (overlay) {

            overlay.remove();
        }
    }


    function addMobileSelectStyles() {

        if (
            document.getElementById(
                "mobileSelectStyles"
            )
        ) {

            return;
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "mobileSelectStyles";


        style.textContent = `

            .mobile-select-button {

                width: 100%;

                min-height: 49px;

                padding:
                    0 44px
                    0 14px;

                border:
                    1px solid
                    #d7dce5;

                border-radius:
                    9px;

                background:
                    #ffffff;

                color:
                    #1f2937;

                font-size:
                    16px;

                text-align:
                    left;

                position:
                    relative;
            }


            .mobile-select-button::after {

                content:
                    "⌄";

                position:
                    absolute;

                right:
                    15px;

                top:
                    50%;

                transform:
                    translateY(
                        -55%
                    );

                font-size:
                    20px;

                color:
                    #4b5563;
            }


            .mobile-select-button.placeholder {

                color:
                    #6b7280;
            }


            .mobile-select-overlay {

                position:
                    fixed;

                inset:
                    0;

                z-index:
                    20000;

                display:
                    flex;

                align-items:
                    flex-end;

                justify-content:
                    center;

                padding:
                    14px;

                background:
                    rgba(
                        17,
                        24,
                        39,
                        .55
                    );
            }


            .mobile-select-panel {

                width:
                    100%;

                max-width:
                    620px;

                max-height:
                    78vh;

                overflow:
                    hidden;

                border-radius:
                    18px
                    18px
                    12px
                    12px;

                background:
                    #ffffff;

                box-shadow:
                    0 18px 60px
                    rgba(
                        0,
                        0,
                        0,
                        .28
                    );
            }


            .mobile-select-header {

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    space-between;

                padding:
                    17px 18px;

                border-bottom:
                    1px solid
                    #edf0f4;
            }


            .mobile-select-header button {

                width:
                    38px;

                height:
                    38px;

                border:
                    none;

                border-radius:
                    50%;

                background:
                    #f3f4f6;

                font-size:
                    25px;
            }


            .mobile-select-list {

                max-height:
                    calc(
                        78vh - 73px
                    );

                overflow-y:
                    auto;

                -webkit-overflow-scrolling:
                    touch;

                padding:
                    8px;
            }


            .mobile-select-option {

                width:
                    100%;

                min-height:
                    52px;

                padding:
                    10px 14px;

                border:
                    none;

                border-bottom:
                    1px solid
                    #f0f2f5;

                border-radius:
                    8px;

                background:
                    #ffffff;

                color:
                    #1f2937;

                font-size:
                    16px;

                text-align:
                    left;
            }


            .mobile-select-option.selected {

                background:
                    #eaf2ff;

                color:
                    #0b5ed7;

                font-weight:
                    700;
            }


            .mobile-select-option:disabled {

                color:
                    #9ca3af;
            }

        `;


        document.head.appendChild(
            style
        );
    }


    /* ==========================================
       PURCHASE HELPERS
    ========================================== */

    function getPurchaseDate(
        purchase
    ) {

        return normalizeDate(
            purchase.purchaseDate ||
            purchase.date ||
            purchase.createdAt
        );
    }


    function getPurchaseTotal(
        purchase
    ) {

        if (
            purchase.total !==
            undefined
        ) {

            return toNumber(
                purchase.total
            );
        }


        if (
            purchase.totalCost !==
            undefined
        ) {

            return toNumber(
                purchase.totalCost
            );
        }


        if (
            purchase.amount !==
            undefined
        ) {

            return toNumber(
                purchase.amount
            );
        }


        return (
            toNumber(
                purchase.quantity
            ) *
            toNumber(
                purchase.costPrice
            )
        );
    }


    function getTimestamp(
        purchase
    ) {

        const value =
            purchase.createdAt ||
            purchase.purchaseDate ||
            purchase.date ||
            0;


        const timestamp =
            new Date(
                value
            ).getTime();


        return Number.isNaN(
            timestamp
        )
            ? 0
            : timestamp;
    }


    function getBranchName(
        branch
    ) {

        return (
            branch.branchName ||
            branch.name ||
            "Unnamed Branch"
        );
    }


    function getBranchNameById(
        branchId
    ) {

        const branch =
            branches.find(
                function (item) {

                    return (
                        String(
                            item.id
                        ) ===
                        String(
                            branchId
                        )
                    );
                }
            );


        if (branch) {

            return getBranchName(
                branch
            );
        }


        return branchId
            ? "Unknown Branch"
            : "Head Office";
    }


    /* ==========================================
       ROLE
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
                "admin"
        };


        return (
            aliases[
                value
            ] ||
            value
        );
    }


    /* ==========================================
       EVENTS TO OTHER MODULES
    ========================================== */

    function notifyDataChanged(
        purchase
    ) {

        document.dispatchEvent(
            new CustomEvent(
                "jufelix:data-updated",
                {
                    detail: {

                        key:
                            PURCHASES_KEY,

                        module:
                            "purchases",

                        record:
                            purchase,

                        value:
                            purchases
                    }
                }
            )
        );


        document.dispatchEvent(
            new CustomEvent(
                "jufelix:dataChanged",
                {
                    detail: {

                        key:
                            PURCHASES_KEY,

                        module:
                            "purchases",

                        record:
                            purchase,

                        value:
                            purchases
                    }
                }
            )
        );
    }


    function setSaveButtonState(
        saving
    ) {

        if (!el.saveButton) {
            return;
        }


        el.saveButton.disabled =
            saving;


        el.saveButton.textContent =
            saving
                ? "Saving..."
                : "💾 Save Purchase";
    }


    /* ==========================================
       STORAGE
    ========================================== */

    function readArray(
        key
    ) {

        try {

            const value =
                localStorage.getItem(
                    key
                );


            const parsed =
                value
                    ? JSON.parse(
                        value
                    )
                    : [];


            return Array.isArray(
                parsed
            )
                ? parsed
                : [];


        } catch (error) {

            console.error(
                "Storage read failed:",
                key,
                error
            );


            return [];
        }
    }


    function writeArray(
        key,
        value
    ) {

        localStorage.setItem(
            key,
            JSON.stringify(
                value
            )
        );
    }


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


    function copyObject(
        value
    ) {

        const result =
            {};


        if (
            value &&
            typeof value ===
                "object" &&
            !Array.isArray(
                value
            )
        ) {

            Object.keys(
                value
            ).forEach(
                function (key) {

                    result[
                        key
                    ] =
                        toNumber(
                            value[
                                key
                            ]
                        );
                }
            );
        }


        return result;
    }


    function sumObjectValues(
        object
    ) {

        return Object.keys(
            object ||
            {}
        )
            .reduce(
                function (
                    total,
                    key
                ) {

                    return (
                        total +
                        toNumber(
                            object[
                                key
                            ]
                        )
                    );
                },
                0
            );
    }


    /* ==========================================
       NUMBERS
    ========================================== */

    function parseNumericValue(
        value
    ) {

        let text =
            String(
                value ===
                    undefined ||
                value ===
                    null
                    ? ""
                    : value
            )
                .trim();


        if (!text) {
            return 0;
        }


        if (
            text.includes(",") &&
            !text.includes(".")
        ) {

            text =
                text.replace(
                    ",",
                    "."
                );

        } else {

            text =
                text.replace(
                    /,/g,
                    ""
                );
        }


        const number =
            Number(
                text
            );


        return Number.isFinite(
            number
        )
            ? number
            : 0;
    }


    function toNumber(
        value
    ) {

        return parseNumericValue(
            value
        );
    }


    /* ==========================================
       DATES
    ========================================== */

    function normalizeDate(
        value
    ) {

        if (!value) {
            return "";
        }


        if (
            /^\d{4}-\d{2}-\d{2}$/.test(
                String(
                    value
                )
            )
        ) {

            return String(
                value
            );
        }


        const date =
            new Date(
                value
            );


        return Number.isNaN(
            date.getTime()
        )
            ? ""
            : dateKey(
                date
            );
    }


    function dateKey(
        date
    ) {

        return (
            date.getFullYear() +
            "-" +
            String(
                date.getMonth() +
                1
            ).padStart(
                2,
                "0"
            ) +
            "-" +
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            )
        );
    }


    function formatDate(
        value
    ) {

        if (!value) {
            return "—";
        }


        const date =
            new Date(
                value +
                "T00:00:00"
            );


        return Number.isNaN(
            date.getTime()
        )
            ? value
            : date.toLocaleDateString(
                "en-GH",
                {
                    day:
                        "2-digit",

                    month:
                        "short",

                    year:
                        "numeric"
                }
            );
    }


    /* ==========================================
       FORMATTERS
    ========================================== */

    function formatMoney(
        value
    ) {

        return new Intl.NumberFormat(
            "en-GH",
            {
                style:
                    "currency",

                currency:
                    "GHS",

                minimumFractionDigits:
                    2
            }
        ).format(
            toNumber(
                value
            )
        );
    }


    function formatNumber(
        value
    ) {

        return new Intl.NumberFormat(
            "en-GH"
        ).format(
            toNumber(
                value
            )
        );
    }


    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.textContent =
                value;
        }
    }


    function capitalize(
        value
    ) {

        const text =
            String(
                value ||
                ""
            );


        return (
            text.charAt(0)
                .toUpperCase() +
            text.slice(1)
        );
    }


    function escapeHTML(
        value
    ) {

        return String(
            value ===
                undefined ||
            value ===
                null
                ? ""
                : value
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    /* ==========================================
       TOAST
    ========================================== */

    function showToast(
        message,
        type
    ) {

        const oldToast =
            document.querySelector(
                ".purchase-toast"
            );


        if (oldToast) {

            oldToast.remove();
        }


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            "toast purchase-toast" +
            (
                type ===
                "error"
                    ? " error"
                    : ""
            );


        toast.textContent =
            message;


        document.body.appendChild(
            toast
        );


        window.setTimeout(
            function () {

                if (toast) {

                    toast.remove();
                }

            },
            3200
        );
    }


    /* ==========================================
       PUBLIC API
    ========================================== */

    window.JufelixPurchases = {

        refresh:
            function () {

                loadData();

                ensureHeadOffice();

                populateBranches();

                populateSuppliers();

                populateProducts();

                refreshPurchases();

                calculateTotal();

                calculatePayment();
            },


        recalculate:
            function () {

                calculateTotal();

                calculatePayment();
            },


        save:
            function () {

                savePurchase(
                    {
                        preventDefault:
                            function () {},

                        stopPropagation:
                            function () {}
                    }
                );
            }
    };

})();