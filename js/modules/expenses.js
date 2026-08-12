/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   EXPENSES MODULE

   File:
   js/modules/expenses.js
========================================== */

(function () {
    "use strict";


    /* ==========================================
       STORAGE KEYS
    ========================================== */

    const EXPENSES_KEY =
        "jufelix_v7_expenses";

    const BRANCHES_KEY =
        "jufelix_v7_branches";

    const ACTIVE_BRANCH_KEY =
        "jufelix_v7_active_branch";

    const CURRENT_USER_KEY =
        "jufelix_v7_current_user";

    const DEFAULT_BRANCH_ID =
        "head-office";


    /* ==========================================
       STATE
    ========================================== */

    let expenses = [];
    let branches = [];
    let editingExpenseId = null;


    const el = {};


    /* ==========================================
       INITIALIZE
    ========================================== */

    document.addEventListener(
        "DOMContentLoaded",
        initializeExpenses
    );


    function initializeExpenses() {

        cacheElements();

        if (!el.form) {

            console.error(
                "Expenses error: expenseForm was not found."
            );

            return;
        }


        loadExpenses();

        loadBranches();

        ensureHeadOffice();

        populateBranchDropdown();

        connectEvents();

        prepareNewExpense();

        refreshExpenses();


        console.log(
            "Jufelix Expenses module loaded successfully."
        );
    }


    /* ==========================================
       CACHE ELEMENTS
    ========================================== */

    function cacheElements() {

        el.form =
            document.getElementById(
                "expenseForm"
            );


        el.id =
            document.getElementById(
                "expenseId"
            );


        el.number =
            document.getElementById(
                "expenseNumber"
            );


        el.date =
            document.getElementById(
                "expenseDate"
            );


        el.branch =
            document.getElementById(
                "expenseBranch"
            );


        el.category =
            document.getElementById(
                "expenseCategory"
            );


        el.description =
            document.getElementById(
                "expenseDescription"
            );


        el.amount =
            document.getElementById(
                "expenseAmount"
            );


        el.paymentMethod =
            document.getElementById(
                "expensePaymentMethod"
            );


        el.status =
            document.getElementById(
                "expenseStatus"
            );


        el.vendor =
            document.getElementById(
                "expenseVendor"
            );


        el.reference =
            document.getElementById(
                "expenseReference"
            );


        el.notes =
            document.getElementById(
                "expenseNotes"
            );


        el.saveButton =
            document.getElementById(
                "saveExpenseButton"
            );


        el.clearButton =
            document.getElementById(
                "clearExpenseButton"
            );


        el.formTitle =
            document.getElementById(
                "expenseFormTitle"
            );


        el.search =
            document.getElementById(
                "expenseSearch"
            );


        el.categoryFilter =
            document.getElementById(
                "expenseCategoryFilter"
            );


        el.statusFilter =
            document.getElementById(
                "expenseStatusFilter"
            );


        el.dateFilter =
            document.getElementById(
                "expenseDateFilter"
            );


        el.tableBody =
            document.getElementById(
                "expenseTableBody"
            );
    }


    /* ==========================================
       EVENTS
    ========================================== */

    function connectEvents() {

        el.form.addEventListener(
            "submit",
            saveExpense
        );


        if (el.clearButton) {

            el.clearButton.addEventListener(
                "click",
                function () {

                    prepareNewExpense(
                        true
                    );
                }
            );
        }


        if (el.search) {

            el.search.addEventListener(
                "input",
                displayExpenses
            );
        }


        if (el.categoryFilter) {

            el.categoryFilter.addEventListener(
                "change",
                displayExpenses
            );
        }


        if (el.statusFilter) {

            el.statusFilter.addEventListener(
                "change",
                displayExpenses
            );
        }


        if (el.dateFilter) {

            el.dateFilter.addEventListener(
                "change",
                displayExpenses
            );
        }


        window.addEventListener(
            "storage",
            function (event) {

                if (
                    [
                        EXPENSES_KEY,
                        BRANCHES_KEY,
                        ACTIVE_BRANCH_KEY
                    ].includes(
                        event.key
                    )
                ) {

                    loadExpenses();

                    loadBranches();

                    ensureHeadOffice();

                    populateBranchDropdown();

                    refreshExpenses();
                }
            }
        );


        document.addEventListener(
            "jufelix:data-updated",
            function (event) {

                if (
                    event.detail &&
                    event.detail.key ===
                    EXPENSES_KEY
                ) {

                    loadExpenses();

                    refreshExpenses();
                }
            }
        );
    }


    /* ==========================================
       SAVE EXPENSE
    ========================================== */

    function saveExpense(
        event
    ) {

        event.preventDefault();


        loadExpenses();

        loadBranches();

        ensureHeadOffice();


        const branchId =
            String(
                el.branch
                    ? el.branch.value
                    : ""
            ).trim();


        const branch =
            getBranchById(
                branchId
            );


        const expenseData = {

            expenseNumber:
                String(
                    el.number
                        ? el.number.value
                        : ""
                ).trim() ||
                generateExpenseNumber(),

            date:
                String(
                    el.date
                        ? el.date.value
                        : ""
                ).trim(),

            branchId:
                branchId,

            branchName:
                branch
                    ? getBranchName(
                        branch
                    )
                    : "Head Office",

            category:
                String(
                    el.category
                        ? el.category.value
                        : ""
                ).trim(),

            description:
                String(
                    el.description
                        ? el.description.value
                        : ""
                ).trim(),

            amount:
                toNumber(
                    el.amount
                        ? el.amount.value
                        : 0
                ),

            paymentMethod:
                String(
                    el.paymentMethod
                        ? el.paymentMethod.value
                        : "cash"
                ).trim() ||
                "cash",

            status:
                String(
                    el.status
                        ? el.status.value
                        : "paid"
                )
                    .trim()
                    .toLowerCase() ||
                "paid",

            vendor:
                String(
                    el.vendor
                        ? el.vendor.value
                        : ""
                ).trim(),

            reference:
                String(
                    el.reference
                        ? el.reference.value
                        : ""
                ).trim(),

            notes:
                String(
                    el.notes
                        ? el.notes.value
                        : ""
                ).trim()
        };


        if (!expenseData.date) {

            alert(
                "Select the expense date."
            );

            return;
        }


        if (!expenseData.branchId) {

            alert(
                "Select a branch."
            );

            return;
        }


        if (!expenseData.category) {

            alert(
                "Select an expense category."
            );

            return;
        }


        if (!expenseData.description) {

            alert(
                "Enter the expense description."
            );

            return;
        }


        if (
            !Number.isFinite(
                expenseData.amount
            ) ||
            expenseData.amount <= 0
        ) {

            alert(
                "Enter a valid expense amount."
            );

            return;
        }


        const wasEditing =
            editingExpenseId !==
            null;


        if (wasEditing) {

            const updated =
                updateExpense(
                    expenseData
                );


            if (!updated) {
                return;
            }

        } else {

            createExpense(
                expenseData
            );
        }


        if (
            !saveExpenses()
        ) {

            return;
        }


        loadExpenses();

        refreshExpenses();

        prepareNewExpense(
            true
        );


        alert(
            wasEditing
                ? "Expense updated successfully."
                : "Expense saved successfully."
        );
    }


    /* ==========================================
       CREATE
    ========================================== */

    function createExpense(
        expenseData
    ) {

        const now =
            new Date()
                .toISOString();


        expenses.push({

            id:
                createExpenseId(),

            ...expenseData,

            recordedBy:
                getCurrentUserName(),

            createdAt:
                now,

            updatedAt:
                now
        });
    }


    /* ==========================================
       UPDATE
    ========================================== */

    function updateExpense(
        expenseData
    ) {

        const index =
            expenses.findIndex(
                function (expense) {

                    return (
                        String(
                            expense.id
                        ) ===
                        String(
                            editingExpenseId
                        )
                    );
                }
            );


        if (
            index ===
            -1
        ) {

            alert(
                "Expense not found."
            );

            return false;
        }


        const existing =
            expenses[
                index
            ];


        expenses[
            index
        ] = {

            ...existing,

            ...expenseData,

            id:
                existing.id,

            recordedBy:
                existing.recordedBy ||
                getCurrentUserName(),

            createdAt:
                existing.createdAt ||
                new Date()
                    .toISOString(),

            updatedBy:
                getCurrentUserName(),

            updatedAt:
                new Date()
                    .toISOString()
        };


        return true;
    }


    /* ==========================================
       EDIT
    ========================================== */

    function editExpense(
        expenseId
    ) {

        loadExpenses();


        const expense =
            expenses.find(
                function (item) {

                    return (
                        String(
                            item.id
                        ) ===
                        String(
                            expenseId
                        )
                    );
                }
            );


        if (!expense) {

            alert(
                "Expense not found."
            );

            return;
        }


        editingExpenseId =
            expense.id;


        setValue(
            el.id,
            expense.id
        );


        setValue(
            el.number,
            expense.expenseNumber
        );


        setValue(
            el.date,
            expense.date
        );


        setValue(
            el.branch,
            expense.branchId ||
            DEFAULT_BRANCH_ID
        );


        setValue(
            el.category,
            expense.category
        );


        setValue(
            el.description,
            expense.description
        );


        setValue(
            el.amount,
            expense.amount
        );


        setValue(
            el.paymentMethod,
            expense.paymentMethod ||
            "cash"
        );


        setValue(
            el.status,
            expense.status ||
            "paid"
        );


        setValue(
            el.vendor,
            expense.vendor
        );


        setValue(
            el.reference,
            expense.reference
        );


        setValue(
            el.notes,
            expense.notes
        );


        if (el.formTitle) {

            el.formTitle.textContent =
                "Edit Expense";
        }


        if (el.saveButton) {

            el.saveButton.textContent =
                "Update Expense";
        }


        if (el.form) {

            el.form.scrollIntoView({

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

    function deleteExpense(
        expenseId
    ) {

        loadExpenses();


        const expense =
            expenses.find(
                function (item) {

                    return (
                        String(
                            item.id
                        ) ===
                        String(
                            expenseId
                        )
                    );
                }
            );


        if (!expense) {

            alert(
                "Expense not found."
            );

            return;
        }


        const confirmed =
            window.confirm(
                `Delete "${expense.description}" permanently?`
            );


        if (!confirmed) {
            return;
        }


        expenses =
            expenses.filter(
                function (item) {

                    return (
                        String(
                            item.id
                        ) !==
                        String(
                            expenseId
                        )
                    );
                }
            );


        if (
            !saveExpenses()
        ) {

            return;
        }


        if (
            String(
                editingExpenseId
            ) ===
            String(
                expenseId
            )
        ) {

            prepareNewExpense(
                true
            );
        }


        loadExpenses();

        refreshExpenses();


        alert(
            "Expense deleted successfully."
        );
    }


    /* ==========================================
       DISPLAY EXPENSES
    ========================================== */

    function displayExpenses() {

        if (!el.tableBody) {

            console.error(
                "Expense table body was not found."
            );

            return;
        }


        /*
         * Always read newest data.
         */

        expenses =
            readArray(
                EXPENSES_KEY
            );


        const search =
            String(
                el.search
                    ? el.search.value
                    : ""
            )
                .trim()
                .toLowerCase();


        const categoryFilter =
            String(
                el.categoryFilter
                    ? el.categoryFilter.value
                    : ""
            )
                .trim()
                .toLowerCase();


        const statusFilter =
            String(
                el.statusFilter
                    ? el.statusFilter.value
                    : ""
            )
                .trim()
                .toLowerCase();


        const dateFilter =
            String(
                el.dateFilter
                    ? el.dateFilter.value
                    : ""
            ).trim();


        const filtered =
            expenses
                .filter(
                    function (expense) {

                        const searchableText =
                            [
                                expense.expenseNumber,
                                expense.description,
                                expense.vendor,
                                expense.reference,
                                expense.branchName,
                                expense.recordedBy,
                                expense.category
                            ]
                                .join(" ")
                                .toLowerCase();


                        const matchesSearch =
                            !search ||
                            searchableText.includes(
                                search
                            );


                        const matchesCategory =
                            !categoryFilter ||
                            String(
                                expense.category ||
                                ""
                            )
                                .toLowerCase() ===
                            categoryFilter;


                        const matchesStatus =
                            !statusFilter ||
                            String(
                                expense.status ||
                                "paid"
                            )
                                .toLowerCase() ===
                            statusFilter;


                        const matchesDate =
                            !dateFilter ||
                            normalizeDate(
                                expense.date
                            ) ===
                            dateFilter;


                        return (
                            matchesSearch &&
                            matchesCategory &&
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
                            getExpenseTimestamp(
                                second
                            ) -
                            getExpenseTimestamp(
                                first
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
                        colspan="10"
                        class="table-empty"
                    >
                        No expenses have been recorded.
                    </td>
                </tr>
            `;


            return;
        }


        el.tableBody.innerHTML =
            filtered
                .map(
                    function (expense) {

                        const status =
                            String(
                                expense.status ||
                                "paid"
                            )
                                .toLowerCase();


                        return `
                            <tr>

                                <td>
                                    <strong>
                                        ${escapeHTML(
                                            expense.expenseNumber ||
                                            "—"
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHTML(
                                        formatDate(
                                            expense.date
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        expense.branchName ||
                                        "Head Office"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        formatCategory(
                                            expense.category
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        expense.description ||
                                        "—"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        expense.vendor ||
                                        "—"
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${formatMoney(
                                            expense.amount
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    <span
                                        class="status-badge ${
                                            status ===
                                            "paid"
                                                ? "status-paid"
                                                : "status-pending"
                                        }"
                                    >
                                        ${
                                            status ===
                                            "paid"
                                                ? "Paid"
                                                : "Pending"
                                        }
                                    </span>
                                </td>

                                <td>
                                    ${escapeHTML(
                                        expense.recordedBy ||
                                        "System"
                                    )}
                                </td>

                                <td>

                                    <button
                                        type="button"
                                        class="action-button edit-button"
                                        data-edit-expense="${escapeHTML(
                                            expense.id
                                        )}"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        class="action-button delete-button"
                                        data-delete-expense="${escapeHTML(
                                            expense.id
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


        connectTableActions();
    }


    /* ==========================================
       TABLE ACTIONS
    ========================================== */

    function connectTableActions() {

        if (!el.tableBody) {
            return;
        }


        el.tableBody
            .querySelectorAll(
                "[data-edit-expense]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            editExpense(
                                button.dataset
                                    .editExpense
                            );
                        }
                    );
                }
            );


        el.tableBody
            .querySelectorAll(
                "[data-delete-expense]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            deleteExpense(
                                button.dataset
                                    .deleteExpense
                            );
                        }
                    );
                }
            );
    }


    /* ==========================================
       SUMMARY
    ========================================== */

    function updateExpenseSummary() {

        expenses =
            readArray(
                EXPENSES_KEY
            );


        const activeBranchId =
            getActiveBranchId();


        const branchExpenses =
            expenses.filter(
                function (expense) {

                    return (
                        String(
                            expense.branchId ||
                            DEFAULT_BRANCH_ID
                        ) ===
                        String(
                            activeBranchId
                        )
                    );
                }
            );


        const today =
            dateKey(
                new Date()
            );


        const month =
            today.slice(
                0,
                7
            );


        const totalCount =
            branchExpenses.length;


        const todayTotal =
            branchExpenses
                .filter(
                    function (expense) {

                        return (
                            normalizeDate(
                                expense.date
                            ) ===
                            today
                        );
                    }
                )
                .reduce(
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


        const monthTotal =
            branchExpenses
                .filter(
                    function (expense) {

                        return normalizeDate(
                            expense.date
                        )
                            .startsWith(
                                month
                            );
                    }
                )
                .reduce(
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


        const pendingTotal =
            branchExpenses
                .filter(
                    function (expense) {

                        return (
                            String(
                                expense.status ||
                                "paid"
                            )
                                .toLowerCase() ===
                            "pending"
                        );
                    }
                )
                .reduce(
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


        setText(
            "totalExpenseCount",
            formatNumber(
                totalCount
            )
        );


        setText(
            "todayExpenseTotal",
            formatMoney(
                todayTotal
            )
        );


        setText(
            "monthExpenseTotal",
            formatMoney(
                monthTotal
            )
        );


        setText(
            "pendingExpenseTotal",
            formatMoney(
                pendingTotal
            )
        );
    }


    /* ==========================================
       REFRESH
    ========================================== */

    function refreshExpenses() {

        loadExpenses();

        updateExpenseSummary();

        displayExpenses();
    }


    /* ==========================================
       BRANCHES
    ========================================== */

    function loadBranches() {

        branches =
            readArray(
                BRANCHES_KEY
            );
    }


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


    function populateBranchDropdown() {

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


        const preferred =
            previousValue ||
            getActiveBranchId();


        const exists =
            activeBranches.some(
                function (branch) {

                    return (
                        String(
                            branch.id
                        ) ===
                        String(
                            preferred
                        )
                    );
                }
            );


        if (exists) {

            el.branch.value =
                preferred;
        }
    }


    function getBranchById(
        branchId
    ) {

        return (
            branches.find(
                function (branch) {

                    return (
                        String(
                            branch.id
                        ) ===
                        String(
                            branchId
                        )
                    );
                }
            ) ||
            null
        );
    }


    function getBranchName(
        branch
    ) {

        return (
            branch.branchName ||
            branch.name ||
            "Head Office"
        );
    }


    /* ==========================================
       PREPARE NEW EXPENSE
    ========================================== */

    function prepareNewExpense(
        clearForm
    ) {

        editingExpenseId =
            null;


        if (
            clearForm ===
                true &&
            el.form
        ) {

            el.form.reset();
        }


        if (el.id) {

            el.id.value =
                "";
        }


        if (el.number) {

            el.number.value =
                generateExpenseNumber();
        }


        if (el.date) {

            el.date.value =
                dateKey(
                    new Date()
                );
        }


        if (el.branch) {

            el.branch.value =
                getActiveBranchId();
        }


        if (el.paymentMethod) {

            el.paymentMethod.value =
                "cash";
        }


        if (el.status) {

            el.status.value =
                "paid";
        }


        if (el.formTitle) {

            el.formTitle.textContent =
                "Add New Expense";
        }


        if (el.saveButton) {

            el.saveButton.textContent =
                "Save Expense";
        }
    }


    /* ==========================================
       LOAD / SAVE
    ========================================== */

    function loadExpenses() {

        expenses =
            readArray(
                EXPENSES_KEY
            );
    }


    function saveExpenses() {

        try {

            localStorage.setItem(
                EXPENSES_KEY,
                JSON.stringify(
                    expenses
                )
            );


            document.dispatchEvent(
                new CustomEvent(
                    "jufelix:data-updated",
                    {
                        detail: {

                            key:
                                EXPENSES_KEY,

                            value:
                                expenses
                        }
                    }
                )
            );


            return true;

        } catch (error) {

            console.error(
                "Unable to save expenses:",
                error
            );


            alert(
                "The expense could not be saved."
            );


            return false;
        }
    }


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

        try {

            localStorage.setItem(
                key,
                JSON.stringify(
                    value
                )
            );


            return true;

        } catch (error) {

            return false;
        }
    }


    /* ==========================================
       SESSION
    ========================================== */

    function getActiveBranchId() {

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


        if (
            currentUser &&
            currentUser.branchId
        ) {

            return String(
                currentUser.branchId
            );
        }


        return DEFAULT_BRANCH_ID;
    }


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

            administrator:
                "admin",

            "system-administrator":
                "admin",

            admin:
                "admin",

            manager:
                "manager",

            "branch-manager":
                "manager",

            sales:
                "sales-officer",

            "sales-personnel":
                "sales-officer",

            "sales-officer":
                "sales-officer",

            cashier:
                "cashier",

            accountant:
                "accountant"
        };


        return (
            aliases[
                value
            ] ||
            value
        );
    }


    /* ==========================================
       GENERATORS
    ========================================== */

    function createExpenseId() {

        return (
            "exp-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(
                    2,
                    7
                )
        );
    }


    function generateExpenseNumber() {

        const now =
            new Date();


        const datePart =
            now.getFullYear() +
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
            );


        const timePart =
            String(
                now.getHours()
            ).padStart(
                2,
                "0"
            ) +
            String(
                now.getMinutes()
            ).padStart(
                2,
                "0"
            ) +
            String(
                now.getSeconds()
            ).padStart(
                2,
                "0"
            );


        const random =
            Math.floor(
                10 +
                Math.random() *
                90
            );


        return (
            "EXP-" +
            datePart +
            "-" +
            timePart +
            random
        );
    }


    /* ==========================================
       DATES
    ========================================== */

    function dateKey(
        date
    ) {

        const validDate =
            date instanceof Date &&
            !Number.isNaN(
                date.getTime()
            )
                ? date
                : new Date();


        return (
            validDate.getFullYear() +
            "-" +
            String(
                validDate.getMonth() +
                1
            ).padStart(
                2,
                "0"
            ) +
            "-" +
            String(
                validDate.getDate()
            ).padStart(
                2,
                "0"
            )
        );
    }


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


    function getExpenseTimestamp(
        expense
    ) {

        const value =
            expense.createdAt ||
            expense.updatedAt ||
            expense.date ||
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

    function formatCategory(
        category
    ) {

        const categories = {

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
                "Repairs and Maintenance",

            marketing:
                "Marketing",

            office:
                "Office Supplies",

            tax:
                "Taxes and Levies",

            miscellaneous:
                "Miscellaneous"
        };


        return (
            categories[
                String(
                    category ||
                    ""
                ).toLowerCase()
            ] ||
            category ||
            "—"
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

    window.JufelixExpenses = {

        editExpense:
            editExpense,

        deleteExpense:
            deleteExpense,

        refresh:
            function () {

                loadExpenses();

                loadBranches();

                ensureHeadOffice();

                populateBranchDropdown();

                refreshExpenses();
            },

        resetForm:
            function () {

                prepareNewExpense(
                    true
                );
            }
    };

})();