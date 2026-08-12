/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   Branch Stock Viewer

   File:
   js/modules/inventory-branch-viewer.js
========================================== */

(function () {
    "use strict";

    const PRODUCTS_KEY =
        "jufelix_products";

    const BRANCHES_KEY =
        "jufelix_v7_branches";

    const ACTIVE_BRANCH_KEY =
        "jufelix_v7_active_branch";

    const CURRENT_USER_KEY =
        "jufelix_v7_current_user";

    const DEFAULT_BRANCH_ID =
        "head-office";

    let products = [];
    let branches = [];


    /* ==========================================
       START
    ========================================== */

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeBranchStockViewer
        );
    } else {
        initializeBranchStockViewer();
    }


    function initializeBranchStockViewer() {

        loadData();

        ensureHeadOffice();

        connectEvents();

        populateActiveBranchSelector();

        populateBranchFilter();

        updateActiveBranchName();

        displayBranchStock();

        updateTotalStock();

        console.log(
            "Jufelix Branch Stock Viewer loaded."
        );
    }


    /* ==========================================
       EVENTS
    ========================================== */

    function connectEvents() {

        const searchInput =
            document.getElementById(
                "branchStockSearch"
            );

        const branchFilter =
            document.getElementById(
                "inventoryBranchFilter"
            );

        const stockFilter =
            document.getElementById(
                "branchStockLevelFilter"
            );

        const activeBranchSelect =
            document.getElementById(
                "inventoryActiveBranchSelect"
            );


        if (searchInput) {
            searchInput.addEventListener(
                "input",
                displayBranchStock
            );
        }


        if (branchFilter) {
            branchFilter.addEventListener(
                "change",
                function () {

                    displayBranchStock();
                    updateTotalStock();
                }
            );
        }


        if (stockFilter) {
            stockFilter.addEventListener(
                "change",
                displayBranchStock
            );
        }


        if (activeBranchSelect) {
            activeBranchSelect.addEventListener(
                "change",
                changeActiveBranch
            );
        }


        document.addEventListener(
            "jufelix:data-updated",
            function (event) {

                const updatedKey =
                    event.detail
                        ? event.detail.key
                        : "";

                if (
                    updatedKey === PRODUCTS_KEY ||
                    updatedKey === BRANCHES_KEY ||
                    updatedKey === ACTIVE_BRANCH_KEY
                ) {
                    refreshBranchStockViewer();
                }
            }
        );


        document.addEventListener(
            "jufelix:cloud-products-updated",
            function () {

                refreshBranchStockViewer();
            }
        );


        window.addEventListener(
            "storage",
            function (event) {

                if (
                    event.key === PRODUCTS_KEY ||
                    event.key === BRANCHES_KEY ||
                    event.key === ACTIVE_BRANCH_KEY
                ) {
                    refreshBranchStockViewer();
                }
            }
        );
    }


    /* ==========================================
       REFRESH
    ========================================== */

    function refreshBranchStockViewer() {

        loadData();

        ensureHeadOffice();

        populateActiveBranchSelector();

        populateBranchFilter();

        updateActiveBranchName();

        displayBranchStock();

        updateTotalStock();
    }


    /* ==========================================
       LOAD DATA
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
    }


    /* ==========================================
       HEAD OFFICE
    ========================================== */

    function ensureHeadOffice() {

        const headOfficeExists =
            branches.some(
                function (branch) {

                    return (
                        String(branch.id) ===
                            DEFAULT_BRANCH_ID ||
                        branch.isHeadOffice ===
                            true ||
                        String(
                            branch.type || ""
                        ).toLowerCase() ===
                            "head-office"
                    );
                }
            );


        if (!headOfficeExists) {

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
       ACTIVE BRANCH SELECTOR
    ========================================== */

    function populateActiveBranchSelector() {

        const selector =
            document.getElementById(
                "inventoryActiveBranchSelect"
            );

        if (!selector) {
            return;
        }


        const activeBranchId =
            getActiveBranchId();

        const activeBranches =
            getActiveBranches();


        selector.innerHTML =
            activeBranches
                .map(
                    function (branch) {

                        return `
                            <option
                                value="${escapeHTML(
                                    branch.id
                                )}"
                            >
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


        const selectedExists =
            activeBranches.some(
                function (branch) {

                    return (
                        String(branch.id) ===
                        String(activeBranchId)
                    );
                }
            );


        selector.value =
            selectedExists
                ? String(activeBranchId)
                : DEFAULT_BRANCH_ID;
    }


    /* ==========================================
       CHANGE ACTIVE BRANCH
    ========================================== */

    function changeActiveBranch(event) {

        const branchId =
            String(
                event.target.value ||
                ""
            );


        const selectedBranch =
            branches.find(
                function (branch) {

                    return (
                        String(branch.id) ===
                        branchId
                    );
                }
            );


        if (!selectedBranch) {
            return;
        }


        const activeBranch = {

            id:
                String(
                    selectedBranch.id
                ),

            branchName:
                getBranchName(
                    selectedBranch
                ),

            name:
                getBranchName(
                    selectedBranch
                ),

            code:
                selectedBranch.code ||
                "",

            status:
                selectedBranch.status ||
                "active",

            isHeadOffice:
                String(
                    selectedBranch.id
                ) ===
                DEFAULT_BRANCH_ID
        };


        localStorage.setItem(
            ACTIVE_BRANCH_KEY,
            JSON.stringify(
                activeBranch
            )
        );


        /*
         * Make Branch Stock Viewer immediately
         * follow the newly selected branch.
         */

        const branchFilter =
            document.getElementById(
                "inventoryBranchFilter"
            );

        if (branchFilter) {
            branchFilter.value =
                branchId;
        }


        updateActiveBranchName();

        displayBranchStock();

        updateTotalStock();


        document.dispatchEvent(
            new CustomEvent(
                "jufelix:data-updated",
                {
                    detail: {

                        key:
                            ACTIVE_BRANCH_KEY,

                        value:
                            activeBranch
                    }
                }
            )
        );
    }


    /* ==========================================
       BRANCH FILTER
    ========================================== */

    function populateBranchFilter() {

        const branchFilter =
            document.getElementById(
                "inventoryBranchFilter"
            );

        if (!branchFilter) {
            return;
        }


        const activeBranches =
            getActiveBranches();

        const activeBranchId =
            getActiveBranchId();


        branchFilter.innerHTML = `
            <option value="">
                All Branches
            </option>

            ${activeBranches
                .map(
                    function (branch) {

                        return `
                            <option
                                value="${escapeHTML(
                                    branch.id
                                )}"
                            >
                                ${escapeHTML(
                                    getBranchName(
                                        branch
                                    )
                                )}
                            </option>
                        `;
                    }
                )
                .join("")}
        `;


        /*
         * IMPORTANT:
         * Default the viewer to the current
         * active branch instead of All Branches.
         */

        const activeBranchExists =
            activeBranches.some(
                function (branch) {

                    return (
                        String(branch.id) ===
                        String(activeBranchId)
                    );
                }
            );


        branchFilter.value =
            activeBranchExists
                ? String(activeBranchId)
                : "";
    }


    /* ==========================================
       DISPLAY STOCK
    ========================================== */

    function displayBranchStock() {

        const tableBody =
            document.getElementById(
                "branchStockTableBody"
            );

        if (!tableBody) {
            return;
        }


        products =
            readStoredArray(
                PRODUCTS_KEY
            );


        const searchInput =
            document.getElementById(
                "branchStockSearch"
            );

        const branchFilter =
            document.getElementById(
                "inventoryBranchFilter"
            );

        const stockFilter =
            document.getElementById(
                "branchStockLevelFilter"
            );


        const searchTerm =
            searchInput
                ? searchInput.value
                    .trim()
                    .toLowerCase()
                : "";


        /*
         * If no branch filter is selected,
         * show all branches.
         */

        const selectedBranchId =
            branchFilter
                ? String(
                    branchFilter.value ||
                    ""
                )
                : getActiveBranchId();


        const selectedStockLevel =
            stockFilter
                ? stockFilter.value
                : "";


        const activeBranches =
            getActiveBranches();


        const branchesToDisplay =
            selectedBranchId
                ? activeBranches.filter(
                    function (branch) {

                        return (
                            String(branch.id) ===
                            String(
                                selectedBranchId
                            )
                        );
                    }
                )
                : activeBranches;


        const rows = [];


        products.forEach(
            function (product) {

                branchesToDisplay.forEach(
                    function (branch) {

                        const quantity =
                            getBranchStock(
                                product,
                                branch.id
                            );


                        const lowStockLevel =
                            getLowStockLevel(
                                product
                            );


                        const stockStatus =
                            getStockStatus(
                                quantity,
                                lowStockLevel
                            );


                        const searchableText = [
                            product.name,
                            product.sku,
                            product.category,
                            product.brand,
                            getBranchName(
                                branch
                            ),
                            branch.code
                        ]
                            .join(" ")
                            .toLowerCase();


                        if (
                            searchTerm &&
                            !searchableText.includes(
                                searchTerm
                            )
                        ) {
                            return;
                        }


                        if (
                            selectedStockLevel &&
                            stockStatus.level !==
                                selectedStockLevel
                        ) {
                            return;
                        }


                        rows.push({

                            product:
                                product,

                            branch:
                                branch,

                            quantity:
                                quantity,

                            lowStockLevel:
                                lowStockLevel,

                            stockStatus:
                                stockStatus
                        });
                    }
                );
            }
        );


        /*
         * Sort products alphabetically.
         */

        rows.sort(
            function (
                first,
                second
            ) {

                return String(
                    first.product.name ||
                    ""
                ).localeCompare(
                    String(
                        second.product.name ||
                        ""
                    )
                );
            }
        );


        if (
            rows.length ===
            0
        ) {

            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="table-empty"
                    >
                        No matching stock records found for this branch.
                    </td>
                </tr>
            `;

            return;
        }


        tableBody.innerHTML =
            rows
                .map(
                    function (row) {

                        return `
                            <tr>

                                <td>

                                    <strong>
                                        ${escapeHTML(
                                            row.product.name ||
                                            "Unnamed Product"
                                        )}
                                    </strong>

                                </td>


                                <td>

                                    ${escapeHTML(
                                        row.product.sku ||
                                        "—"
                                    )}

                                </td>


                                <td>

                                    ${escapeHTML(
                                        getBranchName(
                                            row.branch
                                        )
                                    )}

                                </td>


                                <td>

                                    <strong>
                                        ${formatNumber(
                                            row.quantity
                                        )}
                                    </strong>

                                </td>


                                <td>

                                    ${formatNumber(
                                        row.lowStockLevel
                                    )}

                                </td>


                                <td>

                                    ${escapeHTML(
                                        row.product.unit ||
                                        "—"
                                    )}

                                </td>


                                <td>

                                    <span
                                        class="branch-status ${row.stockStatus.className}"
                                    >

                                        ${row.stockStatus.label}

                                    </span>

                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");
    }


    /* ==========================================
       TOTAL STOCK
    ========================================== */

    function updateTotalStock() {

        const totalElement =
            document.getElementById(
                "totalAllBranchesStock"
            );

        if (!totalElement) {
            return;
        }


        products =
            readStoredArray(
                PRODUCTS_KEY
            );


        const branchFilter =
            document.getElementById(
                "inventoryBranchFilter"
            );


        const selectedBranchId =
            branchFilter
                ? String(
                    branchFilter.value ||
                    ""
                )
                : "";


        let totalStock =
            0;


        if (selectedBranchId) {

            totalStock =
                products.reduce(
                    function (
                        total,
                        product
                    ) {

                        return (
                            total +
                            getBranchStock(
                                product,
                                selectedBranchId
                            )
                        );
                    },
                    0
                );

        } else {

            totalStock =
                products.reduce(
                    function (
                        total,
                        product
                    ) {

                        return (
                            total +
                            sumBranchStock(
                                product.branchStock ||
                                {}
                            )
                        );
                    },
                    0
                );
        }


        totalElement.textContent =
            formatNumber(
                totalStock
            );
    }


    /* ==========================================
       ACTIVE BRANCH NAME
    ========================================== */

    function updateActiveBranchName() {

        const nameElement =
            document.getElementById(
                "inventoryActiveBranchName"
            );

        if (!nameElement) {
            return;
        }


        const activeBranchId =
            getActiveBranchId();


        const activeBranch =
            branches.find(
                function (branch) {

                    return (
                        String(branch.id) ===
                        String(
                            activeBranchId
                        )
                    );
                }
            );


        nameElement.textContent =
            activeBranch
                ? getBranchName(
                    activeBranch
                )
                : "Head Office";
    }


    /* ==========================================
       ACTIVE BRANCHES
    ========================================== */

    function getActiveBranches() {

        return branches
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
                function (
                    firstBranch,
                    secondBranch
                ) {

                    /*
                     * Keep Head Office first.
                     */

                    if (
                        String(
                            firstBranch.id
                        ) ===
                        DEFAULT_BRANCH_ID
                    ) {
                        return -1;
                    }

                    if (
                        String(
                            secondBranch.id
                        ) ===
                        DEFAULT_BRANCH_ID
                    ) {
                        return 1;
                    }


                    return getBranchName(
                        firstBranch
                    ).localeCompare(
                        getBranchName(
                            secondBranch
                        )
                    );
                }
            );
    }


    /* ==========================================
       GET BRANCH STOCK
    ========================================== */

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
                    String(branchId)
                ]
            );
        }


        /*
         * Old products without branchStock
         * belong to Head Office only.
         */

        if (
            String(branchId) ===
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


    /* ==========================================
       LOW STOCK
    ========================================== */

    function getLowStockLevel(
        product
    ) {

        return toNumber(
            product.lowStockLevel ??
            product.lowStock ??
            5
        );
    }


    function getStockStatus(
        quantity,
        lowStockLevel
    ) {

        if (
            quantity <=
            0
        ) {

            return {
                label:
                    "Out of Stock",

                level:
                    "out",

                className:
                    "branch-stock-out"
            };
        }


        if (
            quantity <=
            lowStockLevel
        ) {

            return {
                label:
                    "Low Stock",

                level:
                    "low",

                className:
                    "branch-stock-low"
            };
        }


        return {
            label:
                "Available",

            level:
                "available",

            className:
                "branch-stock-good"
        };
    }


    /* ==========================================
       ACTIVE BRANCH ID
    ========================================== */

    function getActiveBranchId() {

        const activeBranch =
            readStoredObject(
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


        const currentUser =
            readStoredObject(
                CURRENT_USER_KEY
            ) ||
            readStoredObject(
                "currentUser"
            );


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


    /* ==========================================
       BRANCH NAME
    ========================================== */

    function getBranchName(
        branch
    ) {

        return (
            branch.branchName ||
            branch.name ||
            "Unnamed Branch"
        );
    }


    /* ==========================================
       STOCK TOTAL
    ========================================== */

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
       STORAGE HELPERS
    ========================================== */

    function readStoredArray(
        storageKey
    ) {

        try {

            const savedData =
                localStorage.getItem(
                    storageKey
                );


            if (!savedData) {
                return [];
            }


            const parsedData =
                JSON.parse(
                    savedData
                );


            return Array.isArray(
                parsedData
            )
                ? parsedData
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

            const savedData =
                localStorage.getItem(
                    storageKey
                );


            if (!savedData) {
                return null;
            }


            const parsedData =
                JSON.parse(
                    savedData
                );


            if (
                parsedData &&
                typeof parsedData ===
                    "object" &&
                !Array.isArray(
                    parsedData
                )
            ) {

                return parsedData;
            }


            return null;

        } catch (error) {

            return null;
        }
    }


    /* ==========================================
       GENERAL HELPERS
    ========================================== */

    function toNumber(
        value
    ) {

        const numberValue =
            Number(
                value
            );


        return Number.isFinite(
            numberValue
        )
            ? numberValue
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

    window.JufelixBranchStockViewer = {

        refresh:
            refreshBranchStockViewer
    };

})();
