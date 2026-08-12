/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   SUPPLIER PAYMENTS MODULE

   File:
   js/modules/payments.js
========================================== */

(function () {
    "use strict";


    /* ==========================================
       STORAGE KEYS
    ========================================== */

    const SUPPLIERS_KEY =
        "jufelix_v7_suppliers";

    const PAYMENTS_KEY =
        "jufelix_v7_supplier_payments";

    const ACTIVE_BRANCH_KEY =
        "jufelix_v7_active_branch";

    const CURRENT_USER_KEY =
        "jufelix_v7_current_user";

    const DEFAULT_BRANCH_ID =
        "head-office";


    /* ==========================================
       STATE
    ========================================== */

    let suppliers = [];

    let payments = [];

    const el = {};


    /* ==========================================
       INITIALIZE
    ========================================== */

    document.addEventListener(
        "DOMContentLoaded",
        initializePayments
    );


    function initializePayments() {

        cacheElements();

        loadData();

        connectEvents();

        populateSupplierDropdown();

        prepareNewPayment();

        refreshPayments();

        console.log(
            "Jufelix Supplier Payments module loaded."
        );
    }


    /* ==========================================
       CACHE ELEMENTS
    ========================================== */

    function cacheElements() {

        el.form =
            document.getElementById(
                "supplierPaymentForm"
            );

        el.number =
            document.getElementById(
                "supplierPaymentNumber"
            );

        el.date =
            document.getElementById(
                "supplierPaymentDate"
            );

        el.supplier =
            document.getElementById(
                "supplierPaymentSupplier"
            );

        el.branch =
            document.getElementById(
                "supplierPaymentBranch"
            );

        el.name =
            document.getElementById(
                "supplierPaymentName"
            );

        el.balance =
            document.getElementById(
                "supplierPaymentBalance"
            );

        el.totalPaid =
            document.getElementById(
                "supplierPaymentTotalPaid"
            );

        el.amount =
            document.getElementById(
                "supplierPaymentAmount"
            );

        el.method =
            document.getElementById(
                "supplierPaymentMethod"
            );

        el.reference =
            document.getElementById(
                "supplierPaymentReference"
            );

        el.recordedBy =
            document.getElementById(
                "supplierPaymentRecordedBy"
            );

        el.notes =
            document.getElementById(
                "supplierPaymentNotes"
            );

        el.clearButton =
            document.getElementById(
                "clearSupplierPaymentButton"
            );

        el.saveButton =
            document.getElementById(
                "saveSupplierPaymentButton"
            );

        el.search =
            document.getElementById(
                "supplierPaymentSearch"
            );

        el.methodFilter =
            document.getElementById(
                "supplierPaymentMethodFilter"
            );

        el.dateFilter =
            document.getElementById(
                "supplierPaymentDateFilter"
            );

        el.tableBody =
            document.getElementById(
                "supplierPaymentTableBody"
            );
    }


    /* ==========================================
       EVENTS
    ========================================== */

    function connectEvents() {

        if (el.form) {

            el.form.addEventListener(
                "submit",
                savePayment
            );
        }


        if (el.supplier) {

            el.supplier.addEventListener(
                "change",
                updateSupplierInfo
            );
        }


        if (el.clearButton) {

            el.clearButton.addEventListener(
                "click",
                prepareNewPayment
            );
        }


        if (el.search) {

            el.search.addEventListener(
                "input",
                displayPayments
            );
        }


        if (el.methodFilter) {

            el.methodFilter.addEventListener(
                "change",
                displayPayments
            );
        }


        if (el.dateFilter) {

            el.dateFilter.addEventListener(
                "change",
                displayPayments
            );
        }


        window.addEventListener(
            "storage",
            function (event) {

                if (
                    event.key ===
                        SUPPLIERS_KEY ||
                    event.key ===
                        PAYMENTS_KEY
                ) {

                    loadData();

                    populateSupplierDropdown();

                    refreshPayments();
                }
            }
        );
    }


    /* ==========================================
       LOAD DATA
    ========================================== */

    function loadData() {

        suppliers =
            readArray(
                SUPPLIERS_KEY
            );

        payments =
            readArray(
                PAYMENTS_KEY
            );
    }


    /* ==========================================
       SUPPLIER DROPDOWN
    ========================================== */

    function populateSupplierDropdown() {

        if (!el.supplier) {
            return;
        }


        const previousValue =
            el.supplier.value;


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
                    function (a, b) {

                        return String(
                            a.name ||
                            ""
                        ).localeCompare(
                            String(
                                b.name ||
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
                .join("");


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
            )
        ) {

            el.supplier.value =
                previousValue;
        }


        updateSupplierInfo();
    }


    /* ==========================================
       SUPPLIER INFO
    ========================================== */

    function updateSupplierInfo() {

        const supplier =
            getSelectedSupplier();


        if (!supplier) {

            setText(
                el.name,
                "—"
            );

            setText(
                el.balance,
                formatMoney(
                    0
                )
            );

            setText(
                el.totalPaid,
                formatMoney(
                    0
                )
            );

            setValue(
                el.branch,
                getCurrentBranchName()
            );

            return;
        }


        setText(
            el.name,
            supplier.name ||
            "Unnamed Supplier"
        );


        setText(
            el.balance,
            formatMoney(
                supplier.balance
            )
        );


        setText(
            el.totalPaid,
            formatMoney(
                supplier.totalPaid
            )
        );


        setValue(
            el.branch,
            supplier.branchName ||
            getCurrentBranchName()
        );
    }


    /* ==========================================
       SAVE PAYMENT
    ========================================== */

    function savePayment(
        event
    ) {

        event.preventDefault();


        loadData();


        const supplier =
            getSelectedSupplier();


        if (!supplier) {

            alert(
                "Select a supplier."
            );

            return;
        }


        const amount =
            toNumber(
                el.amount
                    ? el.amount.value
                    : 0
            );


        const currentBalance =
            toNumber(
                supplier.balance
            );


        if (
            amount <= 0
        ) {

            alert(
                "Enter a valid payment amount."
            );

            return;
        }


        if (
            currentBalance <= 0
        ) {

            alert(
                "This supplier does not have an outstanding balance."
            );

            return;
        }


        if (
            amount >
            currentBalance
        ) {

            alert(
                `Payment cannot exceed the supplier balance of ${formatMoney(
                    currentBalance
                )}.`
            );

            return;
        }


        if (
            !el.date ||
            !el.date.value
        ) {

            alert(
                "Select the payment date."
            );

            return;
        }


        const confirmed =
            confirm(
                `Record payment of ${formatMoney(
                    amount
                )} to ${supplier.name}?`
            );


        if (!confirmed) {
            return;
        }


        if (el.saveButton) {

            el.saveButton.disabled =
                true;

            el.saveButton.textContent =
                "Saving...";
        }


        try {

            const paymentNumber =
                generatePaymentNumber();


            const currentTime =
                new Date()
                    .toISOString();


            const payment = {

                id:
                    "supplier-payment-" +
                    Date.now() +
                    "-" +
                    Math.random()
                        .toString(36)
                        .slice(2, 7),

                paymentNumber:
                    paymentNumber,

                paymentNo:
                    paymentNumber,

                date:
                    el.date.value,

                supplierId:
                    String(
                        supplier.id
                    ),

                supplierName:
                    supplier.name ||
                    "Unnamed Supplier",

                branchId:
                    supplier.branchId ||
                    getCurrentBranchId(),

                branchName:
                    supplier.branchName ||
                    getCurrentBranchName(),

                amount:
                    amount,

                paymentMethod:
                    el.method
                        ? el.method.value
                        : "Cash",

                reference:
                    el.reference
                        ? String(
                            el.reference.value ||
                            ""
                        ).trim()
                        : "",

                notes:
                    el.notes
                        ? String(
                            el.notes.value ||
                            ""
                        ).trim()
                        : "",

                recordedBy:
                    getCurrentUserName(),

                status:
                    "completed",

                balanceBefore:
                    currentBalance,

                balanceAfter:
                    Math.max(
                        0,
                        currentBalance -
                        amount
                    ),

                createdAt:
                    currentTime,

                updatedAt:
                    currentTime
            };


            const supplierIndex =
                suppliers.findIndex(
                    function (item) {

                        return (
                            String(
                                item.id
                            ) ===
                            String(
                                supplier.id
                            )
                        );
                    }
                );


            if (
                supplierIndex ===
                -1
            ) {

                throw new Error(
                    "Supplier record could not be found."
                );
            }


            suppliers[
                supplierIndex
            ].balance =
                payment.balanceAfter;


            suppliers[
                supplierIndex
            ].totalPaid =
                toNumber(
                    suppliers[
                        supplierIndex
                    ].totalPaid
                ) +
                amount;


            suppliers[
                supplierIndex
            ].lastPaymentDate =
                payment.date;


            suppliers[
                supplierIndex
            ].lastPaymentNumber =
                payment.paymentNumber;


            suppliers[
                supplierIndex
            ].updatedAt =
                currentTime;


            payments.push(
                payment
            );


            writeArray(
                SUPPLIERS_KEY,
                suppliers
            );


            writeArray(
                PAYMENTS_KEY,
                payments
            );


            dispatchDataUpdated(
                SUPPLIERS_KEY,
                suppliers
            );


            dispatchDataUpdated(
                PAYMENTS_KEY,
                payments
            );


            alert(
                "Supplier payment saved successfully.\n\n" +
                `Payment: ${payment.paymentNumber}\n` +
                `Amount: ${formatMoney(amount)}\n` +
                `Remaining Balance: ${formatMoney(
                    payment.balanceAfter
                )}`
            );


            prepareNewPayment();

            loadData();

            populateSupplierDropdown();

            refreshPayments();


        } catch (error) {

            console.error(
                "Supplier payment error:",
                error
            );


            alert(
                error.message ||
                "The supplier payment could not be saved."
            );

        } finally {

            if (el.saveButton) {

                el.saveButton.disabled =
                    false;

                el.saveButton.textContent =
                    "Save Payment";
            }
        }
    }


    /* ==========================================
       PREPARE NEW PAYMENT
    ========================================== */

    function prepareNewPayment() {

        if (el.form) {

            el.form.reset();
        }


        if (el.number) {

            el.number.value =
                generatePaymentNumber();
        }


        if (el.date) {

            el.date.value =
                getLocalDateKey(
                    new Date()
                );
        }


        if (el.method) {

            el.method.value =
                "Cash";
        }


        if (el.recordedBy) {

            el.recordedBy.value =
                getCurrentUserName();
        }


        if (el.branch) {

            el.branch.value =
                getCurrentBranchName();
        }


        updateSupplierInfo();
    }


    /* ==========================================
       PAYMENT HISTORY
    ========================================== */

    function displayPayments() {

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


        const methodFilter =
            el.methodFilter
                ? el.methodFilter.value
                : "";


        const dateFilter =
            el.dateFilter
                ? el.dateFilter.value
                : "";


        const filtered =
            payments
                .filter(
                    function (payment) {

                        const searchableText = [

                            payment.paymentNumber,

                            payment.paymentNo,

                            payment.supplierName,

                            payment.reference,

                            payment.recordedBy,

                            payment.branchName

                        ]
                            .join(" ")
                            .toLowerCase();


                        const matchesSearch =
                            !search ||
                            searchableText.includes(
                                search
                            );


                        const matchesMethod =
                            !methodFilter ||
                            String(
                                payment.paymentMethod ||
                                ""
                            ) ===
                                String(
                                    methodFilter
                                );


                        const matchesDate =
                            !dateFilter ||
                            String(
                                payment.date ||
                                ""
                            ) ===
                                String(
                                    dateFilter
                                );


                        return (
                            matchesSearch &&
                            matchesMethod &&
                            matchesDate
                        );
                    }
                )
                .sort(
                    function (a, b) {

                        return (
                            getTimestamp(
                                b
                            ) -
                            getTimestamp(
                                a
                            )
                        );
                    }
                );


        if (
            filtered.length ===
            0
        ) {

            el.tableBody.innerHTML = `
                <tr>

                    <td
                        colspan="9"
                        class="table-empty"
                    >
                        No supplier payments have been recorded.
                    </td>

                </tr>
            `;

            return;
        }


        el.tableBody.innerHTML =
            filtered
                .map(
                    function (payment) {

                        return `
                            <tr>

                                <td>
                                    <strong>
                                        ${escapeHTML(
                                            payment.paymentNumber ||
                                            payment.paymentNo ||
                                            payment.id
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHTML(
                                        formatDate(
                                            payment.date
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        payment.supplierName ||
                                        "—"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        payment.branchName ||
                                        "Head Office"
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${formatMoney(
                                            payment.amount
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHTML(
                                        payment.paymentMethod ||
                                        "Cash"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        payment.reference ||
                                        "—"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        payment.recordedBy ||
                                        "System"
                                    )}
                                </td>

                                <td>
                                    <span
                                        class="status-badge status-completed"
                                    >
                                        Completed
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

        const totalPayments =
            payments.reduce(
                function (
                    total,
                    payment
                ) {

                    return (
                        total +
                        toNumber(
                            payment.amount
                        )
                    );
                },
                0
            );


        const today =
            getLocalDateKey(
                new Date()
            );


        const todayPayments =
            payments
                .filter(
                    function (payment) {

                        return (
                            String(
                                payment.date ||
                                ""
                            ) ===
                            today
                        );
                    }
                )
                .reduce(
                    function (
                        total,
                        payment
                    ) {

                        return (
                            total +
                            toNumber(
                                payment.amount
                            )
                        );
                    },
                    0
                );


        const suppliersWithBalance =
            suppliers.filter(
                function (supplier) {

                    return (
                        toNumber(
                            supplier.balance
                        ) >
                        0
                    );
                }
            ).length;


        const totalSupplierBalance =
            suppliers.reduce(
                function (
                    total,
                    supplier
                ) {

                    return (
                        total +
                        Math.max(
                            0,
                            toNumber(
                                supplier.balance
                            )
                        )
                    );
                },
                0
            );


        setTextById(
            "totalSupplierPayments",
            formatMoney(
                totalPayments
            )
        );


        setTextById(
            "todaySupplierPayments",
            formatMoney(
                todayPayments
            )
        );


        setTextById(
            "suppliersWithBalance",
            formatNumber(
                suppliersWithBalance
            )
        );


        setTextById(
            "totalSupplierBalance",
            formatMoney(
                totalSupplierBalance
            )
        );
    }


    function refreshPayments() {

        updateSummary();

        displayPayments();
    }


    /* ==========================================
       SELECTED SUPPLIER
    ========================================== */

    function getSelectedSupplier() {

        if (
            !el.supplier ||
            !el.supplier.value
        ) {

            return null;
        }


        return (
            suppliers.find(
                function (supplier) {

                    return (
                        String(
                            supplier.id
                        ) ===
                        String(
                            el.supplier.value
                        )
                    );
                }
            ) ||
            null
        );
    }


    /* ==========================================
       PAYMENT NUMBER
    ========================================== */

    function generatePaymentNumber() {

        let highest =
            0;


        payments.forEach(
            function (payment) {

                const match =
                    String(
                        payment.paymentNumber ||
                        payment.paymentNo ||
                        ""
                    ).match(
                        /(\d+)$/
                    );


                if (match) {

                    highest =
                        Math.max(
                            highest,
                            Number(
                                match[1]
                            ) || 0
                        );
                }
            }
        );


        return (
            "SPAY-" +
            String(
                highest + 1
            ).padStart(
                6,
                "0"
            )
        );
    }


    /* ==========================================
       USER / BRANCH
    ========================================== */

    function getCurrentUserName() {

        const user =
            readObject(
                CURRENT_USER_KEY
            ) ||
            readObject(
                "currentUser"
            );


        if (!user) {

            return "System";
        }


        return (
            user.fullName ||
            user.name ||
            user.username ||
            user.email ||
            "System"
        );
    }


    function getCurrentBranchId() {

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


        const user =
            readObject(
                CURRENT_USER_KEY
            ) ||
            readObject(
                "currentUser"
            );


        if (
            user &&
            user.branchId
        ) {

            return String(
                user.branchId
            );
        }


        return DEFAULT_BRANCH_ID;
    }


    function getCurrentBranchName() {

        const activeBranch =
            readObject(
                ACTIVE_BRANCH_KEY
            );


        if (activeBranch) {

            return (
                activeBranch.branchName ||
                activeBranch.name ||
                "Head Office"
            );
        }


        const user =
            readObject(
                CURRENT_USER_KEY
            ) ||
            readObject(
                "currentUser"
            );


        if (
            user &&
            user.branchName
        ) {

            return user.branchName;
        }


        return "Head Office";
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
                "Unable to read:",
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


    function dispatchDataUpdated(
        key,
        value
    ) {

        document.dispatchEvent(
            new CustomEvent(
                "jufelix:data-updated",
                {
                    detail: {
                        key:
                            key,

                        value:
                            value
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
                            key,

                        value:
                            value
                    }
                }
            )
        );
    }


    /* ==========================================
       DATE
    ========================================== */

    function getLocalDateKey(
        date
    ) {

        const valid =
            date instanceof Date &&
            !Number.isNaN(
                date.getTime()
            )
                ? date
                : new Date();


        return (
            valid.getFullYear() +
            "-" +
            String(
                valid.getMonth() +
                1
            ).padStart(
                2,
                "0"
            ) +
            "-" +
            String(
                valid.getDate()
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


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return value;
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
        payment
    ) {

        const value =
            payment.createdAt ||
            payment.date ||
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


    function toNumber(
        value
    ) {

        const number =
            Number(
                value
            );


        return Number.isFinite(
            number
        )
            ? number
            : 0;
    }


    function setValue(
        element,
        value
    ) {

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


    function setText(
        element,
        value
    ) {

        if (element) {

            element.textContent =
                value;
        }
    }


    function setTextById(
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

    window.JufelixSupplierPayments = {

        refresh:
            function () {

                loadData();

                populateSupplierDropdown();

                refreshPayments();
            }
    };

})();