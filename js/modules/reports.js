/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   REPORTS & ANALYTICS MODULE v2

   COMPLETE REPLACEMENT

   File:
   js/modules/reports.js

   + Firebase/localStorage refresh
   + Branch dropdown anti-blinking
   + New Firebase branches appear automatically
   + Sales v1011 compatible
   + Multi-item sales compatible
   + Correct COGS
   + Correct Gross Profit
   + Correct Net Profit
   + Cancelled / Canceled / Void / Voided excluded
   + Draft purchases excluded
   + Robust branch-stock matching
   + Branch ID / Code / Name compatibility
   + No false low-stock branches
   + Branch-aware reports
   + Sales / Purchases / Expenses
   + Inventory Value
   + Low Stock
   + Branch Performance
   + Recent Transactions
   + Supplier Payments
   + Transfers
   + PDF Preview
   + CSV Export
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

    const PURCHASES_KEY =
        "jufelix_v7_purchases";

    const EXPENSES_KEY =
        "jufelix_v7_expenses";

    const BRANCHES_KEY =
        "jufelix_v7_branches";

    const TRANSFERS_KEY =
        "jufelix_v7_transfers";

    const DEFAULT_BRANCH_ID =
        "head-office";


    const PAYMENT_KEYS = [

        "jufelix_v7_payments",

        "jufelix_v7_supplier_payments"

    ];


    const PDF_STORAGE_KEY =
        "jufelix_v7_pdf_preview";

    const PDF_FILENAME_KEY =
        "jufelix_v7_pdf_filename";


    /* ==========================================
       STATE
    ========================================== */

    let products = [];

    let sales = [];

    let purchases = [];

    let expenses = [];

    let branches = [];

    let transfers = [];

    let payments = [];


    let filteredSales = [];

    let filteredPurchases = [];

    let filteredExpenses = [];

    let filteredTransfers = [];

    let filteredPayments = [];


    const el = {};


    /* ==========================================
       INITIALIZE
    ========================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeReports
        );

    } else {

        initializeReports();
    }


    function initializeReports() {

        cacheElements();

        loadData();

        ensureHeadOffice();

        populateBranchFilter();

        connectEvents();


        if (
            el.period &&
            el.startDate &&
            el.endDate &&
            !el.startDate.value &&
            !el.endDate.value
        ) {

            el.period.value =
                "month";


            applyQuickPeriod(
                "month"
            );
        }


        refreshReports();


        console.log(
            "✅ Jufelix Reports & Analytics v2 loaded."
        );
    }


    /* ==========================================
       ELEMENTS
    ========================================== */

    function cacheElements() {

        el.period =
            document.getElementById(
                "reportPeriod"
            );


        el.startDate =
            document.getElementById(
                "reportStartDate"
            );


        el.endDate =
            document.getElementById(
                "reportEndDate"
            );


        el.branch =
            document.getElementById(
                "reportBranch"
            );


        el.pdfButton =
            document.getElementById(
                "printReportButton"
            );


        el.csvButton =
            document.getElementById(
                "exportReportButton"
            );


        el.salesByProductTable =
            document.getElementById(
                "salesByProductTable"
            );


        el.branchPerformanceTable =
            document.getElementById(
                "branchPerformanceTable"
            );


        el.expenseBreakdownTable =
            document.getElementById(
                "expenseBreakdownTable"
            );


        el.lowStockReportTable =
            document.getElementById(
                "lowStockReportTable"
            );


        el.recentTransactionsTable =
            document.getElementById(
                "recentTransactionsTable"
            );
    }


    /* ==========================================
       EVENTS
    ========================================== */

    function connectEvents() {

        if (el.period) {

            el.period.addEventListener(
                "change",
                function () {

                    applyQuickPeriod(
                        el.period.value
                    );


                    refreshReports();
                }
            );
        }


        if (el.startDate) {

            el.startDate.addEventListener(
                "change",
                function () {

                    if (el.period) {

                        el.period.value =
                            "";
                    }


                    refreshReports();
                }
            );
        }


        if (el.endDate) {

            el.endDate.addEventListener(
                "change",
                function () {

                    if (el.period) {

                        el.period.value =
                            "";
                    }


                    refreshReports();
                }
            );
        }


        if (el.branch) {

            el.branch.addEventListener(
                "change",
                function () {

                    /*
                     * Important:
                     * Do not rebuild branch dropdown here.
                     */

                    refreshReports();
                }
            );
        }


        if (el.pdfButton) {

            el.pdfButton.addEventListener(
                "click",
                generatePdfPreview
            );
        }


        if (el.csvButton) {

            el.csvButton.addEventListener(
                "click",
                exportCsvReport
            );
        }


        /* ======================================
           SAME PAGE / FIREBASE
        ====================================== */

        document.addEventListener(
            "jufelix:data-updated",
            handleReportDataUpdate
        );


        document.addEventListener(
            "jufelix:dataChanged",
            handleReportDataUpdate
        );


        /* ======================================
           OTHER BROWSER TAB
        ====================================== */

        window.addEventListener(
            "storage",
            function (event) {

                if (
                    event.key ===
                    BRANCHES_KEY
                ) {

                    loadData();

                    ensureHeadOffice();

                    populateBranchFilter();

                    refreshReports();

                    return;
                }


                const reportKeys = [

                    PRODUCTS_KEY,

                    SALES_KEY,

                    PURCHASES_KEY,

                    EXPENSES_KEY,

                    TRANSFERS_KEY,

                    ...PAYMENT_KEYS

                ];


                if (
                    reportKeys.includes(
                        event.key
                    )
                ) {

                    refreshReports();
                }
            }
        );
    }


    /* ==========================================
       DATA UPDATE
    ========================================== */

    function handleReportDataUpdate(
        event
    ) {

        const detail =
            event &&
            event.detail
                ? event.detail
                : {};


        if (
            detail.key ===
            BRANCHES_KEY
        ) {

            loadData();

            ensureHeadOffice();

            populateBranchFilter();

            refreshReports();

            return;
        }


        const reportKeys = [

            PRODUCTS_KEY,

            SALES_KEY,

            PURCHASES_KEY,

            EXPENSES_KEY,

            TRANSFERS_KEY,

            ...PAYMENT_KEYS

        ];


        if (
            !detail.key ||
            reportKeys.includes(
                detail.key
            )
        ) {

            refreshReports();
        }
    }


    /* ==========================================
       LOAD DATA
    ========================================== */

    function loadData() {

        products =
            readArray(
                PRODUCTS_KEY
            );


        sales =
            readArray(
                SALES_KEY
            );


        purchases =
            readArray(
                PURCHASES_KEY
            );


        expenses =
            readArray(
                EXPENSES_KEY
            );


        branches =
            readArray(
                BRANCHES_KEY
            );


        transfers =
            readArray(
                TRANSFERS_KEY
            );


        payments =
            readCombinedArrays(
                PAYMENT_KEYS
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
                            branch.id ||
                            ""
                        ) ===
                        DEFAULT_BRANCH_ID ||

                        branch.isHeadOffice ===
                        true ||

                        normalizeComparable(
                            branch.type
                        ) ===
                        DEFAULT_BRANCH_ID
                    );
                }
            );


        if (!exists) {

            branches.unshift({

                id:
                    DEFAULT_BRANCH_ID,

                branchId:
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
        }
    }


    /* ==========================================
       BRANCH FILTER
    ========================================== */

    function populateBranchFilter() {

        if (!el.branch) {

            return;
        }


        const previousValue =
            el.branch.value;


        const activeBranches =
            branches
                .filter(
                    function (branch) {

                        return (
                            normalizeComparable(
                                branch.status ||
                                "active"
                            ) ===
                            "active"
                        );
                    }
                )
                .sort(
                    function (a, b) {

                        if (
                            getCanonicalBranchId(
                                a
                            ) ===
                            DEFAULT_BRANCH_ID
                        ) {

                            return -1;
                        }


                        if (
                            getCanonicalBranchId(
                                b
                            ) ===
                            DEFAULT_BRANCH_ID
                        ) {

                            return 1;
                        }


                        return getBranchName(
                            a
                        ).localeCompare(
                            getBranchName(
                                b
                            )
                        );
                    }
                );


        const newOptions = [

            {
                value:
                    "",

                label:
                    "All Branches"
            },

            ...activeBranches.map(
                function (branch) {

                    return {

                        value:
                            getCanonicalBranchId(
                                branch
                            ),

                        label:
                            getBranchName(
                                branch
                            )
                    };
                }
            )
        ];


        const currentOptions =
            Array.from(
                el.branch.options
            ).map(
                function (option) {

                    return {

                        value:
                            option.value,

                        label:
                            option.textContent
                                .trim()
                    };
                }
            );


        /*
         * Anti blinking:
         * only rebuild when options changed.
         */

        if (
            JSON.stringify(
                currentOptions
            ) ===
            JSON.stringify(
                newOptions
            )
        ) {

            return;
        }


        el.branch.innerHTML =
            newOptions
                .map(
                    function (option) {

                        return (
                            '<option value="' +
                            escapeHTML(
                                option.value
                            ) +
                            '">' +
                            escapeHTML(
                                option.label
                            ) +
                            "</option>"
                        );
                    }
                )
                .join("");


        const previousExists =
            newOptions.some(
                function (option) {

                    return (
                        String(
                            option.value
                        ) ===
                        String(
                            previousValue
                        )
                    );
                }
            );


        el.branch.value =
            previousExists
                ? previousValue
                : "";
    }


    /* ==========================================
       QUICK PERIOD
    ========================================== */

    function applyQuickPeriod(
        period
    ) {

        const today =
            new Date();


        let start =
            new Date(
                today
            );


        let end =
            new Date(
                today
            );


        if (
            period ===
            "all"
        ) {

            if (el.startDate) {

                el.startDate.value =
                    "";
            }


            if (el.endDate) {

                el.endDate.value =
                    "";
            }


            return;
        }


        switch (period) {

            case "today":

                break;


            case "week": {

                const day =
                    today.getDay();


                const mondayOffset =
                    day === 0
                        ? -6
                        : 1 - day;


                start.setDate(
                    today.getDate() +
                    mondayOffset
                );


                break;
            }


            case "month":

                start =
                    new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        1
                    );

                break;


            case "year":

                start =
                    new Date(
                        today.getFullYear(),
                        0,
                        1
                    );

                break;


            default:

                return;
        }


        if (el.startDate) {

            el.startDate.value =
                dateKey(
                    start
                );
        }


        if (el.endDate) {

            el.endDate.value =
                dateKey(
                    end
                );
        }
    }


    /* ==========================================
       INVALID TRANSACTIONS
    ========================================== */

    function isInvalidStatus(
        status
    ) {

        const value =
            normalizeComparable(
                status
            );


        return [

            "cancelled",

            "canceled",

            "void",

            "voided",

            "deleted"

        ].includes(
            value
        );
    }


    function isInvalidPurchaseStatus(
        status
    ) {

        const value =
            normalizeComparable(
                status ||
                "received"
            );


        return (

            value ===
                "draft" ||

            isInvalidStatus(
                value
            )
        );
    }


    /* ==========================================
       REFRESH REPORTS
    ========================================== */

    function refreshReports() {

        loadData();

        ensureHeadOffice();


        const filters =
            getFilters();


        /* ======================================
           SALES
        ====================================== */

        filteredSales =
            sales.filter(
                function (sale) {

                    if (
                        isInvalidStatus(
                            sale.status ||
                            "completed"
                        )
                    ) {

                        return false;
                    }


                    return recordMatchesFilters(
                        getRecordDate(
                            sale
                        ),
                        getRecordBranchId(
                            sale
                        ),
                        filters
                    );
                }
            );


        /* ======================================
           PURCHASES
        ====================================== */

        filteredPurchases =
            purchases.filter(
                function (purchase) {

                    if (
                        isInvalidPurchaseStatus(
                            purchase.status
                        )
                    ) {

                        return false;
                    }


                    return recordMatchesFilters(
                        getRecordDate(
                            purchase
                        ),
                        getRecordBranchId(
                            purchase
                        ),
                        filters
                    );
                }
            );


        /* ======================================
           EXPENSES
        ====================================== */

        filteredExpenses =
            expenses.filter(
                function (expense) {

                    if (
                        isInvalidStatus(
                            expense.status ||
                            "completed"
                        )
                    ) {

                        return false;
                    }


                    return recordMatchesFilters(
                        getRecordDate(
                            expense
                        ),
                        getRecordBranchId(
                            expense
                        ),
                        filters
                    );
                }
            );


        /* ======================================
           PAYMENTS
        ====================================== */

        filteredPayments =
            payments.filter(
                function (payment) {

                    if (
                        isInvalidStatus(
                            payment.status ||
                            "completed"
                        )
                    ) {

                        return false;
                    }


                    return recordMatchesFilters(
                        getRecordDate(
                            payment
                        ),
                        getRecordBranchId(
                            payment
                        ),
                        filters
                    );
                }
            );


        /* ======================================
           TRANSFERS
        ====================================== */

        filteredTransfers =
            transfers.filter(
                function (transfer) {

                    if (
                        isInvalidStatus(
                            transfer.status ||
                            "completed"
                        )
                    ) {

                        return false;
                    }


                    const dateMatches =
                        isDateInRange(
                            getRecordDate(
                                transfer
                            ),
                            filters.startDate,
                            filters.endDate
                        );


                    const fromBranchId =
                        resolveBranchIdFromValue(
                            transfer.fromBranchId ||
                            transfer.fromBranch ||
                            transfer.fromBranchName
                        );


                    const toBranchId =
                        resolveBranchIdFromValue(
                            transfer.toBranchId ||
                            transfer.toBranch ||
                            transfer.toBranchName
                        );


                    const branchMatches =
                        !filters.branchId ||

                        String(
                            fromBranchId
                        ) ===
                        String(
                            filters.branchId
                        ) ||

                        String(
                            toBranchId
                        ) ===
                        String(
                            filters.branchId
                        );


                    return (
                        dateMatches &&
                        branchMatches
                    );
                }
            );


        updateSummaryCards(
            filters
        );


        renderSalesByProduct();

        renderBranchPerformance();

        renderExpenseBreakdown();

        renderLowStockReport(
            filters
        );

        renderRecentTransactions();
    }


    /* ==========================================
       FILTERS
    ========================================== */

    function getFilters() {

        return {

            startDate:
                el.startDate
                    ? el.startDate.value
                    : "",

            endDate:
                el.endDate
                    ? el.endDate.value
                    : "",

            branchId:
                el.branch
                    ? el.branch.value
                    : ""
        };
    }


    function recordMatchesFilters(
        recordDate,
        branchId,
        filters
    ) {

        const resolvedBranchId =
            resolveBranchIdFromValue(
                branchId ||
                DEFAULT_BRANCH_ID
            );


        return (

            isDateInRange(
                recordDate,
                filters.startDate,
                filters.endDate
            ) &&

            (
                !filters.branchId ||

                String(
                    resolvedBranchId
                ) ===
                String(
                    filters.branchId
                )
            )
        );
    }


    function isDateInRange(
        value,
        startDate,
        endDate
    ) {

        if (!value) {

            return false;
        }


        const normalized =
            normalizeDate(
                value
            );


        if (!normalized) {

            return false;
        }


        if (
            startDate &&
            normalized <
            startDate
        ) {

            return false;
        }


        if (
            endDate &&
            normalized >
            endDate
        ) {

            return false;
        }


        return true;
    }


    /* ==========================================
       SUMMARY
    ========================================== */

    function updateSummaryCards(
        filters
    ) {

        const totalSales =
            filteredSales.reduce(
                function (
                    total,
                    sale
                ) {

                    return (
                        total +
                        getSaleRevenue(
                            sale
                        )
                    );
                },
                0
            );


        const totalPurchases =
            filteredPurchases.reduce(
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


        const totalExpenses =
            filteredExpenses.reduce(
                function (
                    total,
                    expense
                ) {

                    return (
                        total +
                        getExpenseAmount(
                            expense
                        )
                    );
                },
                0
            );


        const totalCost =
            filteredSales.reduce(
                function (
                    total,
                    sale
                ) {

                    return (
                        total +
                        getSaleCost(
                            sale
                        )
                    );
                },
                0
            );


        /*
         * ACCOUNTING:
         *
         * Gross Profit =
         * Revenue - Cost of Goods Sold
         *
         * Net Profit =
         * Gross Profit - Expenses
         *
         * Purchases are not deducted again.
         */

        const grossProfit =
            totalSales -
            totalCost;


        const netProfit =
            grossProfit -
            totalExpenses;


        const itemsSold =
            filteredSales.reduce(
                function (
                    total,
                    sale
                ) {

                    return (
                        total +
                        getSaleQuantity(
                            sale
                        )
                    );
                },
                0
            );


        const inventoryValue =
            calculateInventoryValue(
                filters.branchId
            );


        const lowStockCount =
            buildLowStockRows(
                filters
            ).length;


        setMoney(
            "reportTotalSales",
            totalSales
        );


        setMoney(
            "reportTotalPurchases",
            totalPurchases
        );


        setMoney(
            "reportTotalExpenses",
            totalExpenses
        );


        setMoney(
            "reportGrossProfit",
            grossProfit
        );


        setMoney(
            "reportNetProfit",
            netProfit
        );


        setMoney(
            "reportInventoryValue",
            inventoryValue
        );


        setText(
            "reportItemsSold",
            formatNumber(
                itemsSold
            )
        );


        setText(
            "reportLowStockCount",
            formatNumber(
                lowStockCount
            )
        );


        updateFinancialAppearance(
            "reportGrossProfit",
            grossProfit
        );


        updateFinancialAppearance(
            "reportNetProfit",
            netProfit
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
            value >= 0
        ) {

            element.classList.add(
                "positive-value"
            );

        } else {

            element.classList.add(
                "negative-value"
            );
        }
    }


    /* ==========================================
       SALES HELPERS
    ========================================== */

    function getSaleItems(
        sale
    ) {

        if (
            Array.isArray(
                sale.items
            ) &&
            sale.items.length
        ) {

            return sale.items;
        }


        return [{

            productId:
                sale.productId,

            productName:
                sale.productName ||
                "Product",

            quantity:
                sale.quantity,

            sellingPrice:
                sale.sellingPrice ??
                sale.unitPrice ??
                sale.price,

            total:
                sale.total ??
                sale.totalAmount ??
                sale.revenue,

            costPrice:
                sale.costPrice ??
                sale.costPriceAtSale ??
                sale.unitCost,

            costTotal:
                sale.costTotal ??
                sale.cogs
        }];
    }


    function getSaleQuantity(
        sale
    ) {

        if (
            sale.totalQuantity !==
            undefined
        ) {

            return toNumber(
                sale.totalQuantity
            );
        }


        return getSaleItems(
            sale
        ).reduce(
            function (
                total,
                item
            ) {

                return (
                    total +
                    toNumber(
                        item.quantity
                    )
                );
            },
            0
        );
    }


    function getSaleRevenue(
        sale
    ) {

        if (
            sale.total !==
            undefined
        ) {

            return toNumber(
                sale.total
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
            sale.revenue !==
            undefined
        ) {

            return toNumber(
                sale.revenue
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


        return getSaleItems(
            sale
        ).reduce(
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


    function getSaleCost(
        sale
    ) {

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


        return getSaleItems(
            sale
        ).reduce(
            function (
                total,
                item
            ) {

                return (
                    total +
                    getSaleItemCost(
                        item
                    )
                );
            },
            0
        );
    }


    function getSaleItemRevenue(
        item
    ) {

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


    function getSaleItemCost(
        item
    ) {

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
            item.costPriceAtSale ??
            item.costPrice ??
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
                getProductById(
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


    /* ==========================================
       SALES BY PRODUCT
    ========================================== */

    function buildSalesByProductRows() {

        const grouped =
            {};


        filteredSales.forEach(
            function (sale) {

                getSaleItems(
                    sale
                ).forEach(
                    function (item) {

                        const key =
                            String(
                                item.productId ||
                                item.productName ||
                                "unknown"
                            );


                        if (
                            !grouped[
                                key
                            ]
                        ) {

                            grouped[
                                key
                            ] = {

                                productName:
                                    item.productName ||
                                    getProductName(
                                        item.productId
                                    ),

                                quantity:
                                    0,

                                revenue:
                                    0,

                                cost:
                                    0
                            };
                        }


                        grouped[
                            key
                        ].quantity +=
                            toNumber(
                                item.quantity
                            );


                        grouped[
                            key
                        ].revenue +=
                            getSaleItemRevenue(
                                item
                            );


                        grouped[
                            key
                        ].cost +=
                            getSaleItemCost(
                                item
                            );
                    }
                );
            }
        );


        return Object
            .values(
                grouped
            )
            .map(
                function (row) {

                    return {

                        productName:
                            row.productName,

                        quantity:
                            row.quantity,

                        revenue:
                            row.revenue,

                        estimatedCost:
                            row.cost,

                        grossProfit:
                            row.revenue -
                            row.cost
                    };
                }
            )
            .sort(
                function (a, b) {

                    return (
                        b.revenue -
                        a.revenue
                    );
                }
            );
    }


    function renderSalesByProduct() {

        if (
            !el.salesByProductTable
        ) {

            return;
        }


        const rows =
            buildSalesByProductRows();


        if (
            !rows.length
        ) {

            el.salesByProductTable.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="table-empty"
                    >
                        No sales data available for this period.
                    </td>
                </tr>
            `;


            return;
        }


        el.salesByProductTable.innerHTML =
            rows
                .map(
                    function (row) {

                        return `
                            <tr>

                                <td>
                                    <strong>
                                        ${escapeHTML(
                                            row.productName
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${formatNumber(
                                        row.quantity
                                    )}
                                </td>

                                <td>
                                    ${formatMoney(
                                        row.revenue
                                    )}
                                </td>

                                <td>
                                    ${formatMoney(
                                        row.estimatedCost
                                    )}
                                </td>

                                <td class="${
                                    row.grossProfit >= 0
                                        ? "positive-value"
                                        : "negative-value"
                                }">
                                    ${formatMoney(
                                        row.grossProfit
                                    )}
                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");
    }


    /* ==========================================
       BRANCH PERFORMANCE
    ========================================== */

    function buildBranchPerformanceRows() {

        const selectedBranch =
            el.branch
                ? el.branch.value
                : "";


        return branches
            .filter(
                function (branch) {

                    const branchId =
                        getCanonicalBranchId(
                            branch
                        );


                    return (

                        normalizeComparable(
                            branch.status ||
                            "active"
                        ) ===
                        "active" &&

                        (
                            !selectedBranch ||

                            String(
                                branchId
                            ) ===
                            String(
                                selectedBranch
                            )
                        )
                    );
                }
            )
            .map(
                function (branch) {

                    const branchId =
                        getCanonicalBranchId(
                            branch
                        );


                    const branchSales =
                        filteredSales.filter(
                            function (sale) {

                                return (
                                    String(
                                        resolveBranchIdFromValue(
                                            getRecordBranchId(
                                                sale
                                            )
                                        )
                                    ) ===
                                    String(
                                        branchId
                                    )
                                );
                            }
                        );


                    const branchExpenses =
                        filteredExpenses.filter(
                            function (expense) {

                                return (
                                    String(
                                        resolveBranchIdFromValue(
                                            getRecordBranchId(
                                                expense
                                            )
                                        )
                                    ) ===
                                    String(
                                        branchId
                                    )
                                );
                            }
                        );


                    const revenue =
                        branchSales.reduce(
                            function (
                                total,
                                sale
                            ) {

                                return (
                                    total +
                                    getSaleRevenue(
                                        sale
                                    )
                                );
                            },
                            0
                        );


                    const cost =
                        branchSales.reduce(
                            function (
                                total,
                                sale
                            ) {

                                return (
                                    total +
                                    getSaleCost(
                                        sale
                                    )
                                );
                            },
                            0
                        );


                    const expenseTotal =
                        branchExpenses.reduce(
                            function (
                                total,
                                expense
                            ) {

                                return (
                                    total +
                                    getExpenseAmount(
                                        expense
                                    )
                                );
                            },
                            0
                        );


                    const unitsSold =
                        branchSales.reduce(
                            function (
                                total,
                                sale
                            ) {

                                return (
                                    total +
                                    getSaleQuantity(
                                        sale
                                    )
                                );
                            },
                            0
                        );


                    return {

                        branchName:
                            getBranchName(
                                branch
                            ),

                        sales:
                            revenue,

                        expenses:
                            expenseTotal,

                        estimatedProfit:
                            revenue -
                            cost -
                            expenseTotal,

                        unitsSold:
                            unitsSold
                    };
                }
            )
            .sort(
                function (a, b) {

                    return (
                        b.sales -
                        a.sales
                    );
                }
            );
    }


    function renderBranchPerformance() {

        if (
            !el.branchPerformanceTable
        ) {

            return;
        }


        const rows =
            buildBranchPerformanceRows();


        if (
            !rows.length
        ) {

            el.branchPerformanceTable.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="table-empty"
                    >
                        No branch performance data available.
                    </td>
                </tr>
            `;


            return;
        }


        el.branchPerformanceTable.innerHTML =
            rows
                .map(
                    function (row) {

                        return `
                            <tr>

                                <td>
                                    <strong>
                                        ${escapeHTML(
                                            row.branchName
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${formatMoney(
                                        row.sales
                                    )}
                                </td>

                                <td>
                                    ${formatMoney(
                                        row.expenses
                                    )}
                                </td>

                                <td class="${
                                    row.estimatedProfit >= 0
                                        ? "positive-value"
                                        : "negative-value"
                                }">
                                    ${formatMoney(
                                        row.estimatedProfit
                                    )}
                                </td>

                                <td>
                                    ${formatNumber(
                                        row.unitsSold
                                    )}
                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");
    }


    /* ==========================================
       EXPENSE BREAKDOWN
    ========================================== */

    function getExpenseAmount(
        expense
    ) {

        return toNumber(

            expense.amount ??

            expense.total ??

            expense.totalAmount ??

            0
        );
    }


    function buildExpenseBreakdownRows() {

        const grouped =
            {};


        filteredExpenses.forEach(
            function (expense) {

                const category =
                    String(
                        expense.category ||
                        "miscellaneous"
                    )
                        .trim()
                        .toLowerCase();


                if (
                    !grouped[
                        category
                    ]
                ) {

                    grouped[
                        category
                    ] = {

                        category:
                            formatCategory(
                                category
                            ),

                        transactions:
                            0,

                        amount:
                            0
                    };
                }


                grouped[
                    category
                ].transactions +=
                    1;


                grouped[
                    category
                ].amount +=
                    getExpenseAmount(
                        expense
                    );
            }
        );


        return Object
            .values(
                grouped
            )
            .sort(
                function (a, b) {

                    return (
                        b.amount -
                        a.amount
                    );
                }
            );
    }


    function renderExpenseBreakdown() {

        if (
            !el.expenseBreakdownTable
        ) {

            return;
        }


        const rows =
            buildExpenseBreakdownRows();


        if (
            !rows.length
        ) {

            el.expenseBreakdownTable.innerHTML = `
                <tr>
                    <td
                        colspan="3"
                        class="table-empty"
                    >
                        No expense data available.
                    </td>
                </tr>
            `;


            return;
        }


        el.expenseBreakdownTable.innerHTML =
            rows
                .map(
                    function (row) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHTML(
                                        row.category
                                    )}
                                </td>

                                <td>
                                    ${formatNumber(
                                        row.transactions
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${formatMoney(
                                            row.amount
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
       INVENTORY VALUE
    ========================================== */

    function calculateInventoryValue(
        branchId
    ) {

        return products.reduce(
            function (
                total,
                product
            ) {

                let quantity =
                    0;


                if (
                    branchId
                ) {

                    /*
                     * A product that does not belong
                     * to a selected branch should
                     * contribute zero value.
                     */

                    if (
                        productExistsAtBranch(
                            product,
                            branchId
                        )
                    ) {

                        quantity =
                            getBranchStock(
                                product,
                                branchId
                            );
                    }


                } else {

                    if (
                        product.branchStock &&
                        typeof product.branchStock ===
                            "object" &&
                        !Array.isArray(
                            product.branchStock
                        ) &&
                        Object.keys(
                            product.branchStock
                        ).length >
                        0
                    ) {

                        quantity =
                            sumBranchStock(
                                product.branchStock
                            );

                    } else {

                        quantity =
                            toNumber(
                                product.quantity
                            );
                    }
                }


                return (
                    total +
                    quantity *
                    toNumber(
                        product.costPrice
                    )
                );
            },
            0
        );
    }


    /* ==========================================
       LOW STOCK
    ========================================== */

    function buildLowStockRows(
        filters
    ) {

        const rows =
            [];


        const branchesToCheck =
            branches.filter(
                function (branch) {

                    const branchId =
                        getCanonicalBranchId(
                            branch
                        );


                    return (

                        normalizeComparable(
                            branch.status ||
                            "active"
                        ) ===
                        "active" &&

                        (
                            !filters.branchId ||

                            String(
                                branchId
                            ) ===
                            String(
                                filters.branchId
                            )
                        )
                    );
                }
            );


        products.forEach(
            function (product) {

                const productStatus =
                    normalizeComparable(
                        product.status ||
                        "active"
                    );


                if (
                    productStatus !==
                    "active"
                ) {

                    return;
                }


                const lowLevel =
                    getLowStockLevel(
                        product
                    );


                branchesToCheck.forEach(
                    function (branch) {

                        const branchId =
                            getCanonicalBranchId(
                                branch
                            );


                        /*
                         * CRITICAL FIX:
                         *
                         * Do not report a product as
                         * out-of-stock in a branch where
                         * that product has never existed.
                         */

                        if (
                            !productExistsAtBranch(
                                product,
                                branchId
                            )
                        ) {

                            return;
                        }


                        const stock =
                            getBranchStock(
                                product,
                                branchId
                            );


                        if (
                            stock <=
                            lowLevel
                        ) {

                            rows.push({

                                productName:
                                    product.name ||
                                    "Unnamed Product",

                                branchName:
                                    getBranchName(
                                        branch
                                    ),

                                stock:
                                    stock,

                                lowLevel:
                                    lowLevel,

                                status:
                                    stock <= 0
                                        ? "Out of Stock"
                                        : "Low Stock"
                            });
                        }
                    }
                );
            }
        );


        return rows.sort(
            function (a, b) {

                if (
                    a.stock !==
                    b.stock
                ) {

                    return (
                        a.stock -
                        b.stock
                    );
                }


                return a.productName.localeCompare(
                    b.productName
                );
            }
        );
    }


    function renderLowStockReport(
        filters
    ) {

        if (
            !el.lowStockReportTable
        ) {

            return;
        }


        const rows =
            buildLowStockRows(
                filters
            );


        if (
            !rows.length
        ) {

            el.lowStockReportTable.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="table-empty"
                    >
                        No low-stock products found.
                    </td>
                </tr>
            `;


            return;
        }


        el.lowStockReportTable.innerHTML =
            rows
                .map(
                    function (row) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHTML(
                                        row.productName
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        row.branchName
                                    )}
                                </td>

                                <td>
                                    ${formatNumber(
                                        row.stock
                                    )}
                                </td>

                                <td>
                                    ${formatNumber(
                                        row.lowLevel
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        row.status
                                    )}
                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");
    }


    /* ==========================================
       RECENT TRANSACTIONS
    ========================================== */

    function buildRecentTransactionsRows() {

        const rows =
            [];


        filteredSales.forEach(
            function (sale) {

                const description =
                    getSaleItems(
                        sale
                    )
                        .map(
                            function (item) {

                                return (
                                    item.productName ||
                                    "Product"
                                );
                            }
                        )
                        .join(
                            ", "
                        );


                rows.push({

                    date:
                        getRecordDate(
                            sale
                        ),

                    type:
                        "Sale",

                    reference:
                        sale.receiptNumber ||
                        sale.receipt ||
                        sale.id ||
                        "—",

                    branch:
                        sale.branchName ||
                        getBranchNameById(
                            getRecordBranchId(
                                sale
                            )
                        ),

                    description:
                        description,

                    amount:
                        getSaleRevenue(
                            sale
                        ),

                    direction:
                        "income"
                });
            }
        );


        filteredPurchases.forEach(
            function (purchase) {

                rows.push({

                    date:
                        getRecordDate(
                            purchase
                        ),

                    type:
                        "Purchase",

                    reference:
                        purchase.purchaseNo ||
                        purchase.purchaseNumber ||
                        purchase.id ||
                        "—",

                    branch:
                        purchase.branchName ||
                        getBranchNameById(
                            getRecordBranchId(
                                purchase
                            )
                        ),

                    description:
                        purchase.productName ||
                        purchase.supplierName ||
                        purchase.supplier ||
                        "Supplier purchase",

                    amount:
                        getPurchaseTotal(
                            purchase
                        ),

                    direction:
                        "expense"
                });
            }
        );


        filteredExpenses.forEach(
            function (expense) {

                rows.push({

                    date:
                        getRecordDate(
                            expense
                        ),

                    type:
                        "Expense",

                    reference:
                        expense.expenseNumber ||
                        expense.id ||
                        "—",

                    branch:
                        expense.branchName ||
                        getBranchNameById(
                            getRecordBranchId(
                                expense
                            )
                        ),

                    description:
                        expense.description ||
                        formatCategory(
                            expense.category
                        ),

                    amount:
                        getExpenseAmount(
                            expense
                        ),

                    direction:
                        "expense"
                });
            }
        );


        filteredPayments.forEach(
            function (payment) {

                rows.push({

                    date:
                        getRecordDate(
                            payment
                        ),

                    type:
                        "Supplier Payment",

                    reference:
                        payment.paymentNumber ||
                        payment.reference ||
                        payment.id ||
                        "—",

                    branch:
                        payment.branchName ||
                        getBranchNameById(
                            getRecordBranchId(
                                payment
                            )
                        ),

                    description:
                        payment.supplierName ||
                        payment.supplier ||
                        "Supplier payment",

                    amount:
                        getPaymentAmount(
                            payment
                        ),

                    direction:
                        "expense"
                });
            }
        );


        filteredTransfers.forEach(
            function (transfer) {

                rows.push({

                    date:
                        getRecordDate(
                            transfer
                        ),

                    type:
                        "Transfer",

                    reference:
                        transfer.transferNumber ||
                        transfer.id ||
                        "—",

                    branch:
                        (
                            transfer.fromBranchName ||
                            getBranchNameById(
                                transfer.fromBranchId
                            )
                        ) +
                        " → " +
                        (
                            transfer.toBranchName ||
                            getBranchNameById(
                                transfer.toBranchId
                            )
                        ),

                    description:
                        (
                            transfer.productName ||
                            "Product"
                        ) +
                        " (" +
                        formatNumber(
                            transfer.quantity
                        ) +
                        ")",

                    amount:
                        0,

                    direction:
                        "neutral"
                });
            }
        );


        return rows
            .sort(
                function (a, b) {

                    return (
                        getTimestamp(
                            b.date
                        ) -
                        getTimestamp(
                            a.date
                        )
                    );
                }
            )
            .slice(
                0,
                50
            );
    }


    function renderRecentTransactions() {

        if (
            !el.recentTransactionsTable
        ) {

            return;
        }


        const rows =
            buildRecentTransactionsRows();


        if (
            !rows.length
        ) {

            el.recentTransactionsTable.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="table-empty"
                    >
                        No recent transactions available.
                    </td>
                </tr>
            `;


            return;
        }


        el.recentTransactionsTable.innerHTML =
            rows
                .map(
                    function (row) {

                        const className =
                            row.direction ===
                            "income"

                                ? "positive-value"

                                : row.direction ===
                                "expense"

                                    ? "negative-value"

                                    : "";


                        return `
                            <tr>

                                <td>
                                    ${escapeHTML(
                                        formatDate(
                                            row.date
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        row.type
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        row.reference
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        row.branch
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        row.description
                                    )}
                                </td>

                                <td class="${className}">
                                    ${
                                        row.direction ===
                                        "neutral"

                                            ? "—"

                                            : formatMoney(
                                                row.amount
                                            )
                                    }
                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");
    }


    /* ==========================================
       PURCHASE / PAYMENT
    ========================================== */

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
            purchase.totalAmount !==
            undefined
        ) {

            return toNumber(
                purchase.totalAmount
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


    function getPaymentAmount(
        payment
    ) {

        return toNumber(

            payment.amount ??

            payment.paymentAmount ??

            payment.amountPaid ??

            payment.paidAmount ??

            0
        );
    }


    /* ==========================================
       PRODUCT / BRANCH STOCK
    ========================================== */

    function productExistsAtBranch(
        product,
        branchId
    ) {

        if (
            !product
        ) {

            return false;
        }


        const canonicalBranchId =
            resolveBranchIdFromValue(
                branchId
            );


        if (
            product.branchStock &&
            typeof product.branchStock ===
                "object" &&
            !Array.isArray(
                product.branchStock
            )
        ) {

            const stockKeys =
                Object.keys(
                    product.branchStock
                );


            if (
                stockKeys.length >
                0
            ) {

                const stockKey =
                    resolveProductBranchStockKey(
                        product,
                        canonicalBranchId
                    );


                return Object.prototype
                    .hasOwnProperty.call(
                        product.branchStock,
                        stockKey
                    );
            }
        }


        /*
         * Legacy products without branchStock
         * belong to Head Office only.
         */

        return (
            String(
                canonicalBranchId
            ) ===
            DEFAULT_BRANCH_ID
        );
    }


    function getBranchStock(
        product,
        branchId
    ) {

        if (
            !product
        ) {

            return 0;
        }


        const canonicalBranchId =
            resolveBranchIdFromValue(
                branchId
            );


        if (
            product.branchStock &&
            typeof product.branchStock ===
                "object" &&
            !Array.isArray(
                product.branchStock
            )
        ) {

            const stockKey =
                resolveProductBranchStockKey(
                    product,
                    canonicalBranchId
                );


            if (
                Object.prototype
                    .hasOwnProperty.call(
                        product.branchStock,
                        stockKey
                    )
            ) {

                return toNumber(
                    product.branchStock[
                        stockKey
                    ]
                );
            }
        }


        /*
         * Legacy product:
         * total quantity is Head Office stock.
         */

        if (
            String(
                canonicalBranchId
            ) ===
            DEFAULT_BRANCH_ID
        ) {

            return toNumber(
                product.quantity
            );
        }


        return 0;
    }


    function resolveProductBranchStockKey(
        product,
        branchId
    ) {

        const targetBranchId =
            String(
                branchId ||
                DEFAULT_BRANCH_ID
            );


        if (
            !product ||
            !product.branchStock ||
            typeof product.branchStock !==
                "object" ||
            Array.isArray(
                product.branchStock
            )
        ) {

            return targetBranchId;
        }


        const branchStock =
            product.branchStock;


        /*
         * Exact branch ID first.
         */

        if (
            Object.prototype
                .hasOwnProperty.call(
                    branchStock,
                    targetBranchId
                )
        ) {

            return targetBranchId;
        }


        const branch =
            findBranchByAnyIdentifier(
                targetBranchId
            );


        if (
            !branch
        ) {

            return targetBranchId;
        }


        const possibleKeys = [

            branch.id,

            branch.branchId,

            branch.code,

            branch.branchName,

            branch.name

        ]
            .filter(
                function (value) {

                    return (
                        value !==
                        undefined &&
                        value !==
                        null &&
                        String(
                            value
                        ).trim() !==
                        ""
                    );
                }
            )
            .map(
                String
            );


        for (
            const possibleKey of
            possibleKeys
        ) {

            if (
                Object.prototype
                    .hasOwnProperty.call(
                        branchStock,
                        possibleKey
                    )
            ) {

                return possibleKey;
            }
        }


        /*
         * Case-insensitive / formatting match.
         */

        const actualKeys =
            Object.keys(
                branchStock
            );


        for (
            const actualKey of
            actualKeys
        ) {

            const matches =
                possibleKeys.some(
                    function (
                        possibleKey
                    ) {

                        return (
                            normalizeComparable(
                                possibleKey
                            ) ===
                            normalizeComparable(
                                actualKey
                            )
                        );
                    }
                );


            if (
                matches
            ) {

                return actualKey;
            }
        }


        return targetBranchId;
    }


    function sumBranchStock(
        branchStock
    ) {

        return Object
            .values(
                branchStock ||
                {}
            )
            .reduce(
                function (
                    total,
                    value
                ) {

                    return (
                        total +
                        toNumber(
                            value
                        )
                    );
                },
                0
            );
    }


    /* ==========================================
       BRANCH RESOLUTION
    ========================================== */

    function normalizeComparable(
        value
    ) {

        return String(
            value ||
            ""
        )
            .trim()
            .toLowerCase();
    }


    function getCanonicalBranchId(
        branch
    ) {

        if (
            !branch
        ) {

            return DEFAULT_BRANCH_ID;
        }


        if (
            branch.isHeadOffice ===
            true
        ) {

            return DEFAULT_BRANCH_ID;
        }


        const value =

            branch.id ||

            branch.branchId ||

            branch.code ||

            branch.branchName ||

            branch.name;


        if (
            !value
        ) {

            return DEFAULT_BRANCH_ID;
        }


        if (
            normalizeComparable(
                value
            ) ===
            "head-office" ||
            normalizeComparable(
                value
            ) ===
            "head office"
        ) {

            return DEFAULT_BRANCH_ID;
        }


        return String(
            value
        );
    }


    function findBranchByAnyIdentifier(
        value
    ) {

        if (
            value ===
            undefined ||
            value ===
            null ||
            String(
                value
            ).trim() ===
            ""
        ) {

            return null;
        }


        const target =
            normalizeComparable(
                value
            );


        if (
            target ===
            "head-office" ||
            target ===
            "head office" ||
            target ===
            "ho"
        ) {

            return (
                branches.find(
                    function (branch) {

                        return (
                            getCanonicalBranchId(
                                branch
                            ) ===
                            DEFAULT_BRANCH_ID
                        );
                    }
                ) ||
                null
            );
        }


        return (
            branches.find(
                function (branch) {

                    const values = [

                        branch.id,

                        branch.branchId,

                        branch.code,

                        branch.branchName,

                        branch.name

                    ];


                    return values.some(
                        function (candidate) {

                            return (
                                normalizeComparable(
                                    candidate
                                ) ===
                                target
                            );
                        }
                    );
                }
            ) ||
            null
        );
    }


    function resolveBranchIdFromValue(
        value
    ) {

        if (
            value ===
            undefined ||
            value ===
            null ||
            String(
                value
            ).trim() ===
            ""
        ) {

            return DEFAULT_BRANCH_ID;
        }


        const normalized =
            normalizeComparable(
                value
            );


        if (
            normalized ===
            "head-office" ||
            normalized ===
            "head office" ||
            normalized ===
            "ho"
        ) {

            return DEFAULT_BRANCH_ID;
        }


        const branch =
            findBranchByAnyIdentifier(
                value
            );


        if (
            branch
        ) {

            return getCanonicalBranchId(
                branch
            );
        }


        return String(
            value
        );
    }


    /* ==========================================
       PRODUCT HELPERS
    ========================================== */

    function getProductById(
        productId
    ) {

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


    function getProductName(
        productId
    ) {

        const product =
            getProductById(
                productId
            );


        return product
            ? (
                product.name ||
                "Unnamed Product"
            )
            : "Unknown Product";
    }


    function getLowStockLevel(
        product
    ) {

        if (
            product.lowStockLevel !==
            undefined &&
            product.lowStockLevel !==
            null &&
            product.lowStockLevel !==
            ""
        ) {

            return toNumber(
                product.lowStockLevel
            );
        }


        if (
            product.lowStock !==
            undefined &&
            product.lowStock !==
            null &&
            product.lowStock !==
            ""
        ) {

            return toNumber(
                product.lowStock
            );
        }


        return 5;
    }


    /* ==========================================
       BRANCH NAMES
    ========================================== */

    function getBranchName(
        branch
    ) {

        if (
            !branch
        ) {

            return "Unknown Branch";
        }


        if (
            getCanonicalBranchId(
                branch
            ) ===
            DEFAULT_BRANCH_ID
        ) {

            return "Head Office";
        }


        return (

            branch.branchName ||

            branch.name ||

            branch.code ||

            "Unnamed Branch"
        );
    }


    function getBranchNameById(
        branchId
    ) {

        const resolvedBranchId =
            resolveBranchIdFromValue(
                branchId
            );


        if (
            String(
                resolvedBranchId
            ) ===
            DEFAULT_BRANCH_ID
        ) {

            return "Head Office";
        }


        const branch =
            findBranchByAnyIdentifier(
                resolvedBranchId
            );


        return branch
            ? getBranchName(
                branch
            )
            : "Unknown Branch";
    }


    /* ==========================================
       PDF GENERATION
    ========================================== */

    function generatePdfPreview() {

        refreshReports();


        if (
            !window.jspdf ||
            !window.jspdf.jsPDF
        ) {

            alert(
                "The PDF library did not load."
            );


            return;
        }


        const doc =
            new window.jspdf.jsPDF({

                orientation:
                    "portrait",

                unit:
                    "mm",

                format:
                    "a4"
            });


        if (
            typeof doc.autoTable !==
            "function"
        ) {

            alert(
                "The PDF table library did not load."
            );


            return;
        }


        setPdfButtonState(
            true
        );


        try {

            buildPdf(
                doc
            );


            const dataUri =
                doc.output(
                    "datauristring"
                );


            const marker =
                "base64,";


            const markerIndex =
                dataUri.indexOf(
                    marker
                );


            if (
                markerIndex ===
                -1
            ) {

                throw new Error(
                    "Could not prepare PDF data."
                );
            }


            const rawBase64 =
                dataUri
                    .substring(
                        markerIndex +
                        marker.length
                    )
                    .replace(
                        /\s/g,
                        ""
                    );


            if (
                !rawBase64
            ) {

                throw new Error(
                    "Generated PDF was empty."
                );
            }


            const fileName =
                "Jufelix_Report_" +
                dateKey(
                    new Date()
                ) +
                ".pdf";


            sessionStorage.removeItem(
                PDF_STORAGE_KEY
            );


            sessionStorage.removeItem(
                PDF_FILENAME_KEY
            );


            sessionStorage.setItem(
                PDF_STORAGE_KEY,
                rawBase64
            );


            sessionStorage.setItem(
                PDF_FILENAME_KEY,
                fileName
            );


            if (
                !sessionStorage.getItem(
                    PDF_STORAGE_KEY
                )
            ) {

                throw new Error(
                    "PDF could not be stored for preview."
                );
            }


            window.location.href =
                "pdf-preview.html";


        } catch (error) {

            console.error(
                "PDF generation error:",
                error
            );


            if (
                error &&
                error.name ===
                "QuotaExceededError"
            ) {

                alert(
                    "The PDF is too large for temporary browser storage. Choose a shorter report period and try again."
                );

            } else {

                alert(
                    error.message ||
                    "The PDF could not be generated."
                );
            }


        } finally {

            setPdfButtonState(
                false
            );
        }
    }


    function setPdfButtonState(
        working
    ) {

        if (
            !el.pdfButton
        ) {

            return;
        }


        el.pdfButton.disabled =
            working;


        el.pdfButton.textContent =
            working
                ? "Preparing PDF..."
                : "Download PDF";
    }


    /* ==========================================
       BUILD PDF
    ========================================== */

    function buildPdf(
        doc
    ) {

        const filters =
            getFilters();


        const salesRows =
            buildSalesByProductRows();


        const branchRows =
            buildBranchPerformanceRows();


        const expenseRows =
            buildExpenseBreakdownRows();


        const lowStockRows =
            buildLowStockRows(
                filters
            );


        const transactionRows =
            buildRecentTransactionsRows();


        const totalSales =
            filteredSales.reduce(
                function (
                    total,
                    sale
                ) {

                    return (
                        total +
                        getSaleRevenue(
                            sale
                        )
                    );
                },
                0
            );


        const totalPurchases =
            filteredPurchases.reduce(
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


        const totalExpenses =
            filteredExpenses.reduce(
                function (
                    total,
                    expense
                ) {

                    return (
                        total +
                        getExpenseAmount(
                            expense
                        )
                    );
                },
                0
            );


        const totalCost =
            filteredSales.reduce(
                function (
                    total,
                    sale
                ) {

                    return (
                        total +
                        getSaleCost(
                            sale
                        )
                    );
                },
                0
            );


        const grossProfit =
            totalSales -
            totalCost;


        const netProfit =
            grossProfit -
            totalExpenses;


        const inventoryValue =
            calculateInventoryValue(
                filters.branchId
            );


        const itemsSold =
            filteredSales.reduce(
                function (
                    total,
                    sale
                ) {

                    return (
                        total +
                        getSaleQuantity(
                            sale
                        )
                    );
                },
                0
            );


        const totalSupplierPayments =
            filteredPayments.reduce(
                function (
                    total,
                    payment
                ) {

                    return (
                        total +
                        getPaymentAmount(
                            payment
                        )
                    );
                },
                0
            );


        const branchLabel =
            filters.branchId

                ? getBranchNameById(
                    filters.branchId
                )

                : "All Branches";


        const periodLabel =
            (
                filters.startDate ||
                "Beginning"
            ) +
            " to " +
            (
                filters.endDate ||
                "Today"
            );


        let y =
            16;


        doc.setFontSize(
            18
        );


        doc.setFont(
            undefined,
            "bold"
        );


        doc.text(
            "Jufelix Services",
            14,
            y
        );


        y +=
            8;


        doc.setFontSize(
            14
        );


        doc.text(
            "Business Report & Analytics",
            14,
            y
        );


        y +=
            7;


        doc.setFontSize(
            9
        );


        doc.setFont(
            undefined,
            "normal"
        );


        doc.text(
            "Period: " +
            periodLabel,
            14,
            y
        );


        y +=
            5;


        doc.text(
            "Branch: " +
            branchLabel,
            14,
            y
        );


        y +=
            5;


        doc.text(
            "Generated: " +
            new Date()
                .toLocaleString(
                    "en-GH"
                ),
            14,
            y
        );


        y +=
            8;


        doc.autoTable({

            startY:
                y,

            head: [[

                "Sales",

                "Purchases",

                "Expenses",

                "Gross Profit",

                "Net Profit"

            ]],

            body: [[

                moneyPlain(
                    totalSales
                ),

                moneyPlain(
                    totalPurchases
                ),

                moneyPlain(
                    totalExpenses
                ),

                moneyPlain(
                    grossProfit
                ),

                moneyPlain(
                    netProfit
                )

            ]],

            styles: {

                fontSize:
                    8,

                cellPadding:
                    2.5
            },

            headStyles: {

                fillColor:
                    [11, 94, 215]
            }
        });


        doc.autoTable({

            startY:
                doc.lastAutoTable
                    .finalY +
                4,

            head: [[

                "Inventory Value",

                "Items Sold",

                "Low Stock",

                "Supplier Payments"

            ]],

            body: [[

                moneyPlain(
                    inventoryValue
                ),

                String(
                    itemsSold
                ),

                String(
                    lowStockRows.length
                ),

                moneyPlain(
                    totalSupplierPayments
                )

            ]],

            styles: {

                fontSize:
                    8,

                cellPadding:
                    2.5
            },

            headStyles: {

                fillColor:
                    [25, 135, 84]
            }
        });


        addPdfHeading(
            doc,
            "Sales by Product"
        );


        doc.autoTable({

            startY:
                getNextPdfY(
                    doc
                ),

            head: [[

                "Product",

                "Qty",

                "Revenue",

                "Cost",

                "Profit"

            ]],

            body:
                salesRows.length

                    ? salesRows.map(
                        function (row) {

                            return [

                                row.productName,

                                String(
                                    row.quantity
                                ),

                                moneyPlain(
                                    row.revenue
                                ),

                                moneyPlain(
                                    row.estimatedCost
                                ),

                                moneyPlain(
                                    row.grossProfit
                                )
                            ];
                        }
                    )

                    : [[
                        "No sales data",
                        "",
                        "",
                        "",
                        ""
                    ]],

            styles: {

                fontSize:
                    7.5,

                cellPadding:
                    2
            },

            headStyles: {

                fillColor:
                    [11, 94, 215]
            }
        });


        addPdfHeading(
            doc,
            "Branch Performance"
        );


        doc.autoTable({

            startY:
                getNextPdfY(
                    doc
                ),

            head: [[

                "Branch",

                "Sales",

                "Expenses",

                "Est. Profit",

                "Units"

            ]],

            body:
                branchRows.length

                    ? branchRows.map(
                        function (row) {

                            return [

                                row.branchName,

                                moneyPlain(
                                    row.sales
                                ),

                                moneyPlain(
                                    row.expenses
                                ),

                                moneyPlain(
                                    row.estimatedProfit
                                ),

                                String(
                                    row.unitsSold
                                )
                            ];
                        }
                    )

                    : [[
                        "No branch data",
                        "",
                        "",
                        "",
                        ""
                    ]],

            styles: {

                fontSize:
                    7.5,

                cellPadding:
                    2
            },

            headStyles: {

                fillColor:
                    [111, 66, 193]
            }
        });


        addPdfHeading(
            doc,
            "Expense Breakdown"
        );


        doc.autoTable({

            startY:
                getNextPdfY(
                    doc
                ),

            head: [[

                "Category",

                "Transactions",

                "Amount"

            ]],

            body:
                expenseRows.length

                    ? expenseRows.map(
                        function (row) {

                            return [

                                row.category,

                                String(
                                    row.transactions
                                ),

                                moneyPlain(
                                    row.amount
                                )
                            ];
                        }
                    )

                    : [[
                        "No expense data",
                        "",
                        ""
                    ]],

            styles: {

                fontSize:
                    7.5,

                cellPadding:
                    2
            },

            headStyles: {

                fillColor:
                    [220, 53, 69]
            }
        });


        addPdfHeading(
            doc,
            "Low Stock Report"
        );


        doc.autoTable({

            startY:
                getNextPdfY(
                    doc
                ),

            head: [[

                "Product",

                "Branch",

                "Stock",

                "Level",

                "Status"

            ]],

            body:
                lowStockRows.length

                    ? lowStockRows.map(
                        function (row) {

                            return [

                                row.productName,

                                row.branchName,

                                String(
                                    row.stock
                                ),

                                String(
                                    row.lowLevel
                                ),

                                row.status
                            ];
                        }
                    )

                    : [[
                        "No low-stock products",
                        "",
                        "",
                        "",
                        ""
                    ]],

            styles: {

                fontSize:
                    7.5,

                cellPadding:
                    2
            },

            headStyles: {

                fillColor:
                    [255, 193, 7],

                textColor:
                    [0, 0, 0]
            }
        });


        addPdfHeading(
            doc,
            "Recent Transactions"
        );


        doc.autoTable({

            startY:
                getNextPdfY(
                    doc
                ),

            head: [[

                "Date",

                "Type",

                "Reference",

                "Branch",

                "Description",

                "Amount"

            ]],

            body:
                transactionRows.length

                    ? transactionRows.map(
                        function (row) {

                            return [

                                formatDate(
                                    row.date
                                ),

                                row.type,

                                row.reference,

                                row.branch,

                                row.description,

                                row.direction ===
                                "neutral"

                                    ? "-"

                                    : moneyPlain(
                                        row.amount
                                    )
                            ];
                        }
                    )

                    : [[
                        "No transactions",
                        "",
                        "",
                        "",
                        "",
                        ""
                    ]],

            styles: {

                fontSize:
                    6.7,

                cellPadding:
                    1.7
            },

            headStyles: {

                fillColor:
                    [75, 85, 99]
            }
        });


        addPdfPageNumbers(
            doc
        );
    }


    function addPdfHeading(
        doc,
        title
    ) {

        let y =
            doc.lastAutoTable

                ? doc.lastAutoTable
                    .finalY +
                    7

                : 20;


        if (
            y >
            275
        ) {

            doc.addPage();

            y =
                16;
        }


        doc.setFontSize(
            11
        );


        doc.setFont(
            undefined,
            "bold"
        );


        doc.text(
            title,
            14,
            y
        );


        doc.setFont(
            undefined,
            "normal"
        );


        doc.__jufelixNextY =
            y +
            3;
    }


    function getNextPdfY(
        doc
    ) {

        return (

            doc.__jufelixNextY ||

            (
                doc.lastAutoTable

                    ? doc.lastAutoTable
                        .finalY +
                        8

                    : 20
            )
        );
    }


    function addPdfPageNumbers(
        doc
    ) {

        const pages =
            doc.internal
                .getNumberOfPages();


        for (
            let page =
                1;
            page <=
                pages;
            page++
        ) {

            doc.setPage(
                page
            );


            doc.setFontSize(
                8
            );


            doc.text(
                "Page " +
                page +
                " of " +
                pages,
                196,
                290,
                {
                    align:
                        "right"
                }
            );
        }
    }


    /* ==========================================
       CSV EXPORT
    ========================================== */

    function exportCsvReport() {

        refreshReports();


        const rows = [

            [
                "Jufelix Services Reports & Analytics"
            ],

            [],

            [
                "Type",
                "Reference",
                "Date",
                "Branch",
                "Description",
                "Quantity",
                "Amount"
            ]
        ];


        filteredSales.forEach(
            function (sale) {

                rows.push([

                    "Sale",

                    sale.receiptNumber ||
                    sale.receipt ||
                    sale.id ||
                    "",

                    getRecordDate(
                        sale
                    ),

                    sale.branchName ||
                    getBranchNameById(
                        getRecordBranchId(
                            sale
                        )
                    ),

                    getSaleItems(
                        sale
                    )
                        .map(
                            function (item) {

                                return (
                                    item.productName ||
                                    "Product"
                                );
                            }
                        )
                        .join(
                            ", "
                        ),

                    getSaleQuantity(
                        sale
                    ),

                    getSaleRevenue(
                        sale
                    )
                ]);
            }
        );


        filteredPurchases.forEach(
            function (purchase) {

                rows.push([

                    "Purchase",

                    purchase.purchaseNo ||
                    purchase.purchaseNumber ||
                    purchase.id ||
                    "",

                    getRecordDate(
                        purchase
                    ),

                    purchase.branchName ||
                    getBranchNameById(
                        getRecordBranchId(
                            purchase
                        )
                    ),

                    purchase.productName ||
                    purchase.supplierName ||
                    purchase.supplier ||
                    "Supplier purchase",

                    toNumber(
                        purchase.quantity
                    ),

                    getPurchaseTotal(
                        purchase
                    )
                ]);
            }
        );


        filteredExpenses.forEach(
            function (expense) {

                rows.push([

                    "Expense",

                    expense.expenseNumber ||
                    expense.id ||
                    "",

                    getRecordDate(
                        expense
                    ),

                    expense.branchName ||
                    getBranchNameById(
                        getRecordBranchId(
                            expense
                        )
                    ),

                    expense.description ||
                    formatCategory(
                        expense.category
                    ),

                    "",

                    getExpenseAmount(
                        expense
                    )
                ]);
            }
        );


        filteredPayments.forEach(
            function (payment) {

                rows.push([

                    "Supplier Payment",

                    payment.paymentNumber ||
                    payment.reference ||
                    payment.id ||
                    "",

                    getRecordDate(
                        payment
                    ),

                    payment.branchName ||
                    getBranchNameById(
                        getRecordBranchId(
                            payment
                        )
                    ),

                    payment.supplierName ||
                    payment.supplier ||
                    "Supplier payment",

                    "",

                    getPaymentAmount(
                        payment
                    )
                ]);
            }
        );


        filteredTransfers.forEach(
            function (transfer) {

                rows.push([

                    "Transfer",

                    transfer.transferNumber ||
                    transfer.id ||
                    "",

                    getRecordDate(
                        transfer
                    ),

                    (
                        transfer.fromBranchName ||
                        getBranchNameById(
                            transfer.fromBranchId
                        )
                    ) +
                    " → " +
                    (
                        transfer.toBranchName ||
                        getBranchNameById(
                            transfer.toBranchId
                        )
                    ),

                    transfer.productName ||
                    "Product",

                    toNumber(
                        transfer.quantity
                    ),

                    ""
                ]);
            }
        );


        const csv =
            rows
                .map(
                    function (row) {

                        return row
                            .map(
                                csvEscape
                            )
                            .join(
                                ","
                            );
                    }
                )
                .join(
                    "\n"
                );


        const blob =
            new Blob(
                [
                    "\uFEFF" +
                    csv
                ],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;


        link.download =
            "Jufelix_Report_" +
            dateKey(
                new Date()
            ) +
            ".csv";


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        setTimeout(
            function () {

                URL.revokeObjectURL(
                    url
                );
            },
            1500
        );
    }


    function csvEscape(
        value
    ) {

        return (
            '"' +
            String(
                value ===
                    undefined ||
                value ===
                    null
                    ? ""
                    : value
            )
                .replace(
                    /"/g,
                    '""'
                ) +
            '"'
        );
    }


    /* ==========================================
       COMMON RECORD HELPERS
    ========================================== */

    function getRecordDate(
        record
    ) {

        return (

            record.saleDate ||

            record.purchaseDate ||

            record.expenseDate ||

            record.paymentDate ||

            record.transferDate ||

            record.date ||

            record.createdAt ||

            ""
        );
    }


    function getRecordBranchId(
        record
    ) {

        return (

            record.branchId ||

            record.branchID ||

            record.activeBranchId ||

            record.branch ||

            DEFAULT_BRANCH_ID
        );
    }


    /* ==========================================
       STORAGE HELPERS
    ========================================== */

    function readArray(
        key
    ) {

        try {

            const stored =
                localStorage.getItem(
                    key
                );


            if (
                !stored
            ) {

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

            console.warn(
                "Reports could not read:",
                key,
                error
            );


            return [];
        }
    }


    function readCombinedArrays(
        keys
    ) {

        const all =
            [];


        const seen =
            {};


        keys.forEach(
            function (key) {

                readArray(
                    key
                ).forEach(
                    function (record) {

                        const identity =
                            String(
                                record.id ||
                                record.paymentNumber ||
                                record.reference ||
                                ""
                            );


                        if (
                            identity &&
                            seen[
                                identity
                            ]
                        ) {

                            return;
                        }


                        if (
                            identity
                        ) {

                            seen[
                                identity
                            ] =
                                true;
                        }


                        all.push(
                            record
                        );
                    }
                );
            }
        );


        return all;
    }


    /* ==========================================
       DATES
    ========================================== */

    function normalizeDate(
        value
    ) {

        if (
            !value
        ) {

            return "";
        }


        const text =
            String(
                value
            );


        if (
            /^\d{4}-\d{2}-\d{2}$/
                .test(
                    text
                )
        ) {

            return text;
        }


        const date =
            new Date(
                value
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";
        }


        return dateKey(
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
            )
                .padStart(
                    2,
                    "0"
                ) +

            "-" +

            String(
                date.getDate()
            )
                .padStart(
                    2,
                    "0"
                )
        );
    }


    function formatDate(
        value
    ) {

        const normalized =
            normalizeDate(
                value
            );


        if (
            !normalized
        ) {

            return "—";
        }


        const date =
            new Date(
                normalized +
                "T00:00:00"
            );


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
        value
    ) {

        const date =
            new Date(
                value
            );


        return Number.isNaN(
            date.getTime()
        )
            ? 0
            : date.getTime();
    }


    /* ==========================================
       FORMATTERS
    ========================================== */

    function formatCategory(
        category
    ) {

        const labels = {

            rent:
                "Rent",

            utilities:
                "Utilities",

            transport:
                "Transport",

            fuel:
                "Fuel",

            salary:
                "Salaries and Wages",

            maintenance:
                "Maintenance",

            marketing:
                "Marketing",

            office:
                "Office Supplies",

            tax:
                "Taxes and Levies",

            miscellaneous:
                "Miscellaneous"
        };


        const key =
            normalizeComparable(
                category ||
                "miscellaneous"
            );


        return (
            labels[
                key
            ] ||
            category ||
            "Miscellaneous"
        );
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


    function moneyPlain(
        value
    ) {

        return (
            "GHS " +
            toNumber(
                value
            ).toFixed(
                2
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


    function toNumber(
        value
    ) {

        if (
            value ===
            undefined ||
            value ===
            null ||
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


    function readObject(
        key
    ) {

        try {

            const stored =
                localStorage.getItem(
                    key
                );


            if (
                !stored
            ) {

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


    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );


        if (
            element
        ) {

            element.textContent =
                value;
        }
    }


    function setMoney(
        id,
        value
    ) {

        setText(
            id,
            formatMoney(
                value
            )
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
       PUBLIC API
    ========================================== */

    window.JufelixReports = {

        refresh:
            refreshReports,


        refreshBranches:
            function () {

                loadData();

                ensureHeadOffice();

                populateBranchFilter();

                refreshReports();
            },


        downloadPdf:
            generatePdfPreview,


        exportCsv:
            exportCsvReport,


        getBranchStock:
            getBranchStock,


        productExistsAtBranch:
            productExistsAtBranch,


        getSaleRevenue:
            getSaleRevenue,


        getSaleCost:
            getSaleCost

    };


})();