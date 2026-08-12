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

    document.addEventListener(
        "DOMContentLoaded",
        initializeBranchStockViewer
    );

    function initializeBranchStockViewer() {
        loadData();
        ensureHeadOffice();
        connectEvents();
        populateActiveBranchSelector();
        populateBranchFilter();
        updateActiveBranchName();
        displayBranchStock();
        updateTotalStock();
    }

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
                displayBranchStock
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
                    updatedKey === BRANCHES_KEY
                ) {
                    refreshBranchStockViewer();
                }
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

    function refreshBranchStockViewer() {
        loadData();
        ensureHeadOffice();
        populateActiveBranchSelector();
        populateBranchFilter();
        updateActiveBranchName();
        displayBranchStock();
        updateTotalStock();
    }

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
                id: DEFAULT_BRANCH_ID,
                branchName: "Head Office",
                name: "Head Office",
                code: "HO",
                type: "head-office",
                isHeadOffice: true,
                status: "active"
            });
        }
    }


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
                .map(function (branch) {
                    return `
                        <option value="${escapeHTML(branch.id)}">
                            ${escapeHTML(getBranchName(branch))}
                        </option>
                    `;
                })
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

    function changeActiveBranch(event) {
        const branchId =
            event.target.value;

        const selectedBranch =
            branches.find(
                function (branch) {
                    return (
                        String(branch.id) ===
                        String(branchId)
                    );
                }
            );

        if (!selectedBranch) {
            return;
        }

        const activeBranch = {
            id: String(selectedBranch.id),
            branchName: getBranchName(selectedBranch),
            name: getBranchName(selectedBranch),
            code: selectedBranch.code || ""
        };

        localStorage.setItem(
            ACTIVE_BRANCH_KEY,
            JSON.stringify(activeBranch)
        );

        document.dispatchEvent(
            new CustomEvent(
                "jufelix:data-updated",
                {
                    detail: {
                        key: ACTIVE_BRANCH_KEY,
                        value: activeBranch
                    }
                }
            )
        );

        window.location.reload();
    }

    function populateBranchFilter() {
        const branchFilter =
            document.getElementById(
                "inventoryBranchFilter"
            );

        if (!branchFilter) {
            return;
        }

        const previousValue =
            branchFilter.value;

        const activeBranches =
            getActiveBranches();

        branchFilter.innerHTML = `
            <option value="">
                All Branches
            </option>

            ${activeBranches
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
                .join("")}
        `;

        const previousStillExists =
            activeBranches.some(
                function (branch) {
                    return (
                        String(branch.id) ===
                        String(previousValue)
                    );
                }
            );

        if (previousStillExists) {
            branchFilter.value =
                previousValue;
        }
    }

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

        const selectedBranch =
            branchFilter
                ? branchFilter.value
                : "";

        const selectedStockLevel =
            stockFilter
                ? stockFilter.value
                : "";

        const activeBranches =
            getActiveBranches();

        const rows = [];

        products.forEach(
            function (product) {
                activeBranches.forEach(
                    function (branch) {
                        if (
                            selectedBranch &&
                            String(branch.id) !==
                                String(
                                    selectedBranch
                                )
                        ) {
                            return;
                        }

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

        if (rows.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="table-empty"
                    >
                        No matching branch stock records found.
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
                                    <span class="branch-status ${row.stockStatus.className}">
                                        ${row.stockStatus.label}
                                    </span>
                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");
    }

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

        const totalStock =
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

        totalElement.textContent =
            formatNumber(totalStock);
    }

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
                        String(activeBranchId)
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
        if (quantity <= 0) {
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

    function getBranchName(
        branch
    ) {
        return (
            branch.branchName ||
            branch.name ||
            "Unnamed Branch"
        );
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
                    toNumber(value)
                );
            },
            0
        );
    }

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

    function toNumber(value) {
        const numberValue =
            Number(value);

        return Number.isFinite(
            numberValue
        )
            ? numberValue
            : 0;
    }

    function formatNumber(value) {
        return new Intl.NumberFormat(
            "en-GH"
        ).format(
            toNumber(value)
        );
    }

    function escapeHTML(value) {
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

    window.JufelixBranchStockViewer = {
        refresh:
            refreshBranchStockViewer
    };

})();