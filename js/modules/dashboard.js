/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   DASHBOARD MODULE v642

   + Role-Aware
   + Branch-Aware
   + Permission-Aware
   + Firebase Realtime Refresh
   + Inventory Cloud Refresh
   + Multi-Device Product Refresh
   + Correct COGS
   + Correct Gross Profit
   + Correct Net Profit
   + Cancelled/Void Transaction Filtering
   + Debounced Cloud Updates

   File:
   js/modules/dashboard.js
========================================== */

(function () {
    "use strict";


    /* ==========================================
       STORAGE KEYS
    ========================================== */

    const PRODUCTS_KEY =
        "jufelix_products";

    const SALES_KEY =
        "jufelix_v7_sales";

    const EXPENSES_KEY =
        "jufelix_v7_expenses";

    const CUSTOMERS_KEY =
        "jufelix_v7_customers";

    const SUPPLIERS_KEY =
        "jufelix_v7_suppliers";

    const CURRENT_USER_KEY =
        "jufelix_v7_current_user";

    const ACTIVE_BRANCH_KEY =
        "jufelix_v7_active_branch";

    const DEFAULT_BRANCH_ID =
        "head-office";


    /* ==========================================
       STATE
    ========================================== */

    let refreshTimer =
        null;

    let initialized =
        false;


    /* ==========================================
       WATCHED STORAGE KEYS
    ========================================== */

    const WATCHED_KEYS = [

        PRODUCTS_KEY,

        SALES_KEY,

        EXPENSES_KEY,

        CUSTOMERS_KEY,

        SUPPLIERS_KEY,

        ACTIVE_BRANCH_KEY,

        CURRENT_USER_KEY

    ];


    /* ==========================================
       START
    ========================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeDashboard
        );

    } else {

        initializeDashboard();
    }


    /* ==========================================
       ERP DATA EVENTS
    ========================================== */

    document.addEventListener(
        "jufelix:data-updated",
        handleDataUpdate
    );


    document.addEventListener(
        "jufelix:dataChanged",
        handleDataUpdate
    );


    /*
     * Fired directly by
     * inventory-cloud.js whenever
     * Firestore products change.
     */

    document.addEventListener(
        "jufelix:cloud-products-updated",
        function () {

            console.log(
                "☁️ Dashboard received realtime product update."
            );


            scheduleRefresh();
        }
    );


    /*
     * Fired when inventory cloud
     * becomes ready.
     */

    document.addEventListener(
        "jufelix:inventory-cloud-ready",
        function () {

            console.log(
                "☁️ Dashboard inventory cloud ready."
            );


            scheduleRefresh();
        }
    );


    /* ==========================================
       CROSS-TAB / CROSS-WINDOW STORAGE
    ========================================== */

    window.addEventListener(
        "storage",
        function (event) {

            if (
                event.key &&
                WATCHED_KEYS.includes(
                    event.key
                )
            ) {

                console.log(
                    "🔄 Dashboard storage update:",
                    event.key
                );


                scheduleRefresh();
            }
        }
    );


    /* ==========================================
       PAGE VISIBILITY
    ========================================== */

    document.addEventListener(
        "visibilitychange",
        function () {

            if (
                document.visibilityState ===
                "visible"
            ) {

                scheduleRefresh();
            }
        }
    );


    /* ==========================================
       WINDOW FOCUS
    ========================================== */

    window.addEventListener(
        "focus",
        function () {

            scheduleRefresh();
        }
    );


    /* ==========================================
       ONLINE AGAIN
    ========================================== */

    window.addEventListener(
        "online",
        function () {

            console.log(
                "🌐 Dashboard back online."
            );


            scheduleRefresh();


            /*
             * Ask inventory cloud listener
             * to reconnect if available.
             */

            if (
                window.JufelixInventoryCloud &&
                typeof window
                    .JufelixInventoryCloud
                    .refresh ===
                    "function"
            ) {

                window
                    .JufelixInventoryCloud
                    .refresh()
                    .catch(
                        function (error) {

                            console.warn(
                                "Dashboard inventory cloud refresh failed:",
                                error
                            );
                        }
                    );
            }
        }
    );


    /* ==========================================
       INITIALIZE
    ========================================== */

    function initializeDashboard() {

        if (initialized) {

            return;
        }


        initialized =
            true;


        refreshEverything();


        console.log(
            "✅ Jufelix Dashboard v642 loaded."
        );
    }


    /* ==========================================
       DATA UPDATE HANDLER
    ========================================== */

    function handleDataUpdate(
        event
    ) {

        if (
            event &&
            event.detail &&
            event.detail.key &&
            !WATCHED_KEYS.includes(
                event.detail.key
            )
        ) {

            return;
        }


        scheduleRefresh();
    }


    /* ==========================================
       DEBOUNCED REFRESH
    ========================================== */

    function scheduleRefresh() {

        window.clearTimeout(
            refreshTimer
        );


        refreshTimer =
            window.setTimeout(
                function () {

                    refreshEverything();

                },
                80
            );
    }


    /* ==========================================
       REFRESH EVERYTHING
    ========================================== */

    function refreshEverything() {

        const currentUser =
            getCurrentUser();


        updateWelcomeMessage(
            currentUser
        );


        applyDashboardPermissions(
            currentUser
        );


        refreshDashboard();
    }


    /* ==========================================
       REFRESH DASHBOARD
    ========================================== */

    function refreshDashboard() {

        const currentUser =
            getCurrentUser();


        const branchId =
            getActiveBranchId(
                currentUser
            );


        const companyWide =
            isCompanyWideView(
                currentUser,
                branchId
            );


        /* ======================================
           LOAD DATA
        ====================================== */

        const allProducts =
            readArray(
                PRODUCTS_KEY
            );


        const allSales =
            readArray(
                SALES_KEY
            );


        const allExpenses =
            readArray(
                EXPENSES_KEY
            );


        const allCustomers =
            readArray(
                CUSTOMERS_KEY
            );


        const allSuppliers =
            readArray(
                SUPPLIERS_KEY
            );


        /* ======================================
           BRANCH FILTER
        ====================================== */

        const branchSales =
            companyWide

                ? allSales

                : filterByBranch(
                    allSales,
                    branchId
                );


        const branchExpenses =
            companyWide

                ? allExpenses

                : filterByBranch(
                    allExpenses,
                    branchId
                );


        const customers =
            companyWide

                ? allCustomers

                : filterCustomersByBranch(
                    allCustomers,
                    branchId
                );


        const suppliers =
            companyWide

                ? allSuppliers

                : filterSuppliersByBranch(
                    allSuppliers,
                    branchId
                );


        /* ======================================
           VALID SALES
        ====================================== */

        const completedSales =
            branchSales.filter(
                function (sale) {

                    return isValidTransaction(
                        sale
                    );
                }
            );


        /* ======================================
           VALID EXPENSES
        ====================================== */

        const validExpenses =
            branchExpenses.filter(
                function (expense) {

                    return isValidTransaction(
                        expense
                    );
                }
            );


        /* ======================================
           VISIBLE PRODUCTS
        ====================================== */

        const visibleProducts =
            allProducts.filter(
                function (product) {

                    if (companyWide) {

                        return true;
                    }


                    const branchStock =
                        product.branchStock;


                    if (
                        branchStock &&
                        typeof branchStock ===
                            "object" &&
                        !Array.isArray(
                            branchStock
                        )
                    ) {

                        return Object.prototype
                            .hasOwnProperty.call(
                                branchStock,
                                branchId
                            );
                    }


                    /*
                     * Older products without
                     * branchStock belong to
                     * Head Office.
                     */

                    return (
                        String(
                            branchId
                        ) ===
                        DEFAULT_BRANCH_ID
                    );
                }
            );


        /* ======================================
           TOTAL PRODUCTS
        ====================================== */

        const totalProducts =
            visibleProducts.length;


        /* ======================================
           TOTAL STOCK QUANTITY
        ====================================== */

        const totalQuantity =
            visibleProducts.reduce(
                function (
                    total,
                    product
                ) {

                    return (
                        total +
                        getProductQuantity(
                            product,
                            branchId,
                            companyWide
                        )
                    );
                },
                0
            );


        /* ======================================
           INVENTORY VALUE
        ====================================== */

        const stockValue =
            visibleProducts.reduce(
                function (
                    total,
                    product
                ) {

                    const quantity =
                        getProductQuantity(
                            product,
                            branchId,
                            companyWide
                        );


                    return (
                        total +
                        (
                            quantity *
                            toNumber(
                                product.costPrice
                            )
                        )
                    );
                },
                0
            );


        /* ======================================
           LOW STOCK
        ====================================== */

        const lowStockProducts =
            visibleProducts.filter(
                function (product) {

                    const quantity =
                        getProductQuantity(
                            product,
                            branchId,
                            companyWide
                        );


                    const lowLevel =
                        getLowStockLevel(
                            product
                        );


                    return (
                        quantity <=
                        lowLevel
                    );
                }
            );


        /* ======================================
           SALES REVENUE
        ====================================== */

        const totalSalesValue =
            completedSales.reduce(
                function (
                    total,
                    sale
                ) {

                    return (
                        total +
                        getSaleTotal(
                            sale
                        )
                    );
                },
                0
            );


        /* ======================================
           COST OF GOODS SOLD
        ====================================== */

        const totalCOGS =
            completedSales.reduce(
                function (
                    total,
                    sale
                ) {

                    return (
                        total +
                        getSaleCost(
                            sale,
                            allProducts
                        )
                    );
                },
                0
            );


        /* ======================================
           GROSS PROFIT
        ====================================== */

        const grossProfit =
            totalSalesValue -
            totalCOGS;


        /* ======================================
           EXPENSES
        ====================================== */

        const totalExpenses =
            validExpenses.reduce(
                function (
                    total,
                    expense
                ) {

                    return (
                        total +
                        getExpenseTotal(
                            expense
                        )
                    );
                },
                0
            );


        /* ======================================
           NET PROFIT
        ====================================== */

        const netProfit =
            grossProfit -
            totalExpenses;


        /* ======================================
           UPDATE CARDS
        ====================================== */

        updateText(
            "totalProducts",
            formatNumber(
                totalProducts
            )
        );


        updateText(
            "totalStockQuantity",
            formatNumber(
                totalQuantity
            )
        );


        updateText(
            "stockValue",
            formatMoney(
                stockValue
            )
        );


        updateText(
            "lowStockCount",
            formatNumber(
                lowStockProducts.length
            )
        );


        updateText(
            "totalSales",
            formatMoney(
                totalSalesValue
            )
        );


        updateText(
            "totalRevenue",
            formatMoney(
                totalSalesValue
            )
        );


        updateText(
            "totalExpenses",
            formatMoney(
                totalExpenses
            )
        );


        updateText(
            "netProfit",
            formatMoney(
                netProfit
            )
        );


        updateText(
            "totalCustomers",
            formatNumber(
                customers.length
            )
        );


        updateText(
            "totalSuppliers",
            formatNumber(
                suppliers.length
            )
        );


        updateText(
            "totalCOGS",
            formatMoney(
                totalCOGS
            )
        );


        updateText(
            "grossProfit",
            formatMoney(
                grossProfit
            )
        );


        updateProfitAppearance(
            netProfit
        );


        updateFinancialAppearance(
            "grossProfit",
            grossProfit
        );


        /* ======================================
           TABLES
        ====================================== */

        displayLowStockProducts(
            lowStockProducts,
            branchId,
            companyWide
        );


        displayRecentSales(
            completedSales
        );


        console.log(
            "📊 Dashboard refreshed:",
            {

                products:
                    totalProducts,

                stockQuantity:
                    totalQuantity,

                stockValue:
                    stockValue,

                branchId:
                    branchId,

                companyWide:
                    companyWide,

                sales:
                    totalSalesValue,

                cogs:
                    totalCOGS,

                grossProfit:
                    grossProfit,

                expenses:
                    totalExpenses,

                netProfit:
                    netProfit

            }
        );
    }


    /* ==========================================
       TRANSACTION STATUS
    ========================================== */

    function isValidTransaction(
        record
    ) {

        if (!record) {

            return false;
        }


        if (
            record.deleted ===
            true
        ) {

            return false;
        }


        const status =
            String(
                record.status ||
                "completed"
            )
                .trim()
                .toLowerCase();


        const invalidStatuses = [

            "cancelled",

            "canceled",

            "void",

            "voided",

            "deleted"

        ];


        return !invalidStatuses.includes(
            status
        );
    }


    /* ==========================================
       SALES TOTAL
    ========================================== */

    function getSaleTotal(
        sale
    ) {

        if (!sale) {

            return 0;
        }


        if (
            sale.total !==
            undefined
        ) {

            return toNumber(
                sale.total
            );
        }


        if (
            sale.grandTotal !==
            undefined
        ) {

            return toNumber(
                sale.grandTotal
            );
        }


        if (
            sale.totalAmount !==
            undefined
        ) {

            return toNumber(
                sale.totalAmount
            );
        }


        if (
            sale.amount !==
            undefined
        ) {

            return toNumber(
                sale.amount
            );
        }


        if (
            Array.isArray(
                sale.items
            )
        ) {

            return sale.items.reduce(
                function (
                    total,
                    item
                ) {

                    return (
                        total +
                        getSaleItemRevenue(
                            item
                        )
                    );
                },
                0
            );
        }


        return 0;
    }


    /* ==========================================
       SALE ITEM REVENUE
    ========================================== */

    function getSaleItemRevenue(
        item
    ) {

        if (!item) {

            return 0;
        }


        if (
            item.total !==
            undefined
        ) {

            return toNumber(
                item.total
            );
        }


        if (
            item.totalAmount !==
            undefined
        ) {

            return toNumber(
                item.totalAmount
            );
        }


        if (
            item.revenue !==
            undefined
        ) {

            return toNumber(
                item.revenue
            );
        }


        return (
            toNumber(
                item.quantity
            ) *
            toNumber(
                item.sellingPrice ??
                item.unitPrice ??
                item.price
            )
        );
    }


    /* ==========================================
       COST OF GOODS SOLD
    ========================================== */

    function getSaleCost(
        sale,
        products
    ) {

        if (!sale) {

            return 0;
        }


        if (
            sale.cogs !==
            undefined
        ) {

            return toNumber(
                sale.cogs
            );
        }


        if (
            sale.costTotal !==
            undefined
        ) {

            return toNumber(
                sale.costTotal
            );
        }


        if (
            sale.totalCost !==
            undefined
        ) {

            return toNumber(
                sale.totalCost
            );
        }


        if (
            Array.isArray(
                sale.items
            ) &&
            sale.items.length
        ) {

            return sale.items.reduce(
                function (
                    total,
                    item
                ) {

                    return (
                        total +
                        getSaleItemCost(
                            item,
                            products
                        )
                    );
                },
                0
            );
        }


        return getSaleItemCost(
            {

                productId:
                    sale.productId,

                quantity:
                    sale.quantity,

                costPrice:
                    sale.costPrice,

                costPriceAtSale:
                    sale.costPriceAtSale,

                unitCost:
                    sale.unitCost,

                costTotal:
                    sale.costTotal

            },
            products
        );
    }


    function getSaleItemCost(
        item,
        products
    ) {

        if (!item) {

            return 0;
        }


        if (
            item.costTotal !==
            undefined
        ) {

            return toNumber(
                item.costTotal
            );
        }


        if (
            item.cogs !==
            undefined
        ) {

            return toNumber(
                item.cogs
            );
        }


        let costPrice =
            item.costPrice ??
            item.costPriceAtSale ??
            item.unitCost;


        if (
            costPrice ===
            undefined ||
            costPrice ===
            null ||
            costPrice ===
            ""
        ) {

            const product =
                findProduct(
                    products,
                    item.productId
                );


            costPrice =
                product
                    ? product.costPrice
                    : 0;
        }


        return (
            toNumber(
                item.quantity
            ) *
            toNumber(
                costPrice
            )
        );
    }


    function findProduct(
        products,
        productId
    ) {

        if (!productId) {

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
                            productId
                        )
                    );
                }
            ) ||
            null
        );
    }


    /* ==========================================
       EXPENSE TOTAL
    ========================================== */

    function getExpenseTotal(
        expense
    ) {

        if (!expense) {

            return 0;
        }


        return toNumber(

            expense.amount ??

            expense.total ??

            expense.totalAmount ??

            0
        );
    }


    /* ==========================================
       DASHBOARD PERMISSIONS
    ========================================== */

    function applyDashboardPermissions(
        user
    ) {

        resetDashboardVisibility();


        const role =
            normalizeRole(
                user.role
            );


        if (
            role ===
            "admin"
        ) {

            applyQuickActionPermissions();

            return;
        }


        if (
            role ===
            "manager"
        ) {

            hideCard(
                "netProfit"
            );


            hideCard(
                "grossProfit"
            );


            hideCard(
                "totalCOGS"
            );


            applyQuickActionPermissions();

            return;
        }


        if (
            role ===
                "sales-officer" ||
            role ===
                "cashier"
        ) {

            hideCards([

                "totalProducts",

                "totalStockQuantity",

                "stockValue",

                "lowStockCount",

                "totalExpenses",

                "totalCOGS",

                "grossProfit",

                "netProfit",

                "totalSuppliers"

            ]);


            hideElement(
                "lowStockPanel"
            );


            applyQuickActionPermissions();

            return;
        }


        if (
            role ===
            "store-keeper"
        ) {

            hideCards([

                "totalSales",

                "totalRevenue",

                "totalExpenses",

                "totalCOGS",

                "grossProfit",

                "netProfit",

                "totalCustomers"

            ]);


            hideElement(
                "recentSalesPanel"
            );


            applyQuickActionPermissions();

            return;
        }


        if (
            role ===
            "accountant"
        ) {

            hideCards([

                "totalProducts",

                "totalStockQuantity",

                "stockValue",

                "lowStockCount",

                "totalCustomers",

                "totalSuppliers"

            ]);


            hideElement(
                "lowStockPanel"
            );


            applyQuickActionPermissions();

            return;
        }


        hideCards([

            "totalProducts",

            "totalStockQuantity",

            "stockValue",

            "lowStockCount",

            "totalExpenses",

            "totalCOGS",

            "grossProfit",

            "netProfit",

            "totalSuppliers"

        ]);


        hideElement(
            "lowStockPanel"
        );


        applyQuickActionPermissions();
    }


    /* ==========================================
       QUICK ACTION PERMISSIONS
    ========================================== */

    function applyQuickActionPermissions() {

        const actions =
            document.querySelectorAll(
                ".quick-action[data-permission]"
            );


        actions.forEach(
            function (action) {

                const permission =
                    action.getAttribute(
                        "data-permission"
                    );


                let allowed =
                    false;


                if (
                    window.JufelixPermissions &&
                    typeof window
                        .JufelixPermissions
                        .hasPermission ===
                        "function"
                ) {

                    allowed =
                        window
                            .JufelixPermissions
                            .hasPermission(
                                permission
                            );

                } else {

                    allowed =
                        normalizeRole(
                            getCurrentUser().role
                        ) ===
                        "admin";
                }


                action.style.display =
                    allowed
                        ? "flex"
                        : "none";
            }
        );


        setLinkPermission(
            'a[href="sales.html"]',
            "sales"
        );


        setLinkPermission(
            '#lowStockPanel a[href="inventory.html"]',
            "inventory"
        );
    }


    function setLinkPermission(
        selector,
        permission
    ) {

        const links =
            document.querySelectorAll(
                selector
            );


        links.forEach(
            function (link) {

                if (
                    link.classList.contains(
                        "sidebar-link"
                    ) ||
                    link.classList.contains(
                        "quick-action"
                    )
                ) {

                    return;
                }


                const allowed =
                    window.JufelixPermissions &&
                    typeof window
                        .JufelixPermissions
                        .hasPermission ===
                        "function"

                        ? window
                            .JufelixPermissions
                            .hasPermission(
                                permission
                            )

                        : normalizeRole(
                            getCurrentUser().role
                        ) ===
                            "admin";


                link.style.display =
                    allowed
                        ? ""
                        : "none";
            }
        );
    }


    /* ==========================================
       RESET VISIBILITY
    ========================================== */

    function resetDashboardVisibility() {

        document
            .querySelectorAll(
                ".stat-card, " +
                ".dashboard-panel, " +
                ".quick-action"
            )
            .forEach(
                function (element) {

                    element.style.display =
                        "";
                }
            );
    }


    function hideCards(
        ids
    ) {

        ids.forEach(
            hideCard
        );
    }


    function hideCard(
        elementId
    ) {

        const element =
            document.getElementById(
                elementId
            );


        if (!element) {

            return;
        }


        const card =
            element.closest(
                ".stat-card"
            );


        if (card) {

            card.style.display =
                "none";
        }
    }


    function hideElement(
        id
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.style.display =
                "none";
        }
    }


    /* ==========================================
       WELCOME MESSAGE
    ========================================== */

    function updateWelcomeMessage(
        currentUser
    ) {

        const element =
            document.getElementById(
                "welcomeUser"
            );


        if (!element) {

            return;
        }


        const fullName =
            currentUser.fullName ||
            currentUser.name ||
            currentUser.email ||
            currentUser.username ||
            "User";


        const role =
            formatRole(
                currentUser.role
            );


        const branchName =
            getDashboardBranchName(
                currentUser
            );


        element.textContent =
            `Welcome, ${fullName} — ` +
            `${role} at ${branchName}`;
    }


    function getDashboardBranchName(
        user
    ) {

        const branchId =
            getActiveBranchId(
                user
            );


        if (
            isCompanyWideView(
                user,
                branchId
            )
        ) {

            return "All Branches";
        }


        if (
            normalizeRole(
                user.role
            ) !==
                "admin" &&
            user.branchName
        ) {

            return user.branchName;
        }


        const activeBranch =
            readActiveBranch();


        if (activeBranch) {

            return (
                activeBranch.branchName ||
                activeBranch.name ||
                user.branchName ||
                "Head Office"
            );
        }


        return (
            user.branchName ||
            "Head Office"
        );
    }


    /* ==========================================
       PRODUCT QUANTITY
    ========================================== */

    function getProductQuantity(
        product,
        branchId,
        companyWide
    ) {

        if (!product) {

            return 0;
        }


        const branchStock =
            product.branchStock;


        if (
            branchStock &&
            typeof branchStock ===
                "object" &&
            !Array.isArray(
                branchStock
            )
        ) {

            if (companyWide) {

                return Object
                    .values(
                        branchStock
                    )
                    .reduce(
                        function (
                            total,
                            quantity
                        ) {

                            return (
                                total +
                                toNumber(
                                    quantity
                                )
                            );
                        },
                        0
                    );
            }


            return toNumber(
                branchStock[
                    branchId
                ]
            );
        }


        if (
            companyWide ||
            String(
                branchId
            ) ===
                DEFAULT_BRANCH_ID
        ) {

            return toNumber(
                product.quantity
            );
        }


        return 0;
    }


    function getLowStockLevel(
        product
    ) {

        const value =
            product.lowStock ??
            product.lowStockLevel ??
            5;


        return toNumber(
            value
        );
    }


    /* ==========================================
       LOW STOCK TABLE
    ========================================== */

    function displayLowStockProducts(
        products,
        branchId,
        companyWide
    ) {

        const tableBody =
            document.getElementById(
                "lowStockTable"
            );


        if (!tableBody) {

            return;
        }


        if (
            products.length ===
            0
        ) {

            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="dashboard-empty"
                    >
                        No low-stock products.
                    </td>
                </tr>
            `;


            return;
        }


        const sorted =
            products
                .slice()
                .sort(
                    function (
                        first,
                        second
                    ) {

                        return (

                            getProductQuantity(
                                first,
                                branchId,
                                companyWide
                            ) -

                            getProductQuantity(
                                second,
                                branchId,
                                companyWide
                            )
                        );
                    }
                )
                .slice(
                    0,
                    8
                );


        tableBody.innerHTML =
            sorted
                .map(
                    function (product) {

                        const quantity =
                            getProductQuantity(
                                product,
                                branchId,
                                companyWide
                            );


                        const lowLevel =
                            getLowStockLevel(
                                product
                            );


                        const status =
                            quantity <= 0
                                ? "Out of Stock"
                                : "Low Stock";


                        const statusClass =
                            quantity <= 0
                                ? "status-danger"
                                : "status-warning";


                        return `
                            <tr>

                                <td>
                                    ${escapeHTML(
                                        product.name ||
                                        "Unnamed Product"
                                    )}
                                </td>

                                <td>
                                    ${formatNumber(
                                        quantity
                                    )}
                                    ${escapeHTML(
                                        product.unit ||
                                        ""
                                    )}
                                </td>

                                <td>
                                    ${formatNumber(
                                        lowLevel
                                    )}
                                </td>

                                <td>
                                    <span
                                        class="${statusClass}"
                                    >
                                        ${status}
                                    </span>
                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");
    }


    /* ==========================================
       RECENT SALES
    ========================================== */

    function displayRecentSales(
        sales
    ) {

        const tableBody =
            document.getElementById(
                "recentSales"
            );


        if (!tableBody) {

            return;
        }


        if (
            sales.length ===
            0
        ) {

            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="dashboard-empty"
                    >
                        No sales have been recorded.
                    </td>
                </tr>
            `;


            return;
        }


        const recentSales =
            sales
                .slice()
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
                )
                .slice(
                    0,
                    8
                );


        tableBody.innerHTML =
            recentSales
                .map(
                    function (sale) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHTML(
                                        formatDate(
                                            sale.createdAt ||
                                            sale.saleDate ||
                                            sale.date
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        sale.receiptNumber ||
                                        sale.receipt ||
                                        sale.id ||
                                        "—"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        sale.customerName ||
                                        sale.customer ||
                                        "Walk-in Customer"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        sale.paymentMethod ||
                                        "Cash"
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${formatMoney(
                                            getSaleTotal(
                                                sale
                                            )
                                        )}
                                    </strong>
                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");
    }


    /* ==========================================
       BRANCH FILTERING
    ========================================== */

    function filterByBranch(
        records,
        branchId
    ) {

        return records.filter(
            function (record) {

                return (
                    String(
                        getRecordBranchId(
                            record
                        )
                    ) ===
                    String(
                        branchId
                    )
                );
            }
        );
    }


    function getRecordBranchId(
        record
    ) {

        return String(

            record.branchId ||

            record.branchID ||

            record.activeBranchId ||

            record.branch ||

            DEFAULT_BRANCH_ID
        );
    }


    function filterCustomersByBranch(
        customers,
        branchId
    ) {

        return customers.filter(
            function (customer) {

                if (
                    customer.shared ===
                    true
                ) {

                    return true;
                }


                return (
                    String(
                        getRecordBranchId(
                            customer
                        )
                    ) ===
                    String(
                        branchId
                    )
                );
            }
        );
    }


    function filterSuppliersByBranch(
        suppliers,
        branchId
    ) {

        return suppliers.filter(
            function (supplier) {

                if (
                    supplier.shared ===
                    true
                ) {

                    return true;
                }


                return (
                    String(
                        getRecordBranchId(
                            supplier
                        )
                    ) ===
                    String(
                        branchId
                    )
                );
            }
        );
    }


    /* ==========================================
       CURRENT USER
    ========================================== */

    function getCurrentUser() {

        return (

            readObject(
                CURRENT_USER_KEY
            ) ||

            readObject(
                "currentUser"
            ) ||

            {}
        );
    }


    /* ==========================================
       ACTIVE BRANCH
    ========================================== */

    function readActiveBranch() {

        try {

            const stored =
                localStorage.getItem(
                    ACTIVE_BRANCH_KEY
                );


            if (!stored) {

                return null;
            }


            try {

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


                if (
                    typeof parsed ===
                    "string"
                ) {

                    return {
                        id:
                            parsed
                    };
                }

            } catch (error) {

                return {
                    id:
                        stored
                };
            }


            return null;

        } catch (error) {

            return null;
        }
    }


    function getActiveBranchId(
        user
    ) {

        const role =
            normalizeRole(
                user.role
            );


        if (
            role !==
                "admin" &&
            user.branchId
        ) {

            return String(
                user.branchId
            );
        }


        const activeBranch =
            readActiveBranch();


        if (
            activeBranch &&
            activeBranch.id
        ) {

            return String(
                activeBranch.id
            );
        }


        if (
            user.branchId
        ) {

            return String(
                user.branchId
            );
        }


        return DEFAULT_BRANCH_ID;
    }


    function isCompanyWideView(
        user,
        branchId
    ) {

        if (
            normalizeRole(
                user.role
            ) !==
            "admin"
        ) {

            return false;
        }


        const value =
            String(
                branchId ||
                ""
            )
                .trim()
                .toLowerCase();


        return (

            value ===
                "all" ||

            value ===
                "all-branches" ||

            value ===
                "company-wide"
        );
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
            value ||
            "unknown"
        );
    }


    function formatRole(
        role
    ) {

        const normalized =
            normalizeRole(
                role
            );


        const roles = {

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
            roles[
                normalized
            ] ||
            role ||
            "User"
        );
    }


    /* ==========================================
       FINANCIAL APPEARANCE
    ========================================== */

    function updateProfitAppearance(
        value
    ) {

        updateFinancialAppearance(
            "netProfit",
            value
        );
    }


    function updateFinancialAppearance(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );


        if (!element) {

            return;
        }


        element.classList.remove(
            "positive-value",
            "negative-value"
        );


        if (
            value > 0
        ) {

            element.classList.add(
                "positive-value"
            );

        } else if (
            value < 0
        ) {

            element.classList.add(
                "negative-value"
            );
        }
    }


    /* ==========================================
       STORAGE
    ========================================== */

    function readArray(
        key
    ) {

        try {

            const stored =
                localStorage.getItem(
                    key
                );


            if (!stored) {

                return [];
            }


            const parsed =
                JSON.parse(
                    stored
                );


            return Array.isArray(
                parsed
            )
                ? parsed
                : [];

        } catch (error) {

            console.error(
                "Dashboard storage error:",
                key,
                error
            );


            return [];
        }
    }


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

            return null;
        }
    }


    /* ==========================================
       FORMATTERS
    ========================================== */

    function updateText(
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


    function formatMoney(
        value
    ) {

        const settings =
            readObject(
                "jufelix_v7_settings"
            );


        const currency =
            settings &&
            settings.currency
                ? settings.currency
                : "GHS";


        try {

            return new Intl.NumberFormat(
                "en-GH",
                {

                    style:
                        "currency",

                    currency:
                        currency,

                    minimumFractionDigits:
                        2

                }
            ).format(
                toNumber(
                    value
                )
            );

        } catch (error) {

            return (
                "GH₵" +
                toNumber(
                    value
                ).toFixed(
                    2
                )
            );
        }
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


    function formatDate(
        value
    ) {

        if (!value) {

            return "—";
        }


        let date;


        if (
            /^\d{4}-\d{2}-\d{2}$/.test(
                String(
                    value
                )
            )
        ) {

            date =
                new Date(
                    value +
                    "T00:00:00"
                );

        } else {

            date =
                new Date(
                    value
                );
        }


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return String(
                value
            );
        }


        return date.toLocaleDateString(
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


    function getTimestamp(
        record
    ) {

        const value =
            record.createdAt ||
            record.saleDate ||
            record.date ||
            record.updatedAt;


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


    function toNumber(
        value
    ) {

        if (
            value ===
            null ||
            value ===
            undefined ||
            value ===
            ""
        ) {

            return 0;
        }


        const cleaned =
            typeof value ===
                "string"

                ? value
                    .replace(
                        /,/g,
                        ""
                    )
                    .trim()

                : value;


        const number =
            Number(
                cleaned
            );


        return Number.isFinite(
            number
        )
            ? number
            : 0;
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
       PUBLIC API
    ========================================== */

    window.JufelixDashboard = {

        refresh:
            refreshEverything,


        scheduleRefresh:
            scheduleRefresh,


        applyPermissions:
            function () {

                applyDashboardPermissions(
                    getCurrentUser()
                );
            },


        getFinancialSummary:
            function () {

                const products =
                    readArray(
                        PRODUCTS_KEY
                    );


                const sales =
                    readArray(
                        SALES_KEY
                    )
                        .filter(
                            isValidTransaction
                        );


                const expenses =
                    readArray(
                        EXPENSES_KEY
                    )
                        .filter(
                            isValidTransaction
                        );


                const revenue =
                    sales.reduce(
                        function (
                            total,
                            sale
                        ) {

                            return (
                                total +
                                getSaleTotal(
                                    sale
                                )
                            );
                        },
                        0
                    );


                const cogs =
                    sales.reduce(
                        function (
                            total,
                            sale
                        ) {

                            return (
                                total +
                                getSaleCost(
                                    sale,
                                    products
                                )
                            );
                        },
                        0
                    );


                const expenseTotal =
                    expenses.reduce(
                        function (
                            total,
                            expense
                        ) {

                            return (
                                total +
                                getExpenseTotal(
                                    expense
                                )
                            );
                        },
                        0
                    );


                return {

                    revenue:
                        revenue,

                    cogs:
                        cogs,

                    grossProfit:
                        revenue -
                        cogs,

                    expenses:
                        expenseTotal,

                    netProfit:
                        revenue -
                        cogs -
                        expenseTotal

                };
            }

    };


})();