/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   REPORTS & ANALYTICS MODULE

   File:
   js/modules/reports.js

   COMPLETE REPLACEMENT

   + Firebase/localStorage refresh
   + Branch dropdown anti-blinking
   + New Firebase branches appear automatically
   + Cancelled/void sales excluded
   + Draft/cancelled purchases excluded
   + Branch-aware reports
   + Sales / Purchases / Expenses
   + Gross & Net Profit
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
            "✅ Jufelix Reports module loaded."
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
                     * Do not rebuild dropdown here.
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
           SAME-PAGE / FIREBASE DATA EVENTS
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
           OTHER TAB / WINDOW STORAGE CHANGES
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
       APPLICATION DATA UPDATE
    ========================================== */

    function handleReportDataUpdate(
        event
    ) {

        const detail =
            event &&
            event.detail
                ? event.detail
                : {};


        /*
         * If Firebase sends a new branch,
         * refresh branch options.
         *
         * populateBranchFilter() compares
         * the current options first, so it
         * will not rebuild unnecessarily.
         */

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
                            String(
                                branch.status ||
                                "active"
                            )
                                .toLowerCase() ===
                            "active"
                        );
                    }
                )
                .sort(
                    function (a, b) {

                        /*
                         * Keep Head Office first.
                         */

                        if (
                            String(a.id) ===
                            DEFAULT_BRANCH_ID
                        ) {

                            return -1;
                        }


                        if (
                            String(b.id) ===
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
                            String(
                                branch.id
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
         * Anti-blinking protection.
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


        if (previousExists) {

            el.branch.value =
                previousValue;

        } else {

            el.branch.value =
                "";
        }
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
       REFRESH REPORTS
    ========================================== */

    function refreshReports() {

        loadData();

        ensureHeadOffice();


        const filters =
            getFilters();


        /* ======================================
           SALES

           Exclude cancelled / void sales.
        ====================================== */

        filteredSales =
            sales.filter(
                function (sale) {

                    const status =
                        String(
                            sale.status ||
                            "completed"
                        )
                            .trim()
                            .toLowerCase();


                    if (
                        status ===
                            "cancelled" ||
                        status ===
                            "canceled" ||
                        status ===
                            "void" ||
                        status ===
                            "deleted"
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

           Draft / cancelled purchases are not
           completed financial transactions.
        ====================================== */

        filteredPurchases =
            purchases.filter(
                function (purchase) {

                    const status =
                        String(
                            purchase.status ||
                            "received"
                        )
                            .trim()
                            .toLowerCase();


                    if (
                        status ===
                            "draft" ||
                        status ===
                            "cancelled" ||
                        status ===
                            "canceled" ||
                        status ===
                            "void" ||
                        status ===
                            "deleted"
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

                    const status =
                        String(
                            expense.status ||
                            "completed"
                        )
                            .trim()
                            .toLowerCase();


                    if (
                        status ===
                            "cancelled" ||
                        status ===
                            "canceled" ||
                        status ===
                            "void" ||
                        status ===
                            "deleted"
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
           SUPPLIER PAYMENTS
        ====================================== */

        filteredPayments =
            payments.filter(
                function (payment) {

                    const status =
                        String(
                            payment.status ||
                            "completed"
                        )
                            .trim()
                            .toLowerCase();


                    if (
                        status ===
                            "cancelled" ||
                        status ===
                            "canceled" ||
                        status ===
                            "void" ||
                        status ===
                            "deleted"
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

                    const status =
                        String(
                            transfer.status ||
                            "completed"
                        )
                            .trim()
                            .toLowerCase();


                    if (
                        status ===
                            "cancelled" ||
                        status ===
                            "canceled" ||
                        status ===
                            "void" ||
                        status ===
                            "deleted"
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


                    const branchMatches =
                        !filters.branchId ||

                        String(
                            transfer.fromBranchId ||
                            ""
                        ) ===
                        String(
                            filters.branchId
                        ) ||

                        String(
                            transfer.toBranchId ||
                            ""
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

        return (

            isDateInRange(
                recordDate,
                filters.startDate,
                filters.endDate
            ) &&

            (
                !filters.branchId ||

                String(
                    branchId ||
                    DEFAULT_BRANCH_ID
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
                        toNumber(
                            expense.amount
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
         * Correct accounting logic:
         *
         * Gross Profit =
         * Sales Revenue - Cost of Goods Sold
         *
         * Net Profit =
         * Gross Profit - Expenses
         *
         * Purchases are NOT subtracted again.
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


        const netProfitElement =
            document.getElementById(
                "reportNetProfit"
            );


        if (netProfitElement) {

            netProfitElement.classList.toggle(
                "positive-value",
                netProfit >= 0
            );


            netProfitElement.classList.toggle(
                "negative-value",
                netProfit < 0
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
            item.costPrice ??
            item.costPriceAtSale ??
            item.unitCost;


        if (
            costPrice ===
            undefined ||
            costPrice ===
            null
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

        const grouped = {};


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


                        if (!grouped[key]) {

                            grouped[key] = {

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


                        grouped[key].quantity +=
                            toNumber(
                                item.quantity
                            );


                        grouped[key].revenue +=
                            getSaleItemRevenue(
                                item
                            );


                        grouped[key].cost +=
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

        if (!el.salesByProductTable) {

            return;
        }


        const rows =
            buildSalesByProductRows();


        if (!rows.length) {

            el.salesByProductTable.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty">
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

                    return (

                        String(
                            branch.status ||
                            "active"
                        )
                            .toLowerCase() ===
                        "active" &&

                        (
                            !selectedBranch ||

                            String(
                                branch.id
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

                    const branchSales =
                        filteredSales.filter(
                            function (sale) {

                                return (
                                    String(
                                        getRecordBranchId(
                                            sale
                                        )
                                    ) ===
                                    String(
                                        branch.id
                                    )
                                );
                            }
                        );


                    const branchExpenses =
                        filteredExpenses.filter(
                            function (expense) {

                                return (
                                    String(
                                        getRecordBranchId(
                                            expense
                                        )
                                    ) ===
                                    String(
                                        branch.id
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
                                    toNumber(
                                        expense.amount
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

        if (!el.branchPerformanceTable) {

            return;
        }


        const rows =
            buildBranchPerformanceRows();


        if (!rows.length) {

            el.branchPerformanceTable.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty">
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

    function buildExpenseBreakdownRows() {

        const grouped = {};


        filteredExpenses.forEach(
            function (expense) {

                const category =
                    String(
                        expense.category ||
                        "miscellaneous"
                    )
                        .toLowerCase();


                if (!grouped[category]) {

                    grouped[category] = {

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


                grouped[category].transactions +=
                    1;


                grouped[category].amount +=
                    toNumber(
                        expense.amount
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

        if (!el.expenseBreakdownTable) {

            return;
        }


        const rows =
            buildExpenseBreakdownRows();


        if (!rows.length) {

            el.expenseBreakdownTable.innerHTML = `
                <tr>
                    <td colspan="3" class="table-empty">
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


                if (branchId) {

                    quantity =
                        getBranchStock(
                            product,
                            branchId
                        );

                } else {

                    if (
                        product.branchStock &&
                        typeof product.branchStock ===
                        "object" &&
                        !Array.isArray(
                            product.branchStock
                        )
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

        const rows = [];


        const branchesToCheck =
            branches.filter(
                function (branch) {

                    return (

                        String(
                            branch.status ||
                            "active"
                        )
                            .toLowerCase() ===
                        "active" &&

                        (
                            !filters.branchId ||

                            String(
                                branch.id
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

                const lowLevel =
                    getLowStockLevel(
                        product
                    );


                branchesToCheck.forEach(
                    function (branch) {

                        const stock =
                            getBranchStock(
                                product,
                                branch.id
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

                return (
                    a.stock -
                    b.stock
                );
            }
        );
    }


    function renderLowStockReport(
        filters
    ) {

        if (!el.lowStockReportTable) {

            return;
        }


        const rows =
            buildLowStockRows(
                filters
            );


        if (!rows.length) {

            el.lowStockReportTable.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty">
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

        const rows = [];


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
                        .join(", ");


                rows.push({

                    date:
                        getRecordDate(
                            sale
                        ),

                    type:
                        "Sale",

                    reference:
                        sale.receiptNumber ||
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
                        toNumber(
                            expense.amount
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

        if (!el.recentTransactionsTable) {

            return;
        }


        const rows =
            buildRecentTransactionsRows();


        if (!rows.length) {

            el.recentTransactionsTable.innerHTML = `
                <tr>
                    <td colspan="6" class="table-empty">
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
       PURCHASE / PAYMENT HELPERS
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
            payment.paidAmount

        );
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


            if (!rawBase64) {

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

        if (!el.pdfButton) {

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
                        toNumber(
                            expense.amount
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


        y += 8;


        doc.setFontSize(
            14
        );


        doc.text(
            "Business Report & Analytics",
            14,
            y
        );


        y += 7;


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


        y += 5;


        doc.text(
            "Branch: " +
            branchLabel,
            14,
            y
        );


        y += 5;


        doc.text(
            "Generated: " +
            new Date()
                .toLocaleString(
                    "en-GH"
                ),
            14,
            y
        );


        y += 8;


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
            let page = 1;
            page <= pages;
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
                        .join(", "),

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

                    toNumber(
                        expense.amount
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
                            .join(",");
                    }
                )
                .join("\n");


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
                value === undefined ||
                value === null
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
       COMMON HELPERS
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

            record.activeBranchId ||

            DEFAULT_BRANCH_ID
        );
    }


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

        if (
            String(
                branchId
            ) ===
            DEFAULT_BRANCH_ID
        ) {

            return "Head Office";
        }


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


        return branch
            ? getBranchName(
                branch
            )
            : "Unknown Branch";
    }


    function getBranchStock(
        product,
        branchId
    ) {

        if (
            product &&
            product.branchStock &&
            typeof product.branchStock ===
            "object" &&
            !Array.isArray(
                product.branchStock
            )
        ) {

            return toNumber(
                product.branchStock[
                    branchId
                ]
            );
        }


        if (
            String(
                branchId
            ) ===
            DEFAULT_BRANCH_ID
        ) {

            return toNumber(
                product
                    ? product.quantity
                    : 0
            );
        }


        return 0;
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


    function getLowStockLevel(
        product
    ) {

        if (
            product.lowStockLevel !==
            undefined &&
            product.lowStockLevel !==
            null
        ) {

            return toNumber(
                product.lowStockLevel
            );
        }


        if (
            product.lowStock !==
            undefined &&
            product.lowStock !==
            null
        ) {

            return toNumber(
                product.lowStock
            );
        }


        return 5;
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

        const all = [];

        const seen = {};


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
                            seen[identity]
                        ) {

                            return;
                        }


                        if (identity) {

                            seen[identity] =
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

        if (!value) {

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


        if (!normalized) {

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
            String(
                category ||
                "miscellaneous"
            )
                .toLowerCase();


        return (
            labels[key] ||
            category ||
            "Miscellaneous"
        );
    }


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
            value === undefined ||
            value === null
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
            exportCsvReport
    };


})();