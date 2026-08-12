/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   COMPLETE STOCK TRANSFERS MODULE
   File: js/modules/transfers.js
========================================== */

(function () {
    "use strict";

    const PRODUCTS_KEY = "jufelix_products";
    const BRANCHES_KEY = "jufelix_v7_branches";
    const TRANSFERS_KEY = "jufelix_v7_transfers";
    const CURRENT_USER_KEY = "jufelix_v7_current_user";
    const DEFAULT_BRANCH_ID = "head-office";

    let products = [];
    let branches = [];
    let transfers = [];

    const elements = {};

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeTransfers);
    } else {
        initializeTransfers();
    }

    function initializeTransfers() {
        cacheElements();

        if (!elements.transferForm) {
            console.error("Transfers: #transferForm was not found.");
            return;
        }

        loadData();
        ensureHeadOffice();
        migrateProductsToBranchStock();
        populateBranchDropdowns();
        connectEvents();
        resetTransferForm();
        refreshTransfers();
    }

    function cacheElements() {
        elements.transferForm = document.getElementById("transferForm");
        elements.transferNumber = document.getElementById("transferNumber");
        elements.transferDate = document.getElementById("transferDate");
        elements.fromBranch = document.getElementById("fromBranch");
        elements.toBranch = document.getElementById("toBranch");
        elements.transferProduct = document.getElementById("transferProduct");
        elements.availableTransferStock = document.getElementById("availableTransferStock");
        elements.transferQuantity = document.getElementById("transferQuantity");
        elements.transferStatus = document.getElementById("transferStatus");
        elements.transferNotes = document.getElementById("transferNotes");
        elements.transferSearch = document.getElementById("transferSearch");
        elements.transferStatusFilter = document.getElementById("transferStatusFilter");
        elements.transferDateFilter = document.getElementById("transferDateFilter");
        elements.transferTableBody = document.getElementById("transferTableBody");
        elements.totalTransfers = document.getElementById("totalTransfers");
        elements.completedTransfers = document.getElementById("completedTransfers");
        elements.pendingTransfers = document.getElementById("pendingTransfers");
        elements.totalUnitsMoved = document.getElementById("totalUnitsMoved");
        elements.resetButton = document.getElementById("resetTransferBtn") ||
            document.getElementById("resetTransferButton");
    }

    function connectEvents() {
        elements.transferForm.addEventListener("submit", handleTransferSubmit);

        elements.transferForm.addEventListener("reset", function () {
            window.setTimeout(applyTransferDefaults, 0);
        });

        if (elements.resetButton) {
            elements.resetButton.addEventListener("click", resetTransferForm);
        }

        if (elements.fromBranch) {
            elements.fromBranch.addEventListener("change", function () {
                populateProductDropdown();
                updateAvailableStock();
                validateDifferentBranches(false);
            });
        }

        if (elements.toBranch) {
            elements.toBranch.addEventListener("change", function () {
                validateDifferentBranches(true);
            });
        }

        if (elements.transferProduct) {
            elements.transferProduct.addEventListener("change", updateAvailableStock);
        }

        if (elements.transferSearch) {
            elements.transferSearch.addEventListener("input", displayTransfers);
        }

        if (elements.transferStatusFilter) {
            elements.transferStatusFilter.addEventListener("change", displayTransfers);
        }

        if (elements.transferDateFilter) {
            elements.transferDateFilter.addEventListener("change", displayTransfers);
        }

        document.addEventListener("jufelix:data-updated", function (event) {
            const key = event && event.detail ? event.detail.key : "";
            if (!key || [PRODUCTS_KEY, BRANCHES_KEY, TRANSFERS_KEY].indexOf(key) !== -1) {
                refreshTransfers();
            }
        });

        window.addEventListener("storage", function (event) {
            if ([PRODUCTS_KEY, BRANCHES_KEY, TRANSFERS_KEY].indexOf(event.key) !== -1) {
                refreshTransfers();
            }
        });
    }

    function loadData() {
        products = readStoredArray(PRODUCTS_KEY);
        branches = readStoredArray(BRANCHES_KEY);
        transfers = readStoredArray(TRANSFERS_KEY);
    }

    function ensureHeadOffice() {
        let found = false;

        branches = branches.map(function (branch) {
            const isHeadOffice = branch.isHeadOffice === true ||
                String(branch.type || "").toLowerCase() === "head-office" ||
                String(branch.id || "").toLowerCase() === DEFAULT_BRANCH_ID;

            if (!isHeadOffice) {
                return branch;
            }

            if (found) {
                return null;
            }

            found = true;

            return Object.assign({}, branch, {
                id: DEFAULT_BRANCH_ID,
                branchName: branch.branchName || branch.name || "Head Office",
                name: branch.name || branch.branchName || "Head Office",
                code: branch.code || "HO",
                type: "head-office",
                isHeadOffice: true,
                status: branch.status || "active"
            });
        }).filter(Boolean);

        if (!found) {
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

    function migrateProductsToBranchStock() {
        let changed = false;

        products = products.map(function (product) {
            const item = Object.assign({}, product);

            if (!item.branchStock || typeof item.branchStock !== "object" || Array.isArray(item.branchStock)) {
                item.branchStock = {};
                item.branchStock[DEFAULT_BRANCH_ID] = toNumber(item.quantity);
                changed = true;
            }

            if (item.branchStock[DEFAULT_BRANCH_ID] === undefined && toNumber(item.quantity) > 0) {
                item.branchStock[DEFAULT_BRANCH_ID] = toNumber(item.quantity);
                changed = true;
            }

            item.quantity = sumBranchStock(item.branchStock);
            return item;
        });

        if (changed) {
            saveStoredArray(PRODUCTS_KEY, products);
        }
    }

    function populateBranchDropdowns() {
        const activeBranches = branches
            .filter(function (branch) {
                return String(branch.status || "active").toLowerCase() === "active";
            })
            .sort(function (a, b) {
                return getBranchName(a).localeCompare(getBranchName(b));
            });

        const options = activeBranches.map(function (branch) {
            return '<option value="' + escapeHTML(branch.id) + '">' +
                escapeHTML(getBranchName(branch)) +
                "</option>";
        }).join("");

        elements.fromBranch.innerHTML = '<option value="">Select source branch</option>' + options;
        elements.toBranch.innerHTML = '<option value="">Select destination branch</option>' + options;
    }

    function populateProductDropdown() {
        const sourceBranchId = elements.fromBranch.value;
        elements.transferProduct.innerHTML = '<option value="">Select product</option>';
        elements.availableTransferStock.value = "";

        if (!sourceBranchId) {
            return;
        }

        products = readStoredArray(PRODUCTS_KEY);

        const availableProducts = products
            .filter(function (product) {
                const active = String(product.status || "active").toLowerCase() !== "inactive";
                return active && getBranchStock(product, sourceBranchId) > 0;
            })
            .sort(function (a, b) {
                return String(a.name || "").localeCompare(String(b.name || ""));
            });

        if (availableProducts.length === 0) {
            elements.transferProduct.innerHTML = '<option value="">No products with stock in this branch</option>';
            return;
        }

        elements.transferProduct.innerHTML = '<option value="">Select product</option>' +
            availableProducts.map(function (product) {
                const stock = getBranchStock(product, sourceBranchId);
                const unit = product.unit ? " " + product.unit : "";
                return '<option value="' + escapeHTML(product.id) + '">' +
                    escapeHTML(product.name || "Unnamed Product") +
                    " — " + formatNumber(stock) + escapeHTML(unit) +
                    "</option>";
            }).join("");
    }

    function updateAvailableStock() {
        const product = getProductById(elements.transferProduct.value);
        const branchId = elements.fromBranch.value;
        const stock = product && branchId ? getBranchStock(product, branchId) : 0;

        elements.availableTransferStock.value = product && branchId
            ? formatNumber(stock) + (product.unit ? " " + product.unit : "")
            : "";

        elements.transferQuantity.max = stock > 0 ? String(stock) : "";
    }

    function validateDifferentBranches(showMessage) {
        const fromId = elements.fromBranch.value;
        const toId = elements.toBranch.value;

        if (fromId && toId && fromId === toId) {
            if (showMessage !== false) {
                showMessageBox("Source and destination branches must be different.", "error");
            }
            elements.toBranch.value = "";
            return false;
        }

        return true;
    }

    function handleTransferSubmit(event) {
        event.preventDefault();

        try {
            loadData();
            ensureHeadOffice();
            migrateProductsToBranchStock();

            const fromBranchId = elements.fromBranch.value;
            const toBranchId = elements.toBranch.value;
            const productId = elements.transferProduct.value;
            const quantity = toNumber(elements.transferQuantity.value);
            const status = String(elements.transferStatus.value || "completed").toLowerCase();

            if (!elements.transferDate.value) {
                throw new Error("Select the transfer date.");
            }

            if (!fromBranchId) {
                throw new Error("Select the source branch.");
            }

            if (!toBranchId) {
                throw new Error("Select the destination branch.");
            }

            if (!validateDifferentBranches(false)) {
                throw new Error("Source and destination branches must be different.");
            }

            if (!productId) {
                throw new Error("Select a product.");
            }

            if (!Number.isFinite(quantity) || quantity <= 0) {
                throw new Error("Enter a valid quantity greater than zero.");
            }

            const sourceBranch = getBranchById(fromBranchId);
            const destinationBranch = getBranchById(toBranchId);
            const productIndex = products.findIndex(function (product) {
                return String(product.id) === String(productId);
            });

            if (!sourceBranch || !destinationBranch) {
                throw new Error("One of the selected branches could not be found.");
            }

            if (productIndex === -1) {
                throw new Error("The selected product could not be found.");
            }

            const product = Object.assign({}, products[productIndex]);
            product.branchStock = Object.assign({}, product.branchStock || {});

            const availableStock = getBranchStock(product, fromBranchId);

            if (quantity > availableStock) {
                throw new Error(
                    "Insufficient stock. Available: " +
                    formatNumber(availableStock) +
                    (product.unit ? " " + product.unit : "")
                );
            }

            const transferNumber = generateTransferNumber();
            const now = new Date();

            const transfer = {
                id: transferNumber,
                transferNumber: transferNumber,
                transferDate: elements.transferDate.value,
                date: elements.transferDate.value,
                fromBranchId: String(fromBranchId),
                fromBranchName: getBranchName(sourceBranch),
                toBranchId: String(toBranchId),
                toBranchName: getBranchName(destinationBranch),
                productId: String(product.id),
                productName: product.name || "Unnamed Product",
                quantity: quantity,
                unit: product.unit || "",
                status: status,
                notes: elements.transferNotes.value.trim(),
                createdBy: getCurrentUserName(),
                createdAt: now.toISOString(),
                completedAt: status === "completed" ? now.toISOString() : ""
            };

            if (status === "completed") {
                product.branchStock[fromBranchId] = availableStock - quantity;
                product.branchStock[toBranchId] = getBranchStock(product, toBranchId) + quantity;
                product.quantity = sumBranchStock(product.branchStock);
                product.updatedAt = now.toISOString();
                products[productIndex] = product;

                if (!saveStoredArray(PRODUCTS_KEY, products)) {
                    throw new Error("The inventory could not be updated.");
                }
            }

            transfers.push(transfer);

            if (!saveStoredArray(TRANSFERS_KEY, transfers)) {
                throw new Error("The transfer record could not be saved.");
            }

            dispatchDataUpdated(PRODUCTS_KEY, products);
            dispatchDataUpdated(TRANSFERS_KEY, transfers);

            showMessageBox(
                status === "completed"
                    ? "Stock transfer completed successfully."
                    : "Pending transfer saved successfully.",
                "success"
            );

            resetTransferForm();
            refreshTransfers();
        } catch (error) {
            console.error("Transfer save error:", error);
            showMessageBox(error.message || "Unable to save the transfer.", "error");
        }
    }

    function refreshTransfers() {
        loadData();
        ensureHeadOffice();
        migrateProductsToBranchStock();
        updateSummary();
        displayTransfers();

        if (elements.fromBranch.value) {
            const selectedProductId = elements.transferProduct.value;
            populateProductDropdown();
            if (selectedProductId) {
                elements.transferProduct.value = selectedProductId;
            }
            updateAvailableStock();
        }
    }

    function updateSummary() {
        const completed = transfers.filter(function (transfer) {
            return String(transfer.status || "completed").toLowerCase() === "completed";
        });

        const pending = transfers.filter(function (transfer) {
            return String(transfer.status || "").toLowerCase() === "pending";
        });

        const unitsMoved = completed.reduce(function (total, transfer) {
            return total + toNumber(transfer.quantity);
        }, 0);

        setText(elements.totalTransfers, transfers.length);
        setText(elements.completedTransfers, completed.length);
        setText(elements.pendingTransfers, pending.length);
        setText(elements.totalUnitsMoved, formatNumber(unitsMoved));
    }

    function displayTransfers() {
        if (!elements.transferTableBody) {
            return;
        }

        const searchText = String(elements.transferSearch.value || "").trim().toLowerCase();
        const statusFilter = String(elements.transferStatusFilter.value || "").toLowerCase();
        const dateFilter = elements.transferDateFilter.value || "";

        const filtered = transfers
            .filter(function (transfer) {
                const searchable = [
                    transfer.transferNumber || transfer.id,
                    transfer.productName,
                    transfer.fromBranchName,
                    transfer.toBranchName,
                    transfer.notes,
                    transfer.createdBy
                ].join(" ").toLowerCase();

                const transferStatus = String(transfer.status || "completed").toLowerCase();
                const transferDate = getTransferDate(transfer);

                const matchesSearch = !searchText || searchable.indexOf(searchText) !== -1;
                const matchesStatus = !statusFilter || transferStatus === statusFilter;
                const matchesDate = !dateFilter || transferDate === dateFilter;

                return matchesSearch && matchesStatus && matchesDate;
            })
            .sort(function (a, b) {
                return new Date(b.createdAt || getTransferDate(b) || 0).getTime() -
                    new Date(a.createdAt || getTransferDate(a) || 0).getTime();
            });

        if (filtered.length === 0) {
            elements.transferTableBody.innerHTML =
                '<tr><td colspan="8" class="table-empty">No matching stock transfers found.</td></tr>';
            return;
        }

        elements.transferTableBody.innerHTML = filtered.map(function (transfer) {
            const status = String(transfer.status || "completed").toLowerCase();
            const statusClass = status === "pending" ? "status-pending" : "status-completed";

            return "<tr>" +
                "<td><strong>" + escapeHTML(transfer.transferNumber || transfer.id || "—") + "</strong></td>" +
                "<td>" + escapeHTML(formatDate(getTransferDate(transfer))) + "</td>" +
                "<td>" + escapeHTML(transfer.fromBranchName || getBranchNameById(transfer.fromBranchId)) + "</td>" +
                "<td>" + escapeHTML(transfer.toBranchName || getBranchNameById(transfer.toBranchId)) + "</td>" +
                "<td>" + escapeHTML(transfer.productName || getProductNameById(transfer.productId)) + "</td>" +
                "<td>" + formatNumber(transfer.quantity) +
                    (transfer.unit ? " " + escapeHTML(transfer.unit) : "") + "</td>" +
                '<td><span class="status-badge ' + statusClass + '">' +
                    escapeHTML(capitalize(status)) + "</span></td>" +
                "<td>" + escapeHTML(transfer.notes || "—") + "</td>" +
                "</tr>";
        }).join("");
    }

    function resetTransferForm() {
        elements.transferForm.reset();
        applyTransferDefaults();
    }

    function applyTransferDefaults() {
        elements.transferNumber.value = generateTransferNumber();
        elements.transferDate.value = getLocalDateKey(new Date());
        elements.transferStatus.value = "completed";
        elements.availableTransferStock.value = "";
        elements.transferQuantity.value = "";
        elements.transferNotes.value = "";
        elements.fromBranch.value = "";
        elements.toBranch.value = "";
        elements.transferProduct.innerHTML = '<option value="">Select product</option>';
    }

    function getBranchById(branchId) {
        return branches.find(function (branch) {
            return String(branch.id) === String(branchId);
        }) || null;
    }

    function getProductById(productId) {
        return products.find(function (product) {
            return String(product.id) === String(productId);
        }) || null;
    }

    function getBranchName(branch) {
        return branch ? (branch.branchName || branch.name || "Unnamed Branch") : "Unknown Branch";
    }

    function getBranchNameById(branchId) {
        return getBranchName(getBranchById(branchId));
    }

    function getProductNameById(productId) {
        const product = getProductById(productId);
        return product ? (product.name || "Unnamed Product") : "Unknown Product";
    }

    function getBranchStock(product, branchId) {
        if (!product) {
            return 0;
        }

        if (product.branchStock && typeof product.branchStock === "object" && !Array.isArray(product.branchStock)) {
            return toNumber(product.branchStock[branchId]);
        }

        return String(branchId) === DEFAULT_BRANCH_ID ? toNumber(product.quantity) : 0;
    }

    function sumBranchStock(branchStock) {
        return Object.keys(branchStock || {}).reduce(function (total, key) {
            return total + toNumber(branchStock[key]);
        }, 0);
    }

    function generateTransferNumber() {
        const now = new Date();
        const datePart = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, "0") +
            String(now.getDate()).padStart(2, "0");

        const existingToday = transfers.filter(function (transfer) {
            return String(transfer.transferNumber || transfer.id || "").indexOf("TRF-" + datePart) === 0;
        }).length + 1;

        return "TRF-" + datePart + "-" + String(existingToday).padStart(4, "0");
    }

    function getCurrentUserName() {
        const currentUser = readStoredObject(CURRENT_USER_KEY) || readStoredObject("currentUser");
        return currentUser
            ? (currentUser.fullName || currentUser.name || currentUser.username || "System")
            : "System";
    }

    function readStoredArray(storageKey) {
        try {
            const saved = localStorage.getItem(storageKey);
            if (!saved) {
                return [];
            }
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error("Unable to read:", storageKey, error);
            return [];
        }
    }

    function readStoredObject(storageKey) {
        try {
            const saved = localStorage.getItem(storageKey);
            if (!saved) {
                return null;
            }
            const parsed = JSON.parse(saved);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function saveStoredArray(storageKey, value) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error("Unable to save:", storageKey, error);
            return false;
        }
    }

    function dispatchDataUpdated(key, value) {
        document.dispatchEvent(new CustomEvent("jufelix:data-updated", {
            detail: { key: key, value: value }
        }));

        document.dispatchEvent(new CustomEvent("jufelix:dataChanged", {
            detail: { module: "transfers", key: key }
        }));
    }

    function getTransferDate(transfer) {
        return transfer.transferDate || transfer.date || transfer.createdAt || "";
    }

    function getLocalDateKey(date) {
        return date.getFullYear() + "-" +
            String(date.getMonth() + 1).padStart(2, "0") + "-" +
            String(date.getDate()).padStart(2, "0");
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
            ? String(value)
            : getLocalDateKey(new Date(value));

        const date = new Date(dateKey + "T00:00:00");
        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleDateString("en-GH", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("en-GH").format(toNumber(value));
    }

    function toNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
    }

    function capitalize(value) {
        const text = String(value || "");
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function setText(element, value) {
        if (element) {
            element.textContent = value;
        }
    }

    function escapeHTML(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showMessageBox(message, type) {
        let toast = document.getElementById("jufelixTransferToast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "jufelixTransferToast";
            toast.style.position = "fixed";
            toast.style.right = "18px";
            toast.style.bottom = "18px";
            toast.style.zIndex = "99999";
            toast.style.maxWidth = "360px";
            toast.style.padding = "14px 18px";
            toast.style.borderRadius = "10px";
            toast.style.boxShadow = "0 10px 30px rgba(0,0,0,.22)";
            toast.style.fontWeight = "700";
            toast.style.transition = "opacity .25s ease, transform .25s ease";
            document.body.appendChild(toast);
        }

        const isError = type === "error";
        toast.style.background = isError ? "#dc3545" : "#198754";
        toast.style.color = "#ffffff";
        toast.textContent = message;
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";

        window.clearTimeout(showMessageBox.timer);
        showMessageBox.timer = window.setTimeout(function () {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(12px)";
        }, 3500);
    }

    window.JufelixTransfers = {
        refresh: refreshTransfers,
        resetForm: resetTransferForm,
        getBranchStock: getBranchStock
    };
})();
