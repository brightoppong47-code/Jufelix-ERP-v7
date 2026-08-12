/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   CUSTOMERS MODULE

   File:
   js/modules/customers.js
========================================== */

(function () {
    "use strict";

    /* ==========================================
       STORAGE KEYS
    ========================================== */

    const CUSTOMERS_KEY =
        "jufelix_v7_customers";

    const BRANCHES_KEY =
        "jufelix_v7_branches";

    const ACTIVE_BRANCH_KEY =
        "jufelix_v7_active_branch";


    /* ==========================================
       STATE
    ========================================== */

    let customers = [];

    let editingCustomerId = null;


    /* ==========================================
       ELEMENTS
    ========================================== */

    const customerForm =
        document.getElementById(
            "customerForm"
        );

    const customerTableBody =
        document.getElementById(
            "customerTableBody"
        );

    const customerSearch =
        document.getElementById(
            "customerSearch"
        );

    const customerTypeFilter =
        document.getElementById(
            "customerTypeFilter"
        );

    const customerStatusFilter =
        document.getElementById(
            "customerStatusFilter"
        );

    const clearCustomerButton =
        document.getElementById(
            "clearCustomerButton"
        );

    const saveCustomerButton =
        document.getElementById(
            "saveCustomerButton"
        );

    const customerFormTitle =
        document.getElementById(
            "customerFormTitle"
        );


    /* ==========================================
       START MODULE
    ========================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeCustomers
        );

    } else {

        initializeCustomers();
    }


    /* ==========================================
       INITIALIZE
    ========================================== */

    function initializeCustomers() {

        ensureHeadOffice();

        loadCustomers();

        migrateOldCustomers();

        connectEvents();

        refreshCustomers();

        console.log(
            "Jufelix Customers Module loaded."
        );

        console.log(
            "Current branch:",
            getActiveBranch()
        );
    }


    /* ==========================================
       EVENTS
    ========================================== */

    function connectEvents() {

        if (customerForm) {

            customerForm.addEventListener(
                "submit",
                saveCustomer
            );
        }


        if (clearCustomerButton) {

            clearCustomerButton.addEventListener(
                "click",
                resetCustomerForm
            );
        }


        if (customerSearch) {

            customerSearch.addEventListener(
                "input",
                displayCustomers
            );
        }


        if (customerTypeFilter) {

            customerTypeFilter.addEventListener(
                "change",
                displayCustomers
            );
        }


        if (customerStatusFilter) {

            customerStatusFilter.addEventListener(
                "change",
                displayCustomers
            );
        }


        /*
         * Refresh when another module
         * changes customer information.
         */

        document.addEventListener(
            "jufelix:data-updated",
            function (event) {

                if (
                    event.detail &&
                    event.detail.key ===
                    CUSTOMERS_KEY
                ) {

                    loadCustomers();

                    refreshCustomers();
                }
            }
        );


        /*
         * Refresh if another browser tab
         * changes customers or branch.
         */

        window.addEventListener(
            "storage",
            function (event) {

                if (
                    event.key ===
                    CUSTOMERS_KEY ||
                    event.key ===
                    ACTIVE_BRANCH_KEY ||
                    event.key ===
                    BRANCHES_KEY
                ) {

                    loadCustomers();

                    resetCustomerForm();

                    refreshCustomers();
                }
            }
        );
    }


    /* ==========================================
       SAVE CUSTOMER
    ========================================== */

    function saveCustomer(event) {

        event.preventDefault();


        const activeBranch =
            getActiveBranch();


        const customerData = {

            name:
                getValue(
                    "customerName"
                ),

            phone:
                getValue(
                    "customerPhone"
                ),

            email:
                getValue(
                    "customerEmail"
                ),

            type:
                getValue(
                    "customerType"
                ) ||
                "retail",

            openingBalance:
                getNumber(
                    "customerOpeningBalance"
                ),

            creditLimit:
                getNumber(
                    "customerCreditLimit"
                ),

            status:
                getValue(
                    "customerStatus"
                ) ||
                "active",

            taxNumber:
                getValue(
                    "customerTaxNumber"
                ),

            address:
                getValue(
                    "customerAddress"
                ),

            notes:
                getValue(
                    "customerNotes"
                ),

            branchId:
                activeBranch.id,

            branchName:
                activeBranch.name
        };


        /* ======================================
           VALIDATION
        ====================================== */

        if (!customerData.name) {

            alert(
                "Enter the customer name."
            );

            return;
        }


        if (!customerData.phone) {

            alert(
                "Enter the customer phone number."
            );

            return;
        }


        if (
            customerData.openingBalance <
            0
        ) {

            alert(
                "Opening balance cannot be negative."
            );

            return;
        }


        if (
            customerData.creditLimit <
            0
        ) {

            alert(
                "Credit limit cannot be negative."
            );

            return;
        }


        /* ======================================
           DUPLICATE PHONE CHECK
        ====================================== */

        const duplicateCustomer =
            customers.find(
                function (customer) {

                    return (

                        String(
                            customer.id
                        ) !==
                        String(
                            editingCustomerId
                        ) &&

                        normalizePhone(
                            customer.phone
                        ) ===
                        normalizePhone(
                            customerData.phone
                        )
                    );
                }
            );


        if (duplicateCustomer) {

            alert(
                "A customer with this phone number already exists."
            );

            return;
        }


        const wasEditing =
            editingCustomerId !==
            null;


        if (wasEditing) {

            const updated =
                updateCustomer(
                    customerData
                );


            if (!updated) {
                return;
            }

        } else {

            createCustomer(
                customerData
            );
        }


        saveCustomers();

        resetCustomerForm();

        refreshCustomers();


        alert(
            wasEditing
                ? "Customer updated successfully."
                : "Customer saved successfully."
        );
    }


    /* ==========================================
       CREATE CUSTOMER
    ========================================== */

    function createCustomer(
        customerData
    ) {

        const now =
            new Date()
                .toISOString();


        const customer = {

            id:
                createCustomerId(),

            customerNumber:
                createCustomerNumber(),

            ...customerData,

            /*
             * Current outstanding balance
             * begins from opening balance.
             */

            balance:
                toNumber(
                    customerData
                        .openingBalance
                ),

            totalPurchases:
                0,

            totalPaid:
                0,

            totalCreditSales:
                0,

            lastPurchaseDate:
                null,

            createdAt:
                now,

            updatedAt:
                now
        };


        customers.push(
            customer
        );


        return customer;
    }


    /* ==========================================
       UPDATE CUSTOMER
    ========================================== */

    function updateCustomer(
        customerData
    ) {

        const customerIndex =
            customers.findIndex(
                function (customer) {

                    return (
                        String(
                            customer.id
                        ) ===
                        String(
                            editingCustomerId
                        )
                    );
                }
            );


        if (
            customerIndex ===
            -1
        ) {

            alert(
                "Customer not found."
            );

            return false;
        }


        const existingCustomer =
            customers[
                customerIndex
            ];


        /*
         * Important:
         *
         * Editing a customer's name,
         * phone or credit limit must NOT
         * destroy balances created later
         * by Sales/POS.
         *
         * We calculate only the difference
         * between the old and new opening
         * balance.
         */

        const oldOpeningBalance =
            toNumber(
                existingCustomer
                    .openingBalance
            );


        const currentBalance =
            toNumber(
                existingCustomer.balance
            );


        const newOpeningBalance =
            toNumber(
                customerData
                    .openingBalance
            );


        const openingDifference =
            newOpeningBalance -
            oldOpeningBalance;


        customers[
            customerIndex
        ] = {

            ...existingCustomer,

            ...customerData,

            id:
                existingCustomer.id,

            customerNumber:
                existingCustomer
                    .customerNumber ||
                createCustomerNumber(),

            openingBalance:
                newOpeningBalance,

            balance:
                currentBalance +
                openingDifference,

            totalPurchases:
                toNumber(
                    existingCustomer
                        .totalPurchases
                ),

            totalPaid:
                toNumber(
                    existingCustomer
                        .totalPaid
                ),

            totalCreditSales:
                toNumber(
                    existingCustomer
                        .totalCreditSales
                ),

            createdAt:
                existingCustomer
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
       EDIT CUSTOMER
    ========================================== */

    function editCustomer(id) {

        const customer =
            customers.find(
                function (item) {

                    return (
                        String(
                            item.id
                        ) ===
                        String(id)
                    );
                }
            );


        if (!customer) {

            alert(
                "Customer not found."
            );

            return;
        }


        editingCustomerId =
            customer.id;


        setValue(
            "customerId",
            customer.id
        );


        setValue(
            "customerName",
            customer.name
        );


        setValue(
            "customerPhone",
            customer.phone
        );


        setValue(
            "customerEmail",
            customer.email
        );


        setValue(
            "customerType",
            customer.type ||
            "retail"
        );


        /*
         * Show original opening balance,
         * not current outstanding balance.
         */

        setValue(
            "customerOpeningBalance",
            toNumber(
                customer.openingBalance
            )
        );


        setValue(
            "customerCreditLimit",
            toNumber(
                customer.creditLimit
            )
        );


        setValue(
            "customerStatus",
            customer.status ||
            "active"
        );


        setValue(
            "customerTaxNumber",
            customer.taxNumber
        );


        setValue(
            "customerAddress",
            customer.address
        );


        setValue(
            "customerNotes",
            customer.notes
        );


        if (customerFormTitle) {

            customerFormTitle
                .textContent =
                "Edit Customer";
        }


        if (saveCustomerButton) {

            saveCustomerButton
                .textContent =
                "Update Customer";
        }


        if (customerForm) {

            customerForm
                .scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "start"
                });
        }
    }


    /* ==========================================
       DELETE CUSTOMER
    ========================================== */

    function deleteCustomer(id) {

        const customer =
            customers.find(
                function (item) {

                    return (
                        String(
                            item.id
                        ) ===
                        String(id)
                    );
                }
            );


        if (!customer) {

            alert(
                "Customer not found."
            );

            return;
        }


        /*
         * Protect customers with
         * outstanding balances.
         */

        if (
            Math.abs(
                toNumber(
                    customer.balance
                )
            ) >
            0.001
        ) {

            const continueDelete =
                confirm(
                    `"${customer.name}" currently has a balance of ${formatMoney(
                        customer.balance
                    )}.\n\nDelete this customer anyway?`
                );


            if (
                !continueDelete
            ) {

                return;
            }

        } else {

            const confirmed =
                confirm(
                    `Delete "${customer.name}" permanently?`
                );


            if (!confirmed) {

                return;
            }
        }


        customers =
            customers.filter(
                function (item) {

                    return (
                        String(
                            item.id
                        ) !==
                        String(id)
                    );
                }
            );


        saveCustomers();


        if (
            String(
                editingCustomerId
            ) ===
            String(id)
        ) {

            resetCustomerForm();
        }


        refreshCustomers();


        alert(
            "Customer deleted successfully."
        );
    }


    /* ==========================================
       DISPLAY CUSTOMERS
    ========================================== */

    function displayCustomers() {

        if (!customerTableBody) {
            return;
        }


        const searchTerm =
            String(
                customerSearch
                    ? customerSearch.value
                    : ""
            )
                .trim()
                .toLowerCase();


        const typeFilter =
            customerTypeFilter
                ? customerTypeFilter.value
                : "";


        const statusFilter =
            customerStatusFilter
                ? customerStatusFilter.value
                : "";


        const filteredCustomers =
            customers.filter(
                function (customer) {

                    const searchableText = [

                        customer.name,

                        customer.customerNumber,

                        customer.phone,

                        customer.email,

                        customer.address,

                        customer.taxNumber,

                        customer.branchName

                    ]
                        .join(" ")
                        .toLowerCase();


                    const matchesSearch =
                        !searchTerm ||
                        searchableText
                            .includes(
                                searchTerm
                            );


                    const matchesType =
                        !typeFilter ||

                        String(
                            customer.type ||
                            "retail"
                        )
                            .toLowerCase() ===
                        String(
                            typeFilter
                        )
                            .toLowerCase();


                    const matchesStatus =
                        !statusFilter ||

                        String(
                            customer.status ||
                            "active"
                        )
                            .toLowerCase() ===
                        String(
                            statusFilter
                        )
                            .toLowerCase();


                    return (
                        matchesSearch &&
                        matchesType &&
                        matchesStatus
                    );
                }
            );


        filteredCustomers.sort(
            function (
                firstCustomer,
                secondCustomer
            ) {

                return String(
                    firstCustomer.name ||
                    ""
                )
                    .localeCompare(
                        String(
                            secondCustomer
                                .name ||
                            ""
                        )
                    );
            }
        );


        if (
            filteredCustomers
                .length ===
            0
        ) {

            customerTableBody
                .innerHTML = `

                <tr>

                    <td
                        colspan="8"
                        class="table-empty"
                    >
                        No matching customers found.
                    </td>

                </tr>
            `;


            return;
        }


        customerTableBody
            .innerHTML =
            filteredCustomers
                .map(
                    function (
                        customer
                    ) {

                        const status =
                            String(
                                customer.status ||
                                "active"
                            )
                                .toLowerCase();


                        return `

                            <tr>

                                <td>

                                    <strong>
                                        ${escapeHTML(
                                            customer.name
                                        )}
                                    </strong>

                                    <div
                                        style="
                                            margin-top:4px;
                                            font-size:11px;
                                            color:#6b7280;
                                        "
                                    >

                                        ${escapeHTML(
                                            customer.customerNumber ||
                                            ""
                                        )}

                                        ${
                                            customer.branchName
                                                ? " • " +
                                                  escapeHTML(
                                                      customer.branchName
                                                  )
                                                : ""
                                        }

                                    </div>

                                </td>


                                <td>

                                    ${escapeHTML(
                                        customer.phone ||
                                        "—"
                                    )}

                                </td>


                                <td>

                                    ${escapeHTML(
                                        customer.email ||
                                        "—"
                                    )}

                                </td>


                                <td>

                                    ${formatCustomerType(
                                        customer.type
                                    )}

                                </td>


                                <td>

                                    <strong>

                                        ${formatMoney(
                                            customer.balance
                                        )}

                                    </strong>

                                </td>


                                <td>

                                    ${formatMoney(
                                        customer.creditLimit
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

                                    <button
                                        type="button"
                                        class="
                                            action-button
                                            edit-button
                                        "
                                        data-customer-edit="${escapeHTML(
                                            customer.id
                                        )}"
                                    >
                                        Edit
                                    </button>


                                    <button
                                        type="button"
                                        class="
                                            action-button
                                            delete-button
                                        "
                                        data-customer-delete="${escapeHTML(
                                            customer.id
                                        )}"
                                    >
                                        Delete
                                    </button>

                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");


        /*
         * Connect action buttons without
         * inline JavaScript.
         */

        customerTableBody
            .querySelectorAll(
                "[data-customer-edit]"
            )
            .forEach(
                function (button) {

                    button
                        .addEventListener(
                            "click",
                            function () {

                                editCustomer(
                                    button.dataset
                                        .customerEdit
                                );
                            }
                        );
                }
            );


        customerTableBody
            .querySelectorAll(
                "[data-customer-delete]"
            )
            .forEach(
                function (button) {

                    button
                        .addEventListener(
                            "click",
                            function () {

                                deleteCustomer(
                                    button.dataset
                                        .customerDelete
                                );
                            }
                        );
                }
            );
    }


    /* ==========================================
       SUMMARY
    ========================================== */

    function updateCustomerSummary() {

        const totalCustomers =
            customers.length;


        const activeCustomers =
            customers.filter(
                function (customer) {

                    return (
                        String(
                            customer.status ||
                            "active"
                        )
                            .toLowerCase() ===
                        "active"
                    );
                }
            ).length;


        const creditCustomers =
            customers.filter(
                function (customer) {

                    return (
                        String(
                            customer.type ||
                            ""
                        )
                            .toLowerCase() ===
                        "credit"
                    );
                }
            ).length;


        const totalBalance =
            customers.reduce(
                function (
                    total,
                    customer
                ) {

                    return (
                        total +
                        toNumber(
                            customer.balance
                        )
                    );
                },
                0
            );


        setText(
            "totalCustomers",
            formatNumber(
                totalCustomers
            )
        );


        setText(
            "activeCustomers",
            formatNumber(
                activeCustomers
            )
        );


        setText(
            "creditCustomers",
            formatNumber(
                creditCustomers
            )
        );


        setText(
            "totalCustomerBalance",
            formatMoney(
                totalBalance
            )
        );
    }


    /* ==========================================
       RESET FORM
    ========================================== */

    function resetCustomerForm() {

        editingCustomerId =
            null;


        if (customerForm) {

            customerForm.reset();
        }


        setValue(
            "customerId",
            ""
        );


        setValue(
            "customerType",
            "retail"
        );


        setValue(
            "customerOpeningBalance",
            0
        );


        setValue(
            "customerCreditLimit",
            0
        );


        setValue(
            "customerStatus",
            "active"
        );


        if (customerFormTitle) {

            customerFormTitle
                .textContent =
                "Add New Customer";
        }


        if (saveCustomerButton) {

            saveCustomerButton
                .textContent =
                "Save Customer";
        }
    }


    /* ==========================================
       REFRESH
    ========================================== */

    function refreshCustomers() {

        updateCustomerSummary();

        displayCustomers();
    }


    /* ==========================================
       LOAD CUSTOMERS
    ========================================== */

    function loadCustomers() {

        customers =
            readArray(
                CUSTOMERS_KEY
            );
    }


    /* ==========================================
       SAVE CUSTOMERS
    ========================================== */

    function saveCustomers() {

        try {

            localStorage.setItem(
                CUSTOMERS_KEY,
                JSON.stringify(
                    customers
                )
            );


            document.dispatchEvent(
                new CustomEvent(
                    "jufelix:data-updated",
                    {

                        detail: {

                            key:
                                CUSTOMERS_KEY,

                            value:
                                customers
                        }
                    }
                )
            );


            return true;

        } catch (error) {

            console.error(
                "Unable to save customers:",
                error
            );


            alert(
                "Customers could not be saved."
            );


            return false;
        }
    }


    /* ==========================================
       OLD CUSTOMER MIGRATION
    ========================================== */

    function migrateOldCustomers() {

        let changed =
            false;


        const defaultBranch =
            getHeadOffice();


        customers =
            customers.map(
                function (
                    customer,
                    index
                ) {

                    const updated = {
                        ...customer
                    };


                    if (!updated.id) {

                        updated.id =
                            "cus-old-" +
                            Date.now() +
                            "-" +
                            index;

                        changed =
                            true;
                    }


                    if (
                        !updated
                            .customerNumber
                    ) {

                        updated
                            .customerNumber =
                            createCustomerNumber(
                                index
                            );

                        changed =
                            true;
                    }


                    if (
                        !updated.branchId
                    ) {

                        updated.branchId =
                            defaultBranch.id;

                        updated.branchName =
                            defaultBranch.name;

                        changed =
                            true;
                    }


                    if (
                        updated.openingBalance ===
                        undefined
                    ) {

                        updated
                            .openingBalance =
                            toNumber(
                                updated.balance
                            );

                        changed =
                            true;
                    }


                    if (
                        updated.balance ===
                        undefined
                    ) {

                        updated.balance =
                            toNumber(
                                updated
                                    .openingBalance
                            );

                        changed =
                            true;
                    }


                    if (
                        updated.creditLimit ===
                        undefined
                    ) {

                        updated.creditLimit =
                            0;

                        changed =
                            true;
                    }


                    if (!updated.type) {

                        updated.type =
                            "retail";

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
                        updated.totalCreditSales ===
                        undefined
                    ) {

                        updated.totalCreditSales =
                            0;

                        changed =
                            true;
                    }


                    return updated;
                }
            );


        if (changed) {

            saveCustomers();
        }
    }


    /* ==========================================
       BRANCH SUPPORT
    ========================================== */

    function ensureHeadOffice() {

        let branches =
            readArray(
                BRANCHES_KEY
            );


        const existingHeadOffice =
            branches.find(
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


        if (!existingHeadOffice) {

            branches.unshift({

                id:
                    "head-office",

                name:
                    "Head Office",

                branchName:
                    "Head Office",

                code:
                    "HO",

                type:
                    "head-office",

                status:
                    "active",

                isHeadOffice:
                    true
            });


            try {

                localStorage.setItem(
                    BRANCHES_KEY,
                    JSON.stringify(
                        branches
                    )
                );

            } catch (error) {

                console.error(
                    "Unable to create Head Office:",
                    error
                );
            }
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

        let activeBranch =
            null;


        try {

            const saved =
                localStorage.getItem(
                    ACTIVE_BRANCH_KEY
                );


            if (saved) {

                /*
                 * Active branch may be saved
                 * either as an object or ID.
                 */

                try {

                    const parsed =
                        JSON.parse(
                            saved
                        );


                    if (
                        parsed &&
                        typeof parsed ===
                        "object"
                    ) {

                        activeBranch =
                            parsed;
                    }

                } catch (error) {

                    const branches =
                        readArray(
                            BRANCHES_KEY
                        );


                    activeBranch =
                        branches.find(
                            function (branch) {

                                return (
                                    String(
                                        branch.id
                                    ) ===
                                    String(
                                        saved
                                    )
                                );
                            }
                        );
                }
            }

        } catch (error) {

            console.warn(
                "Unable to read active branch:",
                error
            );
        }


        /*
         * Some versions of the ERP may
         * expose the active branch globally.
         */

        if (
            !activeBranch &&
            window.JufelixBranch &&
            typeof window
                .JufelixBranch
                .getActive ===
            "function"
        ) {

            try {

                activeBranch =
                    window
                        .JufelixBranch
                        .getActive();

            } catch (error) {

                activeBranch =
                    null;
            }
        }


        if (!activeBranch) {

            activeBranch =
                getHeadOffice();
        }


        return normalizeBranch(
            activeBranch
        );
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
       CUSTOMER API FOR SALES / POS
    ========================================== */

    function getAllCustomers() {

        return customers.map(
            function (customer) {

                return {
                    ...customer
                };
            }
        );
    }


    function getActiveCustomers() {

        return customers
            .filter(
                function (customer) {

                    return (
                        String(
                            customer.status ||
                            "active"
                        )
                            .toLowerCase() ===
                        "active"
                    );
                }
            )
            .map(
                function (customer) {

                    return {
                        ...customer
                    };
                }
            );
    }


    function getCustomerById(id) {

        const customer =
            customers.find(
                function (item) {

                    return (
                        String(
                            item.id
                        ) ===
                        String(id)
                    );
                }
            );


        return customer
            ? {
                ...customer
            }
            : null;
    }


    function getCustomersForBranch(
        branchId
    ) {

        return customers
            .filter(
                function (customer) {

                    return (
                        !customer.branchId ||

                        String(
                            customer.branchId
                        ) ===
                        String(
                            branchId
                        )
                    );
                }
            )
            .map(
                function (customer) {

                    return {
                        ...customer
                    };
                }
            );
    }


    /* ==========================================
       UPDATE CUSTOMER BALANCE
       FOR FUTURE CREDIT SALES
    ========================================== */

    function adjustCustomerBalance(
        customerId,
        amount,
        options
    ) {

        const customerIndex =
            customers.findIndex(
                function (customer) {

                    return (
                        String(
                            customer.id
                        ) ===
                        String(
                            customerId
                        )
                    );
                }
            );


        if (
            customerIndex ===
            -1
        ) {

            return false;
        }


        const adjustment =
            toNumber(
                amount
            );


        customers[
            customerIndex
        ].balance =
            toNumber(
                customers[
                    customerIndex
                ].balance
            ) +
            adjustment;


        if (
            options &&
            options.creditSale
        ) {

            customers[
                customerIndex
            ].totalCreditSales =
                toNumber(
                    customers[
                        customerIndex
                    ].totalCreditSales
                ) +
                Math.max(
                    adjustment,
                    0
                );
        }


        if (
            options &&
            options.purchaseAmount
        ) {

            customers[
                customerIndex
            ].totalPurchases =
                toNumber(
                    customers[
                        customerIndex
                    ].totalPurchases
                ) +
                toNumber(
                    options
                        .purchaseAmount
                );
        }


        if (
            options &&
            options.paymentAmount
        ) {

            customers[
                customerIndex
            ].totalPaid =
                toNumber(
                    customers[
                        customerIndex
                    ].totalPaid
                ) +
                toNumber(
                    options
                        .paymentAmount
                );
        }


        customers[
            customerIndex
        ].updatedAt =
            new Date()
                .toISOString();


        saveCustomers();

        refreshCustomers();


        return true;
    }


    /* ==========================================
       STORAGE HELPERS
    ========================================== */

    function readArray(key) {

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

            console.warn(
                "Unable to read:",
                key,
                error
            );


            return [];
        }
    }


    /* ==========================================
       ID GENERATORS
    ========================================== */

    function createCustomerId() {

        return (
            "cus-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 7)
        );
    }


    function createCustomerNumber(
        extra
    ) {

        const date =
            new Date();


        const year =
            date
                .getFullYear()
                .toString()
                .slice(-2);


        const month =
            String(
                date.getMonth() +
                1
            )
                .padStart(
                    2,
                    "0"
                );


        const day =
            String(
                date.getDate()
            )
                .padStart(
                    2,
                    "0"
                );


        const random =
            String(
                Date.now()
            )
                .slice(-5);


        return (
            "CUS-" +
            year +
            month +
            day +
            "-" +
            random +
            (
                extra !==
                undefined
                    ? extra
                    : ""
            )
        );
    }


    /* ==========================================
       FORM HELPERS
    ========================================== */

    function getValue(id) {

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


    function getNumber(id) {

        return toNumber(
            getValue(id)
        );
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


    /* ==========================================
       FORMATTERS
    ========================================== */

    function formatMoney(
        value
    ) {

        try {

            return new Intl
                .NumberFormat(
                    "en-GH",
                    {

                        style:
                            "currency",

                        currency:
                            "GHS",

                        minimumFractionDigits:
                            2
                    }
                )
                .format(
                    toNumber(
                        value
                    )
                );

        } catch (error) {

            return (
                "GH₵" +
                toNumber(
                    value
                )
                    .toFixed(2)
            );
        }
    }


    function formatNumber(
        value
    ) {

        return new Intl
            .NumberFormat(
                "en-GH"
            )
            .format(
                toNumber(
                    value
                )
            );
    }


    function formatCustomerType(
        type
    ) {

        const types = {

            retail:
                "Retail",

            wholesale:
                "Wholesale",

            credit:
                "Credit"
        };


        return (
            types[
                String(
                    type ||
                    "retail"
                )
                    .toLowerCase()
            ] ||
            "Retail"
        );
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


    function toNumber(
        value
    ) {

        const number =
            Number(value);


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

    window.JufelixCustomers = {

        editCustomer:
            editCustomer,

        deleteCustomer:
            deleteCustomer,

        refresh:
            function () {

                loadCustomers();

                refreshCustomers();
            },

        resetForm:
            resetCustomerForm,

        getAll:
            getAllCustomers,

        getActive:
            getActiveCustomers,

        getById:
            getCustomerById,

        getForBranch:
            getCustomersForBranch,

        adjustBalance:
            adjustCustomerBalance,

        getCurrentBranch:
            getActiveBranch
    };


})();