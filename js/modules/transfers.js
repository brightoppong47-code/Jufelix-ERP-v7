/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   STOCK TRANSFERS MODULE

   + Branch-Aware Stock
   + Local Storage
   + Firebase Transfer Sync
   + Firebase Product Stock Sync
   + Cloud Bridge Wait/Retry
   + Prevent Double Stock Movement

   File:
   js/modules/transfers.js
========================================== */

(function () {
    "use strict";


    /* ==========================================
       STORAGE KEYS
    ========================================== */

    const PRODUCTS_KEY =
        "jufelix_products";

    const BRANCHES_KEY =
        "jufelix_v7_branches";

    const TRANSFERS_KEY =
        "jufelix_v7_transfers";

    const CURRENT_USER_KEY =
        "jufelix_v7_current_user";

    const DEFAULT_BRANCH_ID =
        "head-office";


    /* ==========================================
       STATE
    ========================================== */

    let products = [];
    let branches = [];
    let transfers = [];

    let saveInProgress = false;

    const elements = {};


    /* ==========================================
       START
    ========================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeTransfers
        );

    } else {

        initializeTransfers();
    }


    /* ==========================================
       INITIALIZE
    ========================================== */

    function initializeTransfers() {

        cacheElements();


        if (!elements.transferForm) {

            console.error(
                "Transfers: #transferForm was not found."
            );

            return;
        }


        /*
         * We perform our own validation.
         */
        elements.transferForm.noValidate =
            true;


        loadData();

        ensureHeadOffice();

        migrateProductsToBranchStock();

        populateBranchDropdowns();

        connectEvents();

        resetTransferForm();

        refreshTransfers();


        console.log(
            "✅ Jufelix Transfers module loaded."
        );
    }


    /* ==========================================
       CACHE ELEMENTS
    ========================================== */

    function cacheElements() {

        elements.transferForm =
            document.getElementById(
                "transferForm"
            );

        elements.transferNumber =
            document.getElementById(
                "transferNumber"
            );

        elements.transferDate =
            document.getElementById(
                "transferDate"
            );

        elements.fromBranch =
            document.getElementById(
                "fromBranch"
            );

        elements.toBranch =
            document.getElementById(
                "toBranch"
            );

        elements.transferProduct =
            document.getElementById(
                "transferProduct"
            );

        elements.availableTransferStock =
            document.getElementById(
                "availableTransferStock"
            );

        elements.transferQuantity =
            document.getElementById(
                "transferQuantity"
            );

        elements.transferStatus =
            document.getElementById(
                "transferStatus"
            );

        elements.transferNotes =
            document.getElementById(
                "transferNotes"
            );

        elements.transferSearch =
            document.getElementById(
                "transferSearch"
            );

        elements.transferStatusFilter =
            document.getElementById(
                "transferStatusFilter"
            );

        elements.transferDateFilter =
            document.getElementById(
                "transferDateFilter"
            );

        elements.transferTableBody =
            document.getElementById(
                "transferTableBody"
            );

        elements.totalTransfers =
            document.getElementById(
                "totalTransfers"
            );

        elements.completedTransfers =
            document.getElementById(
                "completedTransfers"
            );

        elements.pendingTransfers =
            document.getElementById(
                "pendingTransfers"
            );

        elements.totalUnitsMoved =
            document.getElementById(
                "totalUnitsMoved"
            );

        elements.resetButton =
            document.getElementById(
                "resetTransferBtn"
            ) ||
            document.getElementById(
                "resetTransferButton"
            );

        elements.saveButton =
            document.querySelector(
                '#transferForm button[type="submit"]'
            );
    }


    /* ==========================================
       EVENTS
    ========================================== */

    function connectEvents() {

        /*
         * Only one save handler.
         * This avoids double-saving on mobile.
         */
        elements.transferForm
            .addEventListener(
                "submit",
                handleTransferSubmit
            );


        elements.transferForm
            .addEventListener(
                "reset",
                function () {

                    window.setTimeout(
                        applyTransferDefaults,
                        0
                    );
                }
            );


        if (elements.resetButton) {

            elements.resetButton
                .addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        resetTransferForm();
                    }
                );
        }


        if (elements.fromBranch) {

            elements.fromBranch
                .addEventListener(
                    "change",
                    function () {

                        populateProductDropdown();

                        updateAvailableStock();

                        validateDifferentBranches(
                            false
                        );
                    }
                );
        }


        if (elements.toBranch) {

            elements.toBranch
                .addEventListener(
                    "change",
                    function () {

                        validateDifferentBranches(
                            true
                        );
                    }
                );
        }


        if (elements.transferProduct) {

            elements.transferProduct
                .addEventListener(
                    "change",
                    updateAvailableStock
                );
        }


        if (elements.transferSearch) {

            elements.transferSearch
                .addEventListener(
                    "input",
                    displayTransfers
                );
        }


        if (elements.transferStatusFilter) {

            elements.transferStatusFilter
                .addEventListener(
                    "change",
                    displayTransfers
                );
        }


        if (elements.transferDateFilter) {

            elements.transferDateFilter
                .addEventListener(
                    "change",
                    displayTransfers
                );
        }


        window.addEventListener(
            "storage",
            function (event) {

                if (
                    [
                        PRODUCTS_KEY,
                        BRANCHES_KEY,
                        TRANSFERS_KEY
                    ].includes(
                        event.key
                    )
                ) {

                    refreshTransfers();
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
                    key === PRODUCTS_KEY ||
                    key === BRANCHES_KEY ||
                    key === TRANSFERS_KEY
                ) {

                    refreshTransfers();
                }
            }
        );
    }


    /* ==========================================
       LOAD
    ========================================== */

    function loadData() {

        products =
            readStoredArray(
                PRODUCTS_KEY
            );

        branches =
            readStoredArray(
                BRANCHES_KEY
            );

        transfers =
            readStoredArray(
                TRANSFERS_KEY
            );
    }


    /* ==========================================
       HEAD OFFICE
    ========================================== */

    function ensureHeadOffice() {

        let found =
            false;


        branches =
            branches
                .map(
                    function (branch) {

                        const isHeadOffice =
                            branch.isHeadOffice === true ||

                            String(
                                branch.type || ""
                            ).toLowerCase() ===
                                "head-office" ||

                            String(
                                branch.id || ""
                            ).toLowerCase() ===
                                DEFAULT_BRANCH_ID;


                        if (!isHeadOffice) {

                            return branch;
                        }


                        if (found) {

                            return null;
                        }


                        found =
                            true;


                        return {

                            ...branch,

                            id:
                                DEFAULT_BRANCH_ID,

                            branchName:
                                branch.branchName ||
                                branch.name ||
                                "Head Office",

                            name:
                                branch.name ||
                                branch.branchName ||
                                "Head Office",

                            code:
                                branch.code ||
                                "HO",

                            type:
                                "head-office",

                            isHeadOffice:
                                true,

                            status:
                                branch.status ||
                                "active"
                        };
                    }
                )
                .filter(
                    Boolean
                );


        if (!found) {

            branches.unshift({

                id:
                    DEFAULT_BRANCH_ID,

                branchName:
                    "Head Office",

                name:
                    "Head Office",

                code:
                    "HO",

                type:
                    "head-office",

                isHeadOffice:
                    true,

                status:
                    "active"
            });
        }
    }


    /* ==========================================
       PRODUCT STOCK MIGRATION
    ========================================== */

    function migrateProductsToBranchStock() {

        let changed =
            false;


        products =
            products.map(
                function (product) {

                    const item = {
                        ...product
                    };


                    if (
                        !item.branchStock ||
                        typeof item.branchStock !==
                            "object" ||
                        Array.isArray(
                            item.branchStock
                        )
                    ) {

                        item.branchStock =
                            {};

                        item.branchStock[
                            DEFAULT_BRANCH_ID
                        ] =
                            toNumber(
                                item.quantity
                            );

                        changed =
                            true;
                    }


                    if (
                        item.branchStock[
                            DEFAULT_BRANCH_ID
                        ] === undefined &&
                        toNumber(
                            item.quantity
                        ) > 0 &&
                        Object.keys(
                            item.branchStock
                        ).length === 0
                    ) {

                        item.branchStock[
                            DEFAULT_BRANCH_ID
                        ] =
                            toNumber(
                                item.quantity
                            );

                        changed =
                            true;
                    }


                    item.quantity =
                        sumBranchStock(
                            item.branchStock
                        );


                    return item;
                }
            );


        if (changed) {

            saveStoredArray(
                PRODUCTS_KEY,
                products
            );
        }
    }


    /* ==========================================
       BRANCH DROPDOWNS
    ========================================== */

    function populateBranchDropdowns() {

        if (
            !elements.fromBranch ||
            !elements.toBranch
        ) {

            return;
        }


        const activeBranches =
            branches
                .filter(
                    function (branch) {

                        return (
                            String(
                                branch.status ||
                                "active"
                            ).toLowerCase() ===
                            "active"
                        );
                    }
                )
                .sort(
                    function (a, b) {

                        return getBranchName(
                            a
                        ).localeCompare(
                            getBranchName(
                                b
                            )
                        );
                    }
                );


        const options =
            activeBranches
                .map(
                    function (branch) {

                        return (
                            '<option value="' +
                            escapeHTML(
                                branch.id
                            ) +
                            '">' +
                            escapeHTML(
                                getBranchName(
                                    branch
                                )
                            ) +
                            "</option>"
                        );
                    }
                )
                .join("");


        elements.fromBranch.innerHTML =
            '<option value="">Select source branch</option>' +
            options;


        elements.toBranch.innerHTML =
            '<option value="">Select destination branch</option>' +
            options;
    }


    /* ==========================================
       PRODUCTS
    ========================================== */

    function populateProductDropdown() {

        const sourceBranchId =
            elements.fromBranch.value;


        elements.transferProduct.innerHTML =
            '<option value="">Select product</option>';


        elements.availableTransferStock.value =
            "";


        if (!sourceBranchId) {

            return;
        }


        products =
            readStoredArray(
                PRODUCTS_KEY
            );


        const availableProducts =
            products
                .filter(
                    function (product) {

                        const active =
                            String(
                                product.status ||
                                "active"
                            ).toLowerCase() !==
                                "inactive";


                        return (
                            active &&
                            getBranchStock(
                                product,
                                sourceBranchId
                            ) > 0
                        );
                    }
                )
                .sort(
                    function (a, b) {

                        return String(
                            a.name || ""
                        ).localeCompare(
                            String(
                                b.name || ""
                            )
                        );
                    }
                );


        if (
            availableProducts.length === 0
        ) {

            elements.transferProduct.innerHTML =
                '<option value="">No products with stock in this branch</option>';

            return;
        }


        elements.transferProduct.innerHTML =
            '<option value="">Select product</option>' +

            availableProducts
                .map(
                    function (product) {

                        const stock =
                            getBranchStock(
                                product,
                                sourceBranchId
                            );


                        const unit =
                            product.unit
                                ? " " + product.unit
                                : "";


                        return (
                            '<option value="' +
                            escapeHTML(
                                product.id
                            ) +
                            '">' +

                            escapeHTML(
                                product.name ||
                                "Unnamed Product"
                            ) +

                            " — " +

                            formatNumber(
                                stock
                            ) +

                            escapeHTML(
                                unit
                            ) +

                            "</option>"
                        );
                    }
                )
                .join("");
    }


    function updateAvailableStock() {

        const product =
            getProductById(
                elements.transferProduct.value
            );


        const branchId =
            elements.fromBranch.value;


        const stock =
            product &&
            branchId
                ? getBranchStock(
                    product,
                    branchId
                )
                : 0;


        elements.availableTransferStock.value =
            product &&
            branchId
                ? (
                    formatNumber(
                        stock
                    ) +
                    (
                        product.unit
                            ? " " +
                              product.unit
                            : ""
                    )
                )
                : "";


        elements.transferQuantity.max =
            stock > 0
                ? String(
                    stock
                )
                : "";
    }


    /* ==========================================
       BRANCH VALIDATION
    ========================================== */

    function validateDifferentBranches(
        displayMessage
    ) {

        const fromId =
            elements.fromBranch.value;


        const toId =
            elements.toBranch.value;


        if (
            fromId &&
            toId &&
            fromId === toId
        ) {

            if (
                displayMessage !== false
            ) {

                showMessageBox(
                    "Source and destination branches must be different.",
                    "error"
                );
            }


            elements.toBranch.value =
                "";


            return false;
        }


        return true;
    }


    /* ==========================================
       SAVE TRANSFER
    ========================================== */

    async function handleTransferSubmit(
        event
    ) {

        event.preventDefault();


        if (saveInProgress) {

            return;
        }


        let transfer = null;
        let updatedProduct = null;


        try {

            loadData();

            ensureHeadOffice();

            migrateProductsToBranchStock();


            const fromBranchId =
                elements.fromBranch.value;


            const toBranchId =
                elements.toBranch.value;


            const productId =
                elements.transferProduct.value;


            const quantity =
                toNumber(
                    elements.transferQuantity.value
                );


            const status =
                String(
                    elements.transferStatus.value ||
                    "completed"
                )
                    .trim()
                    .toLowerCase();


            /* ==================================
               VALIDATION
            ================================== */

            if (
                !elements.transferDate.value
            ) {

                throw new Error(
                    "Select the transfer date."
                );
            }


            if (!fromBranchId) {

                throw new Error(
                    "Select the source branch."
                );
            }


            if (!toBranchId) {

                throw new Error(
                    "Select the destination branch."
                );
            }


            if (
                !validateDifferentBranches(
                    false
                )
            ) {

                throw new Error(
                    "Source and destination branches must be different."
                );
            }


            if (!productId) {

                throw new Error(
                    "Select a product."
                );
            }


            if (
                !Number.isFinite(
                    quantity
                ) ||
                quantity <= 0
            ) {

                throw new Error(
                    "Enter a valid quantity greater than zero."
                );
            }


            const sourceBranch =
                getBranchById(
                    fromBranchId
                );


            const destinationBranch =
                getBranchById(
                    toBranchId
                );


            const productIndex =
                products.findIndex(
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
                );


            if (
                !sourceBranch ||
                !destinationBranch
            ) {

                throw new Error(
                    "One of the selected branches could not be found."
                );
            }


            if (
                productIndex === -1
            ) {

                throw new Error(
                    "The selected product could not be found."
                );
            }


            const product = {

                ...products[
                    productIndex
                ]
            };


            product.branchStock = {

                ...(
                    product.branchStock ||
                    {}
                )
            };


            const availableStock =
                getBranchStock(
                    product,
                    fromBranchId
                );


            if (
                quantity >
                availableStock
            ) {

                throw new Error(
                    "Insufficient stock. Available: " +
                    formatNumber(
                        availableStock
                    ) +
                    (
                        product.unit
                            ? " " +
                              product.unit
                            : ""
                    )
                );
            }


            saveInProgress =
                true;


            setSaveButtonState(
                true
            );


            const now =
                new Date();


            const transferNumber =
                generateTransferNumber();


            transfer = {

                id:
                    transferNumber,

                transferNumber:
                    transferNumber,


                transferDate:
                    elements.transferDate.value,

                date:
                    elements.transferDate.value,


                fromBranchId:
                    String(
                        fromBranchId
                    ),

                fromBranchName:
                    getBranchName(
                        sourceBranch
                    ),


                toBranchId:
                    String(
                        toBranchId
                    ),

                toBranchName:
                    getBranchName(
                        destinationBranch
                    ),


                productId:
                    String(
                        product.id
                    ),

                productName:
                    product.name ||
                    "Unnamed Product",


                quantity:
                    quantity,

                unit:
                    product.unit ||
                    "",


                status:
                    status,


                notes:
                    elements.transferNotes.value
                        .trim(),


                createdBy:
                    getCurrentUserName(),


                createdAt:
                    now.toISOString(),


                completedAt:
                    status ===
                        "completed"
                        ? now.toISOString()
                        : ""
            };


            /* ==================================
               STOCK MOVEMENT
               LOCAL ONLY — ONCE
            ================================== */

            if (
                status ===
                "completed"
            ) {

                product.branchStock[
                    fromBranchId
                ] =
                    availableStock -
                    quantity;


                product.branchStock[
                    toBranchId
                ] =
                    getBranchStock(
                        product,
                        toBranchId
                    ) +
                    quantity;


                product.quantity =
                    sumBranchStock(
                        product.branchStock
                    );


                product.updatedAt =
                    now.toISOString();


                products[
                    productIndex
                ] =
                    product;


                if (
                    !saveStoredArray(
                        PRODUCTS_KEY,
                        products
                    )
                ) {

                    throw new Error(
                        "Inventory could not be updated."
                    );
                }


                updatedProduct =
                    product;
            }


            /* ==================================
               SAVE TRANSFER LOCALLY
            ================================== */

            transfers.push(
                transfer
            );


            if (
                !saveStoredArray(
                    TRANSFERS_KEY,
                    transfers
                )
            ) {

                throw new Error(
                    "Transfer record could not be saved."
                );
            }


            dispatchDataUpdated(
                PRODUCTS_KEY,
                products
            );


            dispatchDataUpdated(
                TRANSFERS_KEY,
                transfers
            );


            /* ==================================
               FIREBASE
            ================================== */

            const cloudResult =
                await syncTransferToCloud(
                    transfer,
                    updatedProduct
                );


            if (cloudResult) {

                showMessageBox(
                    status ===
                        "completed"
                        ? "Transfer completed and synced to Firebase."
                        : "Pending transfer saved and synced to Firebase.",
                    "success"
                );

            } else {

                showMessageBox(
                    "Transfer saved locally. Firebase sync failed.",
                    "error"
                );
            }


            resetTransferForm();

            refreshTransfers();


        } catch (error) {

            console.error(
                "Transfer save error:",
                error
            );


            showMessageBox(
                error.message ||
                "Unable to save the transfer.",
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
       WAIT FOR CLOUD MODULE
    ========================================== */

    function waitForTransfersCloud(
        timeout = 10000
    ) {

        return new Promise(
            function (
                resolve,
                reject
            ) {

                const started =
                    Date.now();


                function check() {

                    if (
                        window.JufelixTransfersCloud &&
                        typeof window
                            .JufelixTransfersCloud
                            .saveTransfer ===
                            "function"
                    ) {

                        resolve(
                            window.JufelixTransfersCloud
                        );

                        return;
                    }


                    if (
                        Date.now() -
                        started >
                        timeout
                    ) {

                        reject(
                            new Error(
                                "Transfers Cloud module did not load."
                            )
                        );

                        return;
                    }


                    setTimeout(
                        check,
                        100
                    );
                }


                check();
            }
        );
    }


    /* ==========================================
       FIREBASE SYNC
    ========================================== */

    async function syncTransferToCloud(
        transfer,
        updatedProduct
    ) {

        try {

            console.log(
                "☁️ Preparing Firebase transfer sync:",
                transfer.transferNumber
            );


            const cloud =
                await waitForTransfersCloud();


            console.log(
                "✅ Transfers Cloud API detected."
            );


            /*
             * First save transfer.
             */
            await cloud.saveTransfer(
                transfer
            );


            console.log(
                "✅ Transfer document uploaded:",
                transfer.transferNumber
            );


            /*
             * Then upload final stock state.
             */
            if (
                updatedProduct &&
                typeof cloud.saveProduct ===
                    "function"
            ) {

                await cloud.saveProduct(
                    updatedProduct
                );


                console.log(
                    "✅ Updated branch stock uploaded:",
                    updatedProduct.name ||
                    updatedProduct.id
                );
            }


            return true;


        } catch (error) {

            console.error(
                "❌ TRANSFER FIREBASE SYNC FAILED:",
                error
            );


            showFirebaseError(
                error
            );


            return false;
        }
    }


    /* ==========================================
       VISIBLE FIREBASE ERROR
    ========================================== */

    function showFirebaseError(
        error
    ) {

        const code =
            error &&
            error.code
                ? error.code
                : "unknown";


        const message =
            error &&
            error.message
                ? error.message
                : String(
                    error ||
                    "Unknown Firebase error"
                );


        let box =
            document.getElementById(
                "transferFirebaseError"
            );


        if (!box) {

            box =
                document.createElement(
                    "div"
                );


            box.id =
                "transferFirebaseError";


            box.style.position =
                "fixed";

            box.style.left =
                "12px";

            box.style.right =
                "12px";

            box.style.bottom =
                "12px";

            box.style.zIndex =
                "999999";

            box.style.padding =
                "16px";

            box.style.background =
                "#7f1d1d";

            box.style.color =
                "#ffffff";

            box.style.borderRadius =
                "12px";

            box.style.fontSize =
                "14px";

            box.style.lineHeight =
                "1.6";

            box.style.boxShadow =
                "0 10px 35px rgba(0,0,0,.35)";


            document.body.appendChild(
                box
            );
        }


        box.innerHTML =
            "<strong>FIREBASE TRANSFER ERROR</strong><br>" +
            "Code: " +
            escapeHTML(
                code
            ) +
            "<br>" +
            "Message: " +
            escapeHTML(
                message
            );


        window.setTimeout(
            function () {

                if (box) {

                    box.remove();
                }

            },
            12000
        );
    }


    /* ==========================================
       REFRESH
    ========================================== */

    function refreshTransfers() {

        loadData();

        ensureHeadOffice();

        migrateProductsToBranchStock();

        updateSummary();

        displayTransfers();


        if (
            elements.fromBranch.value
        ) {

            const selectedProduct =
                elements.transferProduct.value;


            populateProductDropdown();


            if (selectedProduct) {

                elements.transferProduct.value =
                    selectedProduct;
            }


            updateAvailableStock();
        }
    }


    /* ==========================================
       SUMMARY
    ========================================== */

    function updateSummary() {

        const completed =
            transfers.filter(
                function (transfer) {

                    return (
                        String(
                            transfer.status ||
                            "completed"
                        ).toLowerCase() ===
                        "completed"
                    );
                }
            );


        const pending =
            transfers.filter(
                function (transfer) {

                    return (
                        String(
                            transfer.status ||
                            ""
                        ).toLowerCase() ===
                        "pending"
                    );
                }
            );


        const unitsMoved =
            completed.reduce(
                function (
                    total,
                    transfer
                ) {

                    return (
                        total +
                        toNumber(
                            transfer.quantity
                        )
                    );
                },
                0
            );


        setText(
            elements.totalTransfers,
            transfers.length
        );


        setText(
            elements.completedTransfers,
            completed.length
        );


        setText(
            elements.pendingTransfers,
            pending.length
        );


        setText(
            elements.totalUnitsMoved,
            formatNumber(
                unitsMoved
            )
        );
    }


    /* ==========================================
       DISPLAY TRANSFERS
    ========================================== */

    function displayTransfers() {

        if (
            !elements.transferTableBody
        ) {

            return;
        }


        const searchText =
            String(
                elements.transferSearch.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const statusFilter =
            String(
                elements.transferStatusFilter.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const dateFilter =
            elements.transferDateFilter.value ||
            "";


        const filtered =
            transfers
                .filter(
                    function (transfer) {

                        const searchable =
                            [
                                transfer.transferNumber ||
                                transfer.id,

                                transfer.productName,

                                transfer.fromBranchName,

                                transfer.toBranchName,

                                transfer.notes,

                                transfer.createdBy
                            ]
                                .join(
                                    " "
                                )
                                .toLowerCase();


                        const status =
                            String(
                                transfer.status ||
                                "completed"
                            ).toLowerCase();


                        const date =
                            getTransferDate(
                                transfer
                            );


                        return (
                            (
                                !searchText ||
                                searchable.includes(
                                    searchText
                                )
                            ) &&
                            (
                                !statusFilter ||
                                status ===
                                    statusFilter
                            ) &&
                            (
                                !dateFilter ||
                                date ===
                                    dateFilter
                            )
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
            filtered.length === 0
        ) {

            elements.transferTableBody.innerHTML =
                '<tr><td colspan="8" class="table-empty">No matching stock transfers found.</td></tr>';

            return;
        }


        elements.transferTableBody.innerHTML =
            filtered
                .map(
                    function (transfer) {

                        const status =
                            String(
                                transfer.status ||
                                "completed"
                            ).toLowerCase();


                        const statusClass =
                            status ===
                                "pending"
                                ? "status-pending"
                                : "status-completed";


                        return `
                            <tr>

                                <td>
                                    <strong>
                                        ${escapeHTML(
                                            transfer.transferNumber ||
                                            transfer.id ||
                                            "—"
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHTML(
                                        formatDate(
                                            getTransferDate(
                                                transfer
                                            )
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        transfer.fromBranchName ||
                                        getBranchNameById(
                                            transfer.fromBranchId
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        transfer.toBranchName ||
                                        getBranchNameById(
                                            transfer.toBranchId
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        transfer.productName ||
                                        getProductNameById(
                                            transfer.productId
                                        )
                                    )}
                                </td>

                                <td>
                                    ${formatNumber(
                                        transfer.quantity
                                    )}
                                    ${
                                        transfer.unit
                                            ? " " +
                                              escapeHTML(
                                                  transfer.unit
                                              )
                                            : ""
                                    }
                                </td>

                                <td>
                                    <span class="status-badge ${statusClass}">
                                        ${escapeHTML(
                                            capitalize(
                                                status
                                            )
                                        )}
                                    </span>
                                </td>

                                <td>
                                    ${escapeHTML(
                                        transfer.notes ||
                                        "—"
                                    )}
                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");
    }


    /* ==========================================
       RESET FORM
    ========================================== */

    function resetTransferForm() {

        elements.transferForm.reset();

        applyTransferDefaults();
    }


    function applyTransferDefaults() {

        elements.transferNumber.value =
            generateTransferNumber();


        elements.transferDate.value =
            getLocalDateKey(
                new Date()
            );


        elements.transferStatus.value =
            "completed";


        elements.availableTransferStock.value =
            "";


        elements.transferQuantity.value =
            "";


        elements.transferNotes.value =
            "";


        elements.fromBranch.value =
            "";


        elements.toBranch.value =
            "";


        elements.transferProduct.innerHTML =
            '<option value="">Select product</option>';
    }


    /* ==========================================
       LOOKUPS
    ========================================== */

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


    function getBranchName(
        branch
    ) {

        return branch
            ? (
                branch.branchName ||
                branch.name ||
                "Unnamed Branch"
            )
            : "Unknown Branch";
    }


    function getBranchNameById(
        branchId
    ) {

        return getBranchName(
            getBranchById(
                branchId
            )
        );
    }


    function getProductNameById(
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


    function getBranchStock(
        product,
        branchId
    ) {

        if (!product) {

            return 0;
        }


        if (
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


        return (
            String(
                branchId
            ) ===
            DEFAULT_BRANCH_ID
        )
            ? toNumber(
                product.quantity
            )
            : 0;
    }


    function sumBranchStock(
        branchStock
    ) {

        return Object.values(
            branchStock ||
            {}
        ).reduce(
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
       TRANSFER NUMBER
    ========================================== */

    function generateTransferNumber() {

        const now =
            new Date();


        const datePart =
            now.getFullYear() +

            String(
                now.getMonth() + 1
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


        const prefix =
            "TRF-" +
            datePart;


        let highest =
            0;


        transfers.forEach(
            function (transfer) {

                const value =
                    String(
                        transfer.transferNumber ||
                        transfer.id ||
                        ""
                    );


                if (
                    !value.startsWith(
                        prefix
                    )
                ) {

                    return;
                }


                const match =
                    value.match(
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
            prefix +
            "-" +
            String(
                highest + 1
            ).padStart(
                4,
                "0"
            )
        );
    }


    /* ==========================================
       CURRENT USER
    ========================================== */

    function getCurrentUserName() {

        const currentUser =
            readStoredObject(
                CURRENT_USER_KEY
            ) ||
            readStoredObject(
                "currentUser"
            );


        if (!currentUser) {

            return "System";
        }


        return (
            currentUser.fullName ||
            currentUser.name ||
            currentUser.username ||
            currentUser.email ||
            "System"
        );
    }


    /* ==========================================
       STORAGE
    ========================================== */

    function readStoredArray(
        storageKey
    ) {

        try {

            const saved =
                localStorage.getItem(
                    storageKey
                );


            const parsed =
                saved
                    ? JSON.parse(
                        saved
                    )
                    : [];


            return Array.isArray(
                parsed
            )
                ? parsed
                : [];


        } catch (error) {

            console.error(
                "Unable to read:",
                storageKey,
                error
            );


            return [];
        }
    }


    function readStoredObject(
        storageKey
    ) {

        try {

            const saved =
                localStorage.getItem(
                    storageKey
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


    function saveStoredArray(
        storageKey,
        value
    ) {

        try {

            localStorage.setItem(
                storageKey,
                JSON.stringify(
                    value
                )
            );


            return true;


        } catch (error) {

            console.error(
                "Unable to save:",
                storageKey,
                error
            );


            return false;
        }
    }


    /* ==========================================
       EVENTS
    ========================================== */

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
    }


    /* ==========================================
       DATES
    ========================================== */

    function getTransferDate(
        transfer
    ) {

        return (
            transfer.transferDate ||
            transfer.date ||
            transfer.createdAt ||
            ""
        );
    }


    function getTimestamp(
        transfer
    ) {

        const value =
            transfer.createdAt ||
            transfer.transferDate ||
            transfer.date ||
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


    function getLocalDateKey(
        date
    ) {

        return (
            date.getFullYear() +
            "-" +
            String(
                date.getMonth() + 1
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
            /^\d{4}-\d{2}-\d{2}$/.test(
                String(
                    value
                )
            )
                ? String(
                    value
                )
                : getLocalDateKey(
                    new Date(
                        value
                    )
                );


        const date =
            new Date(
                normalized +
                "T00:00:00"
            );


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


    /* ==========================================
       FORMATTERS
    ========================================== */

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


    function capitalize(
        value
    ) {

        const text =
            String(
                value ||
                ""
            );


        return (
            text.charAt(
                0
            ).toUpperCase() +
            text.slice(
                1
            )
        );
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


    function escapeHTML(
        value
    ) {

        return String(
            value === undefined ||
            value === null
                ? ""
                : value
        )
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* ==========================================
       BUTTON
    ========================================== */

    function setSaveButtonState(
        saving
    ) {

        if (!elements.saveButton) {

            return;
        }


        elements.saveButton.disabled =
            saving;


        elements.saveButton.textContent =
            saving
                ? "Saving..."
                : "Save Transfer";
    }


    /* ==========================================
       TOAST
    ========================================== */

    function showMessageBox(
        message,
        type
    ) {

        let toast =
            document.getElementById(
                "jufelixTransferToast"
            );


        if (!toast) {

            toast =
                document.createElement(
                    "div"
                );


            toast.id =
                "jufelixTransferToast";


            toast.style.position =
                "fixed";

            toast.style.right =
                "18px";

            toast.style.bottom =
                "18px";

            toast.style.zIndex =
                "99999";

            toast.style.maxWidth =
                "380px";

            toast.style.padding =
                "14px 18px";

            toast.style.borderRadius =
                "10px";

            toast.style.boxShadow =
                "0 10px 30px rgba(0,0,0,.22)";

            toast.style.fontWeight =
                "700";


            document.body.appendChild(
                toast
            );
        }


        toast.style.background =
            type === "error"
                ? "#dc3545"
                : "#198754";


        toast.style.color =
            "#ffffff";


        toast.textContent =
            message;


        window.clearTimeout(
            showMessageBox.timer
        );


        showMessageBox.timer =
            window.setTimeout(
                function () {

                    toast.remove();

                },
                4500
            );
    }


    /* ==========================================
       PUBLIC API
    ========================================== */

    window.JufelixTransfers = {

        refresh:
            refreshTransfers,

        resetForm:
            resetTransferForm,

        getBranchStock:
            getBranchStock,

        syncCloud:
            function () {

                if (
                    window.JufelixTransfersCloud &&
                    typeof window
                        .JufelixTransfersCloud
                        .syncLocal ===
                        "function"
                ) {

                    return window
                        .JufelixTransfersCloud
                        .syncLocal();
                }
            }
    };

})();