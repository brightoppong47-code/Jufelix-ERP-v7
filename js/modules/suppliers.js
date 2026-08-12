/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   SUPPLIERS + ACCOUNTS PAYABLE MODULE

   File:
   js/modules/suppliers.js
========================================== */

(function () {
    "use strict";


    /* ==========================================
       STORAGE KEYS
    ========================================== */

    const SUPPLIERS_KEY =
        "jufelix_v7_suppliers";

    const SUPPLIER_PAYMENTS_KEY =
        "jufelix_v7_supplier_payments";

    const BRANCHES_KEY =
        "jufelix_v7_branches";

    const ACTIVE_BRANCH_KEY =
        "jufelix_v7_active_branch";


    /* ==========================================
       STATE
    ========================================== */

    let suppliers = [];

    let payments = [];

    let editingSupplierId =
        null;


    /* ==========================================
       ELEMENTS
    ========================================== */

    const supplierForm =
        document.getElementById(
            "supplierForm"
        );

    const supplierTableBody =
        document.getElementById(
            "supplierTableBody"
        );

    const supplierSearch =
        document.getElementById(
            "supplierSearch"
        );

    const supplierStatusFilter =
        document.getElementById(
            "supplierStatusFilter"
        );

    const clearSupplierButton =
        document.getElementById(
            "clearSupplierButton"
        );

    const saveSupplierButton =
        document.getElementById(
            "saveSupplierButton"
        );

    const supplierFormTitle =
        document.getElementById(
            "supplierFormTitle"
        );


    /* ==========================================
       PAYMENT ELEMENTS
    ========================================== */

    const paymentPanel =
        document.getElementById(
            "supplierPaymentPanel"
        );

    const paymentForm =
        document.getElementById(
            "supplierPaymentForm"
        );

    const paymentSupplierId =
        document.getElementById(
            "paymentSupplierId"
        );

    const paymentSupplierName =
        document.getElementById(
            "paymentSupplierName"
        );

    const paymentSupplierPurchases =
        document.getElementById(
            "paymentSupplierPurchases"
        );

    const paymentSupplierTotalPaid =
        document.getElementById(
            "paymentSupplierTotalPaid"
        );

    const paymentSupplierBalance =
        document.getElementById(
            "paymentSupplierBalance"
        );

    const paymentDate =
        document.getElementById(
            "supplierPaymentDate"
        );

    const paymentAmount =
        document.getElementById(
            "supplierPaymentAmount"
        );

    const paymentMethod =
        document.getElementById(
            "supplierPaymentMethod"
        );

    const paymentReference =
        document.getElementById(
            "supplierPaymentReference"
        );

    const paymentNotes =
        document.getElementById(
            "supplierPaymentNotes"
        );

    const cancelPaymentButton =
        document.getElementById(
            "cancelSupplierPaymentButton"
        );

    const savePaymentButton =
        document.getElementById(
            "saveSupplierPaymentButton"
        );

    const paymentTableBody =
        document.getElementById(
            "supplierPaymentTableBody"
        );


    /* ==========================================
       INITIALIZE
    ========================================== */

    document.addEventListener(
        "DOMContentLoaded",
        initializeSuppliers
    );


    function initializeSuppliers() {

        ensureHeadOffice();

        loadSuppliers();

        loadPayments();

        migrateOldSuppliers();

        connectEvents();

        refreshSuppliers();

        displayPaymentHistory();

        console.log(
            "Jufelix Suppliers & Accounts Payable loaded."
        );
    }


    /* ==========================================
       EVENTS
    ========================================== */

    function connectEvents() {

        if (supplierForm) {

            supplierForm.addEventListener(
                "submit",
                saveSupplier
            );
        }


        if (clearSupplierButton) {

            clearSupplierButton.addEventListener(
                "click",
                resetSupplierForm
            );
        }


        if (supplierSearch) {

            supplierSearch.addEventListener(
                "input",
                displaySuppliers
            );
        }


        if (supplierStatusFilter) {

            supplierStatusFilter.addEventListener(
                "change",
                displaySuppliers
            );
        }


        if (paymentForm) {

            paymentForm.addEventListener(
                "submit",
                saveSupplierPayment
            );
        }


        if (cancelPaymentButton) {

            cancelPaymentButton.addEventListener(
                "click",
                closePaymentForm
            );
        }


        document.addEventListener(
            "jufelix:data-updated",
            function (event) {

                if (
                    !event.detail
                ) {
                    return;
                }


                if (
                    event.detail.key ===
                    SUPPLIERS_KEY
                ) {

                    loadSuppliers();

                    refreshSuppliers();
                }
            }
        );


        window.addEventListener(
            "storage",
            function (event) {

                if (
                    event.key ===
                        SUPPLIERS_KEY ||
                    event.key ===
                        SUPPLIER_PAYMENTS_KEY ||
                    event.key ===
                        ACTIVE_BRANCH_KEY ||
                    event.key ===
                        BRANCHES_KEY
                ) {

                    loadSuppliers();

                    loadPayments();

                    refreshSuppliers();

                    displayPaymentHistory();
                }
            }
        );
    }


    /* ==========================================
       SAVE SUPPLIER
    ========================================== */

    function saveSupplier(
        event
    ) {

        event.preventDefault();


        const branch =
            getActiveBranch();


        const supplierData = {

            name:
                getValue(
                    "supplierName"
                ),

            contactPerson:
                getValue(
                    "supplierContactPerson"
                ),

            phone:
                getValue(
                    "supplierPhone"
                ),

            email:
                getValue(
                    "supplierEmail"
                ),

            taxNumber:
                getValue(
                    "supplierTaxNumber"
                ),

            status:
                getValue(
                    "supplierStatus"
                ) ||
                "active",

            address:
                getValue(
                    "supplierAddress"
                ),

            notes:
                getValue(
                    "supplierNotes"
                ),

            branchId:
                branch.id,

            branchName:
                branch.name
        };


        if (!supplierData.name) {

            alert(
                "Enter the supplier name."
            );

            return;
        }


        if (!supplierData.phone) {

            alert(
                "Enter the supplier phone number."
            );

            return;
        }


        const duplicate =
            suppliers.find(
                function (supplier) {

                    if (
                        String(
                            supplier.id
                        ) ===
                        String(
                            editingSupplierId
                        )
                    ) {

                        return false;
                    }


                    return (
                        normalizeText(
                            supplier.name
                        ) ===
                            normalizeText(
                                supplierData.name
                            ) ||
                        normalizePhone(
                            supplier.phone
                        ) ===
                            normalizePhone(
                                supplierData.phone
                            )
                    );
                }
            );


        if (duplicate) {

            alert(
                "A supplier with this name or phone number already exists."
            );

            return;
        }


        const wasEditing =
            editingSupplierId !==
            null;


        if (wasEditing) {

            if (
                !updateSupplier(
                    supplierData
                )
            ) {

                return;
            }

        } else {

            createSupplier(
                supplierData
            );
        }


        if (
            !saveSuppliers()
        ) {

            return;
        }


        resetSupplierForm();

        refreshSuppliers();


        alert(
            wasEditing
                ? "Supplier updated successfully."
                : "Supplier saved successfully."
        );
    }


    /* ==========================================
       CREATE
    ========================================== */

    function createSupplier(
        data
    ) {

        const now =
            new Date()
                .toISOString();


        suppliers.push({

            id:
                createSupplierId(),

            supplierNumber:
                createSupplierNumber(),

            ...data,

            totalPurchases:
                0,

            totalPaid:
                0,

            balance:
                0,

            lastPurchaseDate:
                null,

            lastPurchaseNumber:
                "",

            lastPaymentDate:
                null,

            createdAt:
                now,

            updatedAt:
                now
        });
    }


    /* ==========================================
       UPDATE
    ========================================== */

    function updateSupplier(
        data
    ) {

        const index =
            suppliers.findIndex(
                function (supplier) {

                    return (
                        String(
                            supplier.id
                        ) ===
                        String(
                            editingSupplierId
                        )
                    );
                }
            );


        if (
            index ===
            -1
        ) {

            alert(
                "Supplier not found."
            );

            return false;
        }


        const existing =
            suppliers[
                index
            ];


        suppliers[
            index
        ] = {

            ...existing,

            ...data,

            id:
                existing.id,

            supplierNumber:
                existing
                    .supplierNumber ||
                createSupplierNumber(),

            totalPurchases:
                toNumber(
                    existing
                        .totalPurchases
                ),

            totalPaid:
                toNumber(
                    existing
                        .totalPaid
                ),

            balance:
                toNumber(
                    existing
                        .balance
                ),

            createdAt:
                existing
                    .createdAt ||
                new Date()
                    .toISOString(),

            updatedAt:
                new Date()
                    .toISOString()
        };


        return true;
    }


    /* ==========================================
       EDIT
    ========================================== */

    function editSupplier(
        id
    ) {

        const supplier =
            findSupplier(
                id
            );


        if (!supplier) {

            alert(
                "Supplier not found."
            );

            return;
        }


        editingSupplierId =
            supplier.id;


        setValue(
            "supplierId",
            supplier.id
        );

        setValue(
            "supplierName",
            supplier.name
        );

        setValue(
            "supplierContactPerson",
            supplier.contactPerson
        );

        setValue(
            "supplierPhone",
            supplier.phone
        );

        setValue(
            "supplierEmail",
            supplier.email
        );

        setValue(
            "supplierTaxNumber",
            supplier.taxNumber
        );

        setValue(
            "supplierStatus",
            supplier.status ||
            "active"
        );

        setValue(
            "supplierAddress",
            supplier.address
        );

        setValue(
            "supplierNotes",
            supplier.notes
        );


        if (supplierFormTitle) {

            supplierFormTitle.textContent =
                "Edit Supplier";
        }


        if (saveSupplierButton) {

            saveSupplierButton.textContent =
                "Update Supplier";
        }


        if (supplierForm) {

            supplierForm.scrollIntoView({

                behavior:
                    "smooth",

                block:
                    "start"
            });
        }
    }


    /* ==========================================
       DELETE
    ========================================== */

    function deleteSupplier(
        id
    ) {

        const supplier =
            findSupplier(
                id
            );


        if (!supplier) {

            alert(
                "Supplier not found."
            );

            return;
        }


        if (
            toNumber(
                supplier.balance
            ) >
            0
        ) {

            alert(
                `"${supplier.name}" still has an outstanding balance of ${formatMoney(
                    supplier.balance
                )}.\n\nClear the supplier balance before deleting this supplier.`
            );

            return;
        }


        const confirmed =
            confirm(
                `Delete "${supplier.name}" permanently?`
            );


        if (!confirmed) {
            return;
        }


        suppliers =
            suppliers.filter(
                function (item) {

                    return (
                        String(
                            item.id
                        ) !==
                        String(id)
                    );
                }
            );


        saveSuppliers();

        resetSupplierForm();

        refreshSuppliers();


        alert(
            "Supplier deleted successfully."
        );
    }


    /* ==========================================
       OPEN PAYMENT FORM
    ========================================== */

    function openPaymentForm(
        id
    ) {

        const supplier =
            findSupplier(
                id
            );


        if (!supplier) {

            alert(
                "Supplier not found."
            );

            return;
        }


        const balance =
            toNumber(
                supplier.balance
            );


        if (
            balance <=
            0
        ) {

            alert(
                "This supplier has no outstanding balance."
            );

            return;
        }


        if (paymentSupplierId) {

            paymentSupplierId.value =
                supplier.id;
        }


        setTextElement(
            paymentSupplierName,
            supplier.name ||
            "Supplier"
        );


        setTextElement(
            paymentSupplierPurchases,
            formatMoney(
                supplier.totalPurchases
            )
        );


        setTextElement(
            paymentSupplierTotalPaid,
            formatMoney(
                supplier.totalPaid
            )
        );


        setTextElement(
            paymentSupplierBalance,
            formatMoney(
                balance
            )
        );


        if (paymentDate) {

            paymentDate.value =
                dateKey(
                    new Date()
                );
        }


        if (paymentAmount) {

            paymentAmount.value =
                "";
        }


        if (paymentMethod) {

            paymentMethod.value =
                "Cash";
        }


        if (paymentReference) {

            paymentReference.value =
                "";
        }


        if (paymentNotes) {

            paymentNotes.value =
                "";
        }


        if (paymentPanel) {

            paymentPanel.classList.add(
                "show"
            );


            paymentPanel.scrollIntoView({

                behavior:
                    "smooth",

                block:
                    "start"
            });
        }
    }


    /* ==========================================
       CLOSE PAYMENT
    ========================================== */

    function closePaymentForm() {

        if (paymentForm) {

            paymentForm.reset();
        }


        if (paymentSupplierId) {

            paymentSupplierId.value =
                "";
        }


        if (paymentPanel) {

            paymentPanel.classList.remove(
                "show"
            );
        }
    }


    /* ==========================================
       SAVE PAYMENT
    ========================================== */

    function saveSupplierPayment(
        event
    ) {

        event.preventDefault();


        loadSuppliers();

        loadPayments();


        const supplierId =
            paymentSupplierId
                ? paymentSupplierId.value
                : "";


        const supplier =
            findSupplier(
                supplierId
            );


        if (!supplier) {

            showToast(
                "Supplier not found.",
                "error"
            );

            return;
        }


        const amount =
            parseNumber(
                paymentAmount
                    ? paymentAmount.value
                    : 0
            );


        const currentBalance =
            toNumber(
                supplier.balance
            );


        if (
            amount <=
            0
        ) {

            showToast(
                "Enter a valid payment amount.",
                "error"
            );

            return;
        }


        if (
            amount >
            currentBalance
        ) {

            showToast(
                "Payment cannot be greater than the supplier's outstanding balance.",
                "error"
            );

            return;
        }


        if (
            !paymentDate ||
            !paymentDate.value
        ) {

            showToast(
                "Select the payment date.",
                "error"
            );

            return;
        }


        if (savePaymentButton) {

            savePaymentButton.disabled =
                true;

            savePaymentButton.textContent =
                "Saving...";
        }


        try {

            const newBalance =
                Math.max(
                    0,
                    currentBalance -
                    amount
                );


            const payment = {

                id:
                    "supplier-payment-" +
                    Date.now() +
                    "-" +
                    Math.random()
                        .toString(36)
                        .slice(2,7),

                paymentNumber:
                    generatePaymentNumber(),

                supplierId:
                    supplier.id,

                supplierName:
                    supplier.name,

                date:
                    paymentDate.value,

                paymentDate:
                    paymentDate.value,

                amount:
                    amount,

                paymentMethod:
                    paymentMethod
                        ? paymentMethod.value
                        : "Cash",

                reference:
                    paymentReference
                        ? String(
                            paymentReference.value ||
                            ""
                        ).trim()
                        : "",

                notes:
                    paymentNotes
                        ? String(
                            paymentNotes.value ||
                            ""
                        ).trim()
                        : "",

                balanceBefore:
                    currentBalance,

                balanceAfter:
                    newBalance,

                branchId:
                    supplier.branchId ||
                    "",

                branchName:
                    supplier.branchName ||
                    "",

                createdAt:
                    new Date()
                        .toISOString()
            };


            supplier.balance =
                newBalance;


            supplier.totalPaid =
                toNumber(
                    supplier.totalPaid
                ) +
                amount;


            supplier.lastPaymentDate =
                payment.date;


            supplier.updatedAt =
                new Date()
                    .toISOString();


            payments.push(
                payment
            );


            if (
                !saveSuppliers()
            ) {

                throw new Error(
                    "Supplier account could not be updated."
                );
            }


            writeArray(
                SUPPLIER_PAYMENTS_KEY,
                payments
            );


            notifyPaymentSaved(
                payment
            );


            closePaymentForm();

            loadSuppliers();

            refreshSuppliers();

            displayPaymentHistory();


            showToast(
                `Payment of ${formatMoney(
                    amount
                )} recorded successfully.`,
                "success"
            );


        } catch (error) {

            console.error(
                "Supplier payment error:",
                error
            );


            showToast(
                error.message ||
                "Supplier payment could not be saved.",
                "error"
            );


        } finally {

            if (savePaymentButton) {

                savePaymentButton.disabled =
                    false;

                savePaymentButton.textContent =
                    "💵 Record Payment";
            }
        }
    }


    /* ==========================================
       DISPLAY SUPPLIERS
    ========================================== */

    function displaySuppliers() {

        if (!supplierTableBody) {
            return;
        }


        const search =
            String(
                supplierSearch
                    ? supplierSearch.value
                    : ""
            )
                .trim()
                .toLowerCase();


        const statusFilter =
            supplierStatusFilter
                ? supplierStatusFilter.value
                : "";


        const filtered =
            suppliers
                .filter(
                    function (supplier) {

                        const searchable = [

                            supplier.name,

                            supplier.supplierNumber,

                            supplier.contactPerson,

                            supplier.phone,

                            supplier.email,

                            supplier.address,

                            supplier.taxNumber

                        ]
                            .join(" ")
                            .toLowerCase();


                        const matchesSearch =
                            !search ||
                            searchable.includes(
                                search
                            );


                        const matchesStatus =
                            !statusFilter ||
                            String(
                                supplier.status ||
                                "active"
                            )
                                .toLowerCase() ===
                            statusFilter;


                        return (
                            matchesSearch &&
                            matchesStatus
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


        if (
            filtered.length ===
            0
        ) {

            supplierTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="9"
                        class="table-empty"
                    >
                        No matching suppliers found.
                    </td>

                </tr>

            `;


            return;
        }


        supplierTableBody.innerHTML =
            filtered
                .map(
                    function (supplier) {

                        const status =
                            String(
                                supplier.status ||
                                "active"
                            )
                                .toLowerCase();


                        const balance =
                            toNumber(
                                supplier.balance
                            );


                        return `

                            <tr>

                                <td>

                                    <strong>
                                        ${escapeHTML(
                                            supplier.name
                                        )}
                                    </strong>

                                    <div
                                        style="
                                            margin-top:4px;
                                            color:#6b7280;
                                            font-size:11px;
                                        "
                                    >
                                        ${escapeHTML(
                                            supplier.supplierNumber ||
                                            ""
                                        )}
                                    </div>

                                </td>


                                <td>
                                    ${escapeHTML(
                                        supplier.contactPerson ||
                                        "—"
                                    )}
                                </td>


                                <td>
                                    ${escapeHTML(
                                        supplier.phone ||
                                        "—"
                                    )}
                                </td>


                                <td>
                                    ${formatMoney(
                                        supplier.totalPurchases
                                    )}
                                </td>


                                <td>
                                    ${formatMoney(
                                        supplier.totalPaid
                                    )}
                                </td>


                                <td>

                                    <span
                                        class="${
                                            balance > 0
                                                ? "balance-positive"
                                                : "balance-clear"
                                        }"
                                    >
                                        ${formatMoney(
                                            balance
                                        )}
                                    </span>

                                </td>


                                <td>
                                    ${formatDate(
                                        supplier.lastPurchaseDate
                                    )}
                                </td>


                                <td>

                                    <span
                                        class="status-badge ${
                                            status ===
                                            "active"
                                                ? "status-active"
                                                : "status-inactive"
                                        }"
                                    >
                                        ${
                                            status ===
                                            "active"
                                                ? "Active"
                                                : "Inactive"
                                        }
                                    </span>

                                </td>


                                <td>

                                    <div class="supplier-actions">

                                        <button
                                            type="button"
                                            class="action-button edit-button"
                                            data-edit-supplier="${escapeHTML(
                                                supplier.id
                                            )}"
                                        >
                                            Edit
                                        </button>


                                        <button
                                            type="button"
                                            class="action-button pay-button"
                                            data-pay-supplier="${escapeHTML(
                                                supplier.id
                                            )}"
                                            ${
                                                balance <= 0
                                                    ? "disabled"
                                                    : ""
                                            }
                                        >
                                            Pay
                                        </button>


                                        <button
                                            type="button"
                                            class="action-button delete-button"
                                            data-delete-supplier="${escapeHTML(
                                                supplier.id
                                            )}"
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </td>

                            </tr>

                        `;
                    }
                )
                .join("");


        supplierTableBody
            .querySelectorAll(
                "[data-edit-supplier]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            editSupplier(
                                button.dataset
                                    .editSupplier
                            );
                        }
                    );
                }
            );


        supplierTableBody
            .querySelectorAll(
                "[data-pay-supplier]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            openPaymentForm(
                                button.dataset
                                    .paySupplier
                            );
                        }
                    );
                }
            );


        supplierTableBody
            .querySelectorAll(
                "[data-delete-supplier]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            deleteSupplier(
                                button.dataset
                                    .deleteSupplier
                            );
                        }
                    );
                }
            );
    }


    /* ==========================================
       PAYMENT HISTORY
    ========================================== */

    function displayPaymentHistory() {

        if (!paymentTableBody) {
            return;
        }


        payments =
            readArray(
                SUPPLIER_PAYMENTS_KEY
            );


        const rows =
            payments
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
                );


        if (
            rows.length ===
            0
        ) {

            paymentTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="7"
                        class="table-empty"
                    >
                        No supplier payments recorded.
                    </td>

                </tr>

            `;


            return;
        }


        paymentTableBody.innerHTML =
            rows
                .map(
                    function (payment) {

                        return `

                            <tr>

                                <td>

                                    <strong>
                                        ${escapeHTML(
                                            payment.paymentNumber ||
                                            payment.id
                                        )}
                                    </strong>

                                </td>


                                <td>
                                    ${formatDate(
                                        payment.paymentDate ||
                                        payment.date
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

                                    <strong>
                                        ${formatMoney(
                                            payment.amount
                                        )}
                                    </strong>

                                </td>


                                <td>
                                    ${formatMoney(
                                        payment.balanceAfter
                                    )}
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

    function updateSupplierSummary() {

        const totalSuppliers =
            suppliers.length;


        const activeSuppliers =
            suppliers.filter(
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
            ).length;


        const totalPurchases =
            suppliers.reduce(
                function (
                    total,
                    supplier
                ) {

                    return (
                        total +
                        toNumber(
                            supplier.totalPurchases
                        )
                    );
                },
                0
            );


        const totalBalance =
            suppliers.reduce(
                function (
                    total,
                    supplier
                ) {

                    return (
                        total +
                        toNumber(
                            supplier.balance
                        )
                    );
                },
                0
            );


        setText(
            "totalSuppliers",
            formatNumber(
                totalSuppliers
            )
        );


        setText(
            "activeSuppliers",
            formatNumber(
                activeSuppliers
            )
        );


        setText(
            "supplierTotalPurchases",
            formatMoney(
                totalPurchases
            )
        );


        setText(
            "supplierOutstandingBalance",
            formatMoney(
                totalBalance
            )
        );
    }


    /* ==========================================
       RESET SUPPLIER FORM
    ========================================== */

    function resetSupplierForm() {

        editingSupplierId =
            null;


        if (supplierForm) {

            supplierForm.reset();
        }


        setValue(
            "supplierId",
            ""
        );


        setValue(
            "supplierStatus",
            "active"
        );


        if (supplierFormTitle) {

            supplierFormTitle.textContent =
                "Add New Supplier";
        }


        if (saveSupplierButton) {

            saveSupplierButton.textContent =
                "Save Supplier";
        }
    }


    /* ==========================================
       REFRESH
    ========================================== */

    function refreshSuppliers() {

        loadSuppliers();

        updateSupplierSummary();

        displaySuppliers();
    }


    /* ==========================================
       PURCHASE API
    ========================================== */

    function recordPurchase(
        supplierId,
        purchaseData
    ) {

        loadSuppliers();


        const index =
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
            index ===
            -1
        ) {

            return false;
        }


        const supplier =
            suppliers[
                index
            ];


        const amount =
            toNumber(
                purchaseData &&
                purchaseData.amount
            );


        const paidAmount =
            toNumber(
                purchaseData &&
                purchaseData.paidAmount
            );


        const credit =
            Math.max(
                0,
                amount -
                paidAmount
            );


        supplier.totalPurchases =
            toNumber(
                supplier.totalPurchases
            ) +
            amount;


        supplier.totalPaid =
            toNumber(
                supplier.totalPaid
            ) +
            paidAmount;


        supplier.balance =
            toNumber(
                supplier.balance
            ) +
            credit;


        supplier.lastPurchaseDate =
            purchaseData &&
            purchaseData.date
                ? purchaseData.date
                : dateKey(
                    new Date()
                );


        supplier.lastPurchaseNumber =
            purchaseData &&
            (
                purchaseData.purchaseNo ||
                purchaseData.purchaseNumber
            )
                ? (
                    purchaseData.purchaseNo ||
                    purchaseData.purchaseNumber
                )
                : "";


        supplier.updatedAt =
            new Date()
                .toISOString();


        return saveSuppliers();
    }


    /* ==========================================
       LEGACY PAYMENT API
    ========================================== */

    function recordPayment(
        supplierId,
        amount
    ) {

        loadSuppliers();


        const supplier =
            findSupplier(
                supplierId
            );


        if (!supplier) {
            return false;
        }


        const paymentAmount =
            Math.max(
                0,
                toNumber(
                    amount
                )
            );


        if (
            paymentAmount >
            toNumber(
                supplier.balance
            )
        ) {

            return false;
        }


        supplier.balance =
            Math.max(
                0,
                toNumber(
                    supplier.balance
                ) -
                paymentAmount
            );


        supplier.totalPaid =
            toNumber(
                supplier.totalPaid
            ) +
            paymentAmount;


        supplier.updatedAt =
            new Date()
                .toISOString();


        return saveSuppliers();
    }


    /* ==========================================
       GETTERS
    ========================================== */

    function findSupplier(
        id
    ) {

        return (
            suppliers.find(
                function (supplier) {

                    return (
                        String(
                            supplier.id
                        ) ===
                        String(id)
                    );
                }
            ) ||
            null
        );
    }


    function getAllSuppliers() {

        return suppliers.map(
            function (supplier) {

                return {
                    ...supplier
                };
            }
        );
    }


    function getActiveSuppliers() {

        return suppliers
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
            .map(
                function (supplier) {

                    return {
                        ...supplier
                    };
                }
            );
    }


    function getSupplierById(
        id
    ) {

        const supplier =
            findSupplier(
                id
            );


        return supplier
            ? {
                ...supplier
            }
            : null;
    }


    function getSuppliersForBranch(
        branchId
    ) {

        return suppliers
            .filter(
                function (supplier) {

                    return (
                        supplier.shared ===
                            true ||
                        !supplier.branchId ||
                        String(
                            supplier.branchId
                        ) ===
                        String(
                            branchId
                        )
                    );
                }
            )
            .map(
                function (supplier) {

                    return {
                        ...supplier
                    };
                }
            );
    }


    /* ==========================================
       LOAD / SAVE
    ========================================== */

    function loadSuppliers() {

        suppliers =
            readArray(
                SUPPLIERS_KEY
            );
    }


    function loadPayments() {

        payments =
            readArray(
                SUPPLIER_PAYMENTS_KEY
            );
    }


    function saveSuppliers() {

        try {

            localStorage.setItem(
                SUPPLIERS_KEY,
                JSON.stringify(
                    suppliers
                )
            );


            document.dispatchEvent(
                new CustomEvent(
                    "jufelix:data-updated",
                    {
                        detail: {

                            key:
                                SUPPLIERS_KEY,

                            value:
                                suppliers
                        }
                    }
                )
            );


            return true;


        } catch (error) {

            console.error(
                "Supplier save error:",
                error
            );


            return false;
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


    function readArray(
        key
    ) {

        try {

            const saved =
                localStorage.getItem(
                    key
                );


            if (!saved) {
                return [];
            }


            const parsed =
                JSON.parse(
                    saved
                );


            return Array.isArray(
                parsed
            )
                ? parsed
                : [];


        } catch (error) {

            return [];
        }
    }


    function readObject(
        key
    ) {

        try {

            const saved =
                localStorage.getItem(
                    key
                );


            if (!saved) {
                return null;
            }


            const parsed =
                JSON.parse(
                    saved
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
       MIGRATION
    ========================================== */

    function migrateOldSuppliers() {

        let changed =
            false;


        const headOffice =
            getHeadOffice();


        suppliers =
            suppliers.map(
                function (
                    supplier,
                    index
                ) {

                    const updated = {
                        ...supplier
                    };


                    if (!updated.id) {

                        updated.id =
                            "sup-old-" +
                            Date.now() +
                            "-" +
                            index;

                        changed =
                            true;
                    }


                    if (
                        !updated.supplierNumber
                    ) {

                        updated.supplierNumber =
                            createSupplierNumber(
                                index
                            );

                        changed =
                            true;
                    }


                    if (!updated.branchId) {

                        updated.branchId =
                            headOffice.id;

                        updated.branchName =
                            headOffice.name;

                        changed =
                            true;
                    }


                    if (!updated.status) {

                        updated.status =
                            "active";

                        changed =
                            true;
                    }


                    if (
                        updated.totalPurchases ===
                        undefined
                    ) {

                        updated.totalPurchases =
                            0;

                        changed =
                            true;
                    }


                    if (
                        updated.totalPaid ===
                        undefined
                    ) {

                        updated.totalPaid =
                            0;

                        changed =
                            true;
                    }


                    if (
                        updated.balance ===
                        undefined
                    ) {

                        updated.balance =
                            0;

                        changed =
                            true;
                    }


                    return updated;
                }
            );


        if (changed) {

            saveSuppliers();
        }
    }


    /* ==========================================
       BRANCHES
    ========================================== */

    function ensureHeadOffice() {

        let branches =
            readArray(
                BRANCHES_KEY
            );


        const exists =
            branches.some(
                function (branch) {

                    return (
                        branch.id ===
                            "head-office" ||
                        branch.isHeadOffice ===
                            true ||
                        branch.type ===
                            "head-office"
                    );
                }
            );


        if (!exists) {

            branches.unshift({

                id:
                    "head-office",

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


    function getHeadOffice() {

        const branches =
            readArray(
                BRANCHES_KEY
            );


        const branch =
            branches.find(
                function (item) {

                    return (
                        item.id ===
                            "head-office" ||
                        item.isHeadOffice ===
                            true ||
                        item.type ===
                            "head-office"
                    );
                }
            );


        return normalizeBranch(
            branch || {

                id:
                    "head-office",

                name:
                    "Head Office"
            }
        );
    }


    function getActiveBranch() {

        const activeBranch =
            readObject(
                ACTIVE_BRANCH_KEY
            );


        return activeBranch
            ? normalizeBranch(
                activeBranch
            )
            : getHeadOffice();
    }


    function normalizeBranch(
        branch
    ) {

        return {

            id:
                branch.id ||
                branch.branchId ||
                "head-office",

            name:
                branch.name ||
                branch.branchName ||
                "Head Office"
        };
    }


    /* ==========================================
       GENERATORS
    ========================================== */

    function createSupplierId() {

        return (
            "sup-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2,7)
        );
    }


    function createSupplierNumber(
        extra
    ) {

        const now =
            new Date();


        return (
            "SUP-" +
            String(
                now.getFullYear()
            ).slice(-2) +
            String(
                now.getMonth() +
                1
            ).padStart(
                2,
                "0"
            ) +
            String(
                now.getDate()
            ).padStart(
                2,
                "0"
            ) +
            "-" +
            String(
                Date.now()
            ).slice(-5) +
            (
                extra !==
                undefined
                    ? extra
                    : ""
            )
        );
    }


    function generatePaymentNumber() {

        let highest =
            0;


        payments.forEach(
            function (payment) {

                const match =
                    String(
                        payment.paymentNumber ||
                        ""
                    )
                        .match(
                            /(\d+)$/
                        );


                if (match) {

                    highest =
                        Math.max(
                            highest,
                            Number(
                                match[1]
                            ) ||
                            0
                        );
                }
            }
        );


        return (
            "SPAY-" +
            String(
                highest +
                1
            ).padStart(
                6,
                "0"
            )
        );
    }


    /* ==========================================
       EVENTS
    ========================================== */

    function notifyPaymentSaved(
        payment
    ) {

        document.dispatchEvent(
            new CustomEvent(
                "jufelix:data-updated",
                {
                    detail: {

                        key:
                            SUPPLIER_PAYMENTS_KEY,

                        module:
                            "supplier-payments",

                        record:
                            payment,

                        value:
                            payments
                    }
                }
            )
        );
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


    function setTextElement(
        element,
        value
    ) {

        if (element) {

            element.textContent =
                value;
        }
    }


    /* ==========================================
       NUMBERS / DATE
    ========================================== */

    function parseNumber(
        value
    ) {

        let text =
            String(
                value ||
                ""
            ).trim();


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

        return parseNumber(
            value
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


        const normalized =
            /^\d{4}-\d{2}-\d{2}$/
                .test(
                    String(
                        value
                    )
                )
                ? value +
                  "T00:00:00"
                : value;


        const date =
            new Date(
                normalized
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "—";
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
            record.paymentDate ||
            record.date ||
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


    function normalizeText(
        value
    ) {

        return String(
            value ||
            ""
        )
            .trim()
            .toLowerCase();
    }


    function normalizePhone(
        value
    ) {

        return String(
            value ||
            ""
        )
            .replace(
                /[\s\-()]/g,
                ""
            )
            .trim();
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

        const old =
            document.querySelector(
                ".toast"
            );


        if (old) {

            old.remove();
        }


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            "toast" +
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

                toast.remove();

            },
            3200
        );
    }


    /* ==========================================
       PUBLIC API
    ========================================== */

    window.JufelixSuppliers = {

        editSupplier:
            editSupplier,

        deleteSupplier:
            deleteSupplier,

        paySupplier:
            openPaymentForm,

        refresh:
            function () {

                loadSuppliers();

                loadPayments();

                refreshSuppliers();

                displayPaymentHistory();
            },

        resetForm:
            resetSupplierForm,

        getAll:
            getAllSuppliers,

        getActive:
            getActiveSuppliers,

        getById:
            getSupplierById,

        getForBranch:
            getSuppliersForBranch,

        recordPurchase:
            recordPurchase,

        recordPayment:
            recordPayment,

        getCurrentBranch:
            getActiveBranch
    };

})();