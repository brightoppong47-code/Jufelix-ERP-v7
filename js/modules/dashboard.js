/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   Dashboard Module

   Role-Aware
   Branch-Aware
   Permission-Aware

   File:
   js/modules/dashboard.js
========================================== */

(function () {
    "use strict";

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


    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboard
    );


    document.addEventListener(
        "jufelix:data-updated",
        refreshDashboard
    );


    document.addEventListener(
        "jufelix:dataChanged",
        refreshDashboard
    );


    /* ==========================================
       INITIALIZE
    ========================================== */

    function initializeDashboard() {

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
       REFRESH
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


        /*
         * If Admin deliberately selects an
         * "all branches" view, show everything.
         *
         * Otherwise everyone sees the
         * currently active/assigned branch.
         */

        const sales =
            companyWide
                ? allSales
                : filterByBranch(
                    allSales,
                    branchId
                );


        const expenses =
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
           INVENTORY
        ====================================== */

        const visibleProducts =
            allProducts.filter(
                function (product) {

                    const quantity =
                        getProductQuantity(
                            product,
                            branchId,
                            companyWide
                        );

                    /*
                     * Keep products that are
                     * registered at the branch,
                     * including zero-stock items,
                     * so low-stock warnings work.
                     */

                    if (companyWide) {
                        return true;
                    }

                    if (
                        product.branchStock &&
                        typeof product.branchStock ===
                            "object" &&
                        !Array.isArray(
                            product.branchStock
                        )
                    ) {

                        return Object.prototype
                            .hasOwnProperty.call(
                                product.branchStock,
                                branchId
                            );
                    }

                    return (
                        branchId ===
                        DEFAULT_BRANCH_ID
                    );
                }
            );


        const totalProducts =
            visibleProducts.filter(
                function (product) {

                    return (
                        getProductQuantity(
                            product,
                            branchId,
                            companyWide
                        ) > 0
                    );
                }
            ).length;


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
           SALES
        ====================================== */

        const completedSales =
            sales.filter(
                function (sale) {

                    const status =
                        String(
                            sale.status ||
                            "completed"
                        )
                            .trim()
                            .toLowerCase();


                    return (
                        status !==
                        "cancelled"
                    );
                }
            );


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
           EXPENSES
        ====================================== */

        const totalExpenses =
            expenses.reduce(
                function (
                    total,
                    expense
                ) {

                    return (
                        total +
                        toNumber(
                            expense.amount ??
                            expense.total ??
                            expense.totalAmount
                        )
                    );
                },
                0
            );


        /*
         * Current Dashboard profit is:
         *
         * Sales Revenue - Expenses
         *
         * Later we can upgrade this to true
         * gross/net profit using Cost of Goods
         * Sold from the stock ledger.
         */

        const netProfit =
            totalSalesValue -
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


        updateProfitAppearance(
            netProfit
        );


        displayLowStockProducts(
            lowStockProducts,
            branchId,
            companyWide
        );


        displayRecentSales(
            completedSales
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


        /*
         * ADMIN
         */

        if (
            role ===
            "admin"
        ) {

            applyQuickActionPermissions();

            return;
        }


        /*
         * MANAGER
         *
         * Operational figures allowed,
         * but Net Profit stays hidden.
         */

        if (
            role ===
            "manager"
        ) {

            hideCard(
                "netProfit"
            );

            applyQuickActionPermissions();

            return;
        }


        /*
         * SALES OFFICER / CASHIER
         */

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
                "netProfit",
                "totalSuppliers"
            ]);


            hideElement(
                "lowStockPanel"
            );


            applyQuickActionPermissions();

            return;
        }


        /*
         * STORE KEEPER
         */

        if (
            role ===
            "store-keeper"
        ) {

            hideCards([
                "totalSales",
                "totalRevenue",
                "totalExpenses",
                "netProfit",
                "totalCustomers"
            ]);


            hideElement(
                "recentSalesPanel"
            );


            applyQuickActionPermissions();

            return;
        }


        /*
         * ACCOUNTANT
         */

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


        /*
         * UNKNOWN ROLE:
         * safest dashboard.
         */

        hideCards([
            "totalProducts",
            "totalStockQuantity",
            "stockValue",
            "lowStockCount",
            "totalExpenses",
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


        /*
         * Recent Sales "View Sales"
         */

        setLinkPermission(
            'a[href="sales.html"]',
            "sales"
        );


        /*
         * Low Stock "View Inventory"
         */

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
            readObject(
                ACTIVE_BRANCH_KEY
            );


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


        /*
         * Backwards compatibility.
         * Old products are treated as
         * Head Office stock.
         */

        if (
            companyWide ||
            branchId ===
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

                const recordBranchId =
                    getRecordBranchId(
                        record
                    );


                return (
                    String(
                        recordBranchId
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
                    getRecordBranchId(
                        customer
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
                    getRecordBranchId(
                        supplier
                    ) ===
                    String(
                        branchId
                    )
                );
            }
        );
    }


    /* ==========================================
       CURRENT USER / BRANCH
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


    function getActiveBranchId(
        user
    ) {

        const role =
            normalizeRole(
                user.role
            );


        /*
         * Non-admin users can never switch
         * away from their assigned branch.
         */

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
       PROFIT DISPLAY
    ========================================== */

    function updateProfitAppearance(
        value
    ) {

        const element =
            document.getElementById(
                "netProfit"
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
       SALES HELPERS
    ========================================== */

    function getSaleTotal(
        sale
    ) {

        return toNumber(
            sale.total ??
            sale.grandTotal ??
            sale.totalAmount ??
            sale.amount
        );
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
            value === null ||
            value === undefined ||
            value === ""
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
            function () {

                updateWelcomeMessage(
                    getCurrentUser()
                );

                applyDashboardPermissions(
                    getCurrentUser()
                );

                refreshDashboard();
            },

        applyPermissions:
            function () {

                applyDashboardPermissions(
                    getCurrentUser()
                );
            }
    };

})();