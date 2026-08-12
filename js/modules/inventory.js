/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   Multi-Branch Inventory Module

   File:
   js/modules/inventory.js
========================================== */

(function () {
    "use strict";

    const PRODUCTS_KEY =
        "jufelix_products";

    const ACTIVE_BRANCH_KEY =
        "jufelix_v7_active_branch";

    const CURRENT_USER_KEY =
        "jufelix_v7_current_user";

    const DEFAULT_BRANCH_ID =
        "head-office";

    let products = [];
    let editingProductId = null;

    const form =
        document.getElementById(
            "productForm"
        );

    const tableBody =
        document.getElementById(
            "inventoryTableBody"
        );

    const saveButton =
        document.getElementById(
            "saveProductButton"
        );

    const formTitle =
        document.getElementById(
            "productFormTitle"
        );

    const clearButton =
        document.getElementById(
            "cancelProductButton"
        );

    const searchInput =
        document.getElementById(
            "inventorySearch"
        );

    const categoryFilter =
        document.getElementById(
            "inventoryCategoryFilter"
        );

    const stockFilter =
        document.getElementById(
            "inventoryStockFilter"
        );

    const statusFilter =
        document.getElementById(
            "inventoryStatusFilter"
        );

    document.addEventListener(
        "DOMContentLoaded",
        initializeInventory
    );


    function initializeInventory() {
        loadProducts();

        migrateProductsToBranchStock();

        connectEvents();

        resetForm();

        refreshInventory();
    }


    function connectEvents() {
        if (form) {
            form.addEventListener(
                "submit",
                saveProduct
            );
        }

        if (clearButton) {
            clearButton.addEventListener(
                "click",
                resetForm
            );
        }

        if (searchInput) {
            searchInput.addEventListener(
                "input",
                displayProducts
            );
        }

        if (categoryFilter) {
            categoryFilter.addEventListener(
                "change",
                displayProducts
            );
        }

        if (stockFilter) {
            stockFilter.addEventListener(
                "change",
                displayProducts
            );
        }

        if (statusFilter) {
            statusFilter.addEventListener(
                "change",
                displayProducts
            );
        }
    }


    /* ==========================================
       MIGRATE OLD PRODUCTS
    ========================================== */

    function migrateProductsToBranchStock() {
        const activeBranchId =
            getActiveBranchId();

        let changed = false;

        products = products.map(
            function (product) {
                if (
                    !product.branchStock ||
                    typeof product.branchStock !==
                        "object" ||
                    Array.isArray(
                        product.branchStock
                    )
                ) {
                    product.branchStock = {};

                    product.branchStock[
                        activeBranchId
                    ] =
                        toNumber(
                            product.quantity
                        );

                    changed = true;
                }

                product.quantity =
                    calculateTotalStock(
                        product
                    );

                return product;
            }
        );

        if (changed) {
            saveProducts();
        }
    }


    /* ==========================================
       SAVE PRODUCT
    ========================================== */

    function saveProduct(event) {
        event.preventDefault();

        const activeBranchId =
            getActiveBranchId();

        const branchQuantity =
            getNumber(
                "productQuantity"
            );

        const productData = {
            name:
                getValue(
                    "productName"
                ),

            sku:
                getValue(
                    "productSku"
                ),

            barcode:
                getValue(
                    "productBarcode"
                ),

            category:
                getValue(
                    "productCategory"
                ),

            brand:
                getValue(
                    "productBrand"
                ),

            unit:
                getValue(
                    "productUnit"
                ),

            costPrice:
                getNumber(
                    "productCostPrice"
                ),

            sellingPrice:
                getNumber(
                    "productSellingPrice"
                ),

            lowStock:
                getNumber(
                    "productLowStock"
                ),

            lowStockLevel:
                getNumber(
                    "productLowStock"
                ),

            tax:
                getNumber(
                    "productTax"
                ),

            status:
                getValue(
                    "productStatus"
                ) || "active",

            description:
                getValue(
                    "productDescription"
                )
        };

        if (!productData.name) {
            alert(
                "Enter the product name."
            );

            return;
        }

        if (!productData.category) {
            alert(
                "Enter the product category."
            );

            return;
        }

        if (!productData.unit) {
            alert(
                "Select the product unit."
            );

            return;
        }

        if (
            productData.costPrice < 0 ||
            productData.sellingPrice < 0 ||
            branchQuantity < 0
        ) {
            alert(
                "Prices and quantities cannot be negative."
            );

            return;
        }

        const duplicateSku =
            products.find(
                function (product) {
                    return (
                        String(product.id) !==
                            String(
                                editingProductId
                            ) &&
                        productData.sku &&
                        String(
                            product.sku || ""
                        )
                            .trim()
                            .toLowerCase() ===
                            productData.sku
                                .toLowerCase()
                    );
                }
            );

        if (duplicateSku) {
            alert(
                "Another product already uses this SKU."
            );

            return;
        }

        const wasEditing =
            editingProductId !== null;

        if (wasEditing) {
            updateProduct(
                productData,
                branchQuantity,
                activeBranchId
            );
        } else {
            createProduct(
                productData,
                branchQuantity,
                activeBranchId
            );
        }

        saveProducts();

        resetForm();

        refreshInventory();

        alert(
            wasEditing
                ? "Product updated successfully."
                : "Product saved successfully."
        );
    }


    function createProduct(
        productData,
        branchQuantity,
        branchId
    ) {
        const currentTime =
            new Date().toISOString();

        const branchStock = {};

        branchStock[branchId] =
            branchQuantity;

        const newProduct = {
            id:
                "prd-" +
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2, 7),

            ...productData,

            sku:
                productData.sku ||
                generateSku(),

            branchStock:
                branchStock,

            quantity:
                branchQuantity,

            createdAt:
                currentTime,

            updatedAt:
                currentTime
        };

        products.push(newProduct);
    }


    function updateProduct(
        productData,
        branchQuantity,
        branchId
    ) {
        const productIndex =
            products.findIndex(
                function (product) {
                    return (
                        String(product.id) ===
                        String(
                            editingProductId
                        )
                    );
                }
            );

        if (productIndex === -1) {
            alert(
                "Product not found."
            );

            return;
        }

        const existingProduct =
            products[productIndex];

        const branchStock = {
            ...(
                existingProduct
                    .branchStock ||
                {}
            )
        };

        branchStock[branchId] =
            branchQuantity;

        products[productIndex] = {
            ...existingProduct,

            ...productData,

            id:
                existingProduct.id,

            branchStock:
                branchStock,

            quantity:
                sumBranchStock(
                    branchStock
                ),

            createdAt:
                existingProduct
                    .createdAt,

            updatedAt:
                new Date().toISOString()
        };
    }


    /* ==========================================
       EDIT PRODUCT
    ========================================== */

    function editProduct(productId) {
        const product =
            products.find(
                function (item) {
                    return (
                        String(item.id) ===
                        String(productId)
                    );
                }
            );

        if (!product) {
            alert(
                "Product not found."
            );

            return;
        }

        const activeBranchId =
            getActiveBranchId();

        editingProductId =
            product.id;

        setValue(
            "productId",
            product.id
        );

        setValue(
            "productName",
            product.name
        );

        setValue(
            "productSku",
            product.sku
        );

        setValue(
            "productBarcode",
            product.barcode
        );

        setValue(
            "productCategory",
            product.category
        );

        setValue(
            "productBrand",
            product.brand
        );

        setValue(
            "productUnit",
            product.unit
        );

        setValue(
            "productCostPrice",
            product.costPrice
        );

        setValue(
            "productSellingPrice",
            product.sellingPrice
        );

        setValue(
            "productQuantity",
            getBranchStock(
                product,
                activeBranchId
            )
        );

        setValue(
            "productLowStock",
            product.lowStockLevel ??
            product.lowStock ??
            5
        );

        setValue(
            "productTax",
            product.tax || 0
        );

        setValue(
            "productStatus",
            product.status ||
            "active"
        );

        setValue(
            "productDescription",
            product.description
        );

        if (formTitle) {
            formTitle.textContent =
                "Edit Product";
        }

        if (saveButton) {
            saveButton.textContent =
                "Update Product";
        }

        if (form) {
            form.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    }


    /* ==========================================
       DELETE PRODUCT
    ========================================== */

    function deleteProduct(productId) {
        const product =
            products.find(
                function (item) {
                    return (
                        String(item.id) ===
                        String(productId)
                    );
                }
            );

        if (!product) {
            alert(
                "Product not found."
            );

            return;
        }

        const confirmed =
            confirm(
                `Delete "${product.name}" permanently?`
            );

        if (!confirmed) {
            return;
        }

        products =
            products.filter(
                function (item) {
                    return (
                        String(item.id) !==
                        String(productId)
                    );
                }
            );

        saveProducts();

        if (
            String(editingProductId) ===
            String(productId)
        ) {
            resetForm();
        }

        refreshInventory();

        alert(
            "Product deleted successfully."
        );
    }


    /* ==========================================
       DISPLAY PRODUCTS
    ========================================== */

    function displayProducts() {
        if (!tableBody) {
            return;
        }

        const activeBranchId =
            getActiveBranchId();

        const searchTerm =
            searchInput
                ? searchInput.value
                    .trim()
                    .toLowerCase()
                : "";

        const selectedCategory =
            categoryFilter
                ? categoryFilter.value
                : "";

        const selectedStock =
            stockFilter
                ? stockFilter.value
                : "";

        const selectedStatus =
            statusFilter
                ? statusFilter.value
                : "";

        const filteredProducts =
            products.filter(
                function (product) {
                    const branchQuantity =
                        getBranchStock(
                            product,
                            activeBranchId
                        );

                    const lowStock =
                        getLowStockLevel(
                            product
                        );

                    const searchableText = [
                        product.name,
                        product.category,
                        product.brand,
                        product.sku,
                        product.barcode
                    ]
                        .join(" ")
                        .toLowerCase();

                    const matchesSearch =
                        !searchTerm ||
                        searchableText.includes(
                            searchTerm
                        );

                    const matchesCategory =
                        !selectedCategory ||
                        String(
                            product.category ||
                            ""
                        ) ===
                            selectedCategory;

                    const matchesStatus =
                        !selectedStatus ||
                        String(
                            product.status ||
                            "active"
                        ).toLowerCase() ===
                            selectedStatus;

                    let matchesStock = true;

                    if (
                        selectedStock ===
                        "out"
                    ) {
                        matchesStock =
                            branchQuantity <= 0;
                    }

                    if (
                        selectedStock ===
                        "low"
                    ) {
                        matchesStock =
                            branchQuantity > 0 &&
                            branchQuantity <=
                                lowStock;
                    }

                    if (
                        selectedStock ===
                        "available"
                    ) {
                        matchesStock =
                            branchQuantity >
                            lowStock;
                    }

                    return (
                        matchesSearch &&
                        matchesCategory &&
                        matchesStatus &&
                        matchesStock
                    );
                }
            );

        if (
            filteredProducts.length === 0
        ) {
            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="table-empty"
                    >
                        No products available for this branch.
                    </td>
                </tr>
            `;

            return;
        }

        tableBody.innerHTML =
            filteredProducts
                .map(
                    function (product) {
                        return createProductRow(
                            product,
                            activeBranchId
                        );
                    }
                )
                .join("");
    }


    function createProductRow(
        product,
        branchId
    ) {
        const branchQuantity =
            getBranchStock(
                product,
                branchId
            );

        const lowStock =
            getLowStockLevel(
                product
            );

        let stockStatus =
            "Available";

        let stockClass =
            "stock-good";

        if (branchQuantity <= 0) {
            stockStatus =
                "Out of Stock";

            stockClass =
                "stock-out";
        } else if (
            branchQuantity <=
            lowStock
        ) {
            stockStatus =
                "Low Stock";

            stockClass =
                "stock-low";
        }

        return `
            <tr>

                <td>
                    <div class="product-cell">

                        <div class="product-thumbnail-fallback">
                            📦
                        </div>

                        <div>

                            <div class="product-name">
                                ${escapeHTML(
                                    product.name
                                )}
                            </div>

                            <div class="product-sku">
                                SKU:
                                ${escapeHTML(
                                    product.sku ||
                                    "No SKU"
                                )}
                            </div>

                        </div>

                    </div>
                </td>

                <td>
                    ${escapeHTML(
                        product.category ||
                        "—"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        product.brand ||
                        "—"
                    )}
                </td>

                <td>
                    ${formatMoney(
                        product.costPrice
                    )}
                </td>

                <td>
                    ${formatMoney(
                        product.sellingPrice
                    )}
                </td>

                <td>
                    ${formatNumber(
                        branchQuantity
                    )}
                    ${escapeHTML(
                        product.unit || ""
                    )}
                </td>

                <td>
                    <span class="stock-status ${stockClass}">
                        ${stockStatus}
                    </span>
                </td>

                <td>
                    ${
                        String(
                            product.status ||
                            "active"
                        ).toLowerCase() ===
                        "active"
                            ? "Active"
                            : "Inactive"
                    }
                </td>

                <td>

                    <button
                        type="button"
                        class="small-button edit-button"
                        onclick="JufelixInventory.editProduct('${escapeHTML(
                            product.id
                        )}')"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="small-button delete-button"
                        onclick="JufelixInventory.deleteProduct('${escapeHTML(
                            product.id
                        )}')"
                    >
                        Delete
                    </button>

                </td>

            </tr>
        `;
    }


    /* ==========================================
       SUMMARY
    ========================================== */

    function updateInventorySummary() {
        const activeBranchId =
            getActiveBranchId();

        const totalProducts =
            products.length;

        const totalBranchQuantity =
            products.reduce(
                function (
                    total,
                    product
                ) {
                    return (
                        total +
                        getBranchStock(
                            product,
                            activeBranchId
                        )
                    );
                },
                0
            );

        const stockValue =
            products.reduce(
                function (
                    total,
                    product
                ) {
                    return (
                        total +
                        getBranchStock(
                            product,
                            activeBranchId
                        ) *
                        toNumber(
                            product.costPrice
                        )
                    );
                },
                0
            );

        const lowStockProducts =
            products.filter(
                function (product) {
                    return (
                        getBranchStock(
                            product,
                            activeBranchId
                        ) <=
                        getLowStockLevel(
                            product
                        )
                    );
                }
            ).length;

        setText(
            "inventoryTotalProducts",
            totalProducts
        );

        setText(
            "inventoryTotalQuantity",
            formatNumber(
                totalBranchQuantity
            )
        );

        setText(
            "inventoryStockValue",
            formatMoney(
                stockValue
            )
        );

        setText(
            "inventoryLowStock",
            lowStockProducts
        );
    }


    function updateCategoryFilter() {
        if (!categoryFilter) {
            return;
        }

        const selectedValue =
            categoryFilter.value;

        const categories =
            [
                ...new Set(
                    products
                        .map(
                            function (
                                product
                            ) {
                                return String(
                                    product.category ||
                                    ""
                                ).trim();
                            }
                        )
                        .filter(Boolean)
                )
            ].sort();

        categoryFilter.innerHTML = `
            <option value="">
                All Categories
            </option>

            ${categories
                .map(
                    function (
                        category
                    ) {
                        return `
                            <option value="${escapeHTML(
                                category
                            )}">
                                ${escapeHTML(
                                    category
                                )}
                            </option>
                        `;
                    }
                )
                .join("")}
        `;

        if (
            categories.includes(
                selectedValue
            )
        ) {
            categoryFilter.value =
                selectedValue;
        }
    }


    function refreshInventory() {
        updateInventorySummary();
        updateCategoryFilter();
        displayProducts();
    }


    /* ==========================================
       BRANCH STOCK HELPERS
    ========================================== */

    function getBranchStock(
        product,
        branchId
    ) {
        if (
            product.branchStock &&
            typeof product.branchStock ===
                "object"
        ) {
            return toNumber(
                product.branchStock[
                    branchId
                ]
            );
        }

        return 0;
    }


    function calculateTotalStock(
        product
    ) {
        return sumBranchStock(
            product.branchStock ||
            {}
        );
    }


    function sumBranchStock(
        branchStock
    ) {
        return Object.values(
            branchStock
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


    function getLowStockLevel(
        product
    ) {
        return toNumber(
            product.lowStockLevel ??
            product.lowStock ??
            5
        );
    }


    /* ==========================================
       RESET
    ========================================== */

    function resetForm() {
        editingProductId = null;

        if (form) {
            form.reset();
        }

        setValue(
            "productId",
            ""
        );

        setValue(
            "productLowStock",
            5
        );

        setValue(
            "productTax",
            0
        );

        setValue(
            "productStatus",
            "active"
        );

        if (formTitle) {
            formTitle.textContent =
                "Add New Product";
        }

        if (saveButton) {
            saveButton.textContent =
                "Save Product";
        }
    }


    /* ==========================================
       STORAGE
    ========================================== */

    function loadProducts() {
        try {
            const savedProducts =
                localStorage.getItem(
                    PRODUCTS_KEY
                );

            if (!savedProducts) {
                products = [];
                return;
            }

            const parsedProducts =
                JSON.parse(
                    savedProducts
                );

            products =
                Array.isArray(
                    parsedProducts
                )
                    ? parsedProducts
                    : [];
        } catch (error) {
            console.error(
                "Unable to load products:",
                error
            );

            products = [];
        }
    }


    function saveProducts() {
        products =
            products.map(
                function (product) {
                    return {
                        ...product,

                        quantity:
                            calculateTotalStock(
                                product
                            )
                    };
                }
            );

        localStorage.setItem(
            PRODUCTS_KEY,
            JSON.stringify(products)
        );

        document.dispatchEvent(
            new CustomEvent(
                "jufelix:data-updated",
                {
                    detail: {
                        key:
                            PRODUCTS_KEY,

                        value:
                            products
                    }
                }
            )
        );
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

    function getValue(id) {
        const element =
            document.getElementById(id);

        return element
            ? String(
                element.value || ""
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
            document.getElementById(id);

        if (element) {
            element.value =
                value === undefined ||
                value === null
                    ? ""
                    : value;
        }
    }


    function setText(
        id,
        value
    ) {
        const element =
            document.getElementById(id);

        if (element) {
            element.textContent =
                value;
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


    function formatMoney(value) {
        return new Intl.NumberFormat(
            "en-GH",
            {
                style: "currency",
                currency: "GHS",
                minimumFractionDigits: 2
            }
        ).format(
            toNumber(value)
        );
    }


    function formatNumber(value) {
        return new Intl.NumberFormat(
            "en-GH"
        ).format(
            toNumber(value)
        );
    }


    function generateSku() {
        return (
            "PRD-" +
            Math.floor(
                1000 +
                Math.random() *
                9000
            )
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


    window.JufelixInventory = {
        editProduct:
            editProduct,

        deleteProduct:
            deleteProduct,

        refresh:
            refreshInventory,

        resetForm:
            resetForm,

        getBranchStock:
            getBranchStock
    };

})();