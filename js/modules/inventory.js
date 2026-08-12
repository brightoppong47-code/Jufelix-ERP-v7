/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   Multi-Branch Inventory Module

   File:
   js/modules/inventory.js
========================================== */

(function () {
    "use strict";

    const PRODUCTS_KEY = "jufelix_products";
    const ACTIVE_BRANCH_KEY = "jufelix_v7_active_branch";
    const CURRENT_USER_KEY = "jufelix_v7_current_user";
    const DEFAULT_BRANCH_ID = "head-office";

    let products = [];
    let editingProductId = null;
    let productImageData = "";

    const form = document.getElementById("productForm");
    const tableBody = document.getElementById("inventoryTableBody");
    const saveButton = document.getElementById("saveProductButton");
    const formTitle = document.getElementById("productFormTitle");
    const clearButton = document.getElementById("cancelProductButton");

    const searchInput = document.getElementById("inventorySearch");
    const categoryFilter = document.getElementById(
        "inventoryCategoryFilter"
    );
    const stockFilter = document.getElementById(
        "inventoryStockFilter"
    );
    const statusFilter = document.getElementById(
        "inventoryStatusFilter"
    );

    const productCategory =
        document.getElementById(
            "productCategory"
        );

    const customCategoryGroup =
        document.getElementById(
            "customCategoryGroup"
        );

    const customProductCategory =
        document.getElementById(
            "customProductCategory"
        );

    const productImageInput =
        document.getElementById(
            "productImage"
        );

    const productImagePreview =
        document.getElementById(
            "productImagePreview"
        );

    const productImagePreviewContainer =
        document.getElementById(
            "productImagePreviewContainer"
        );

    const removeProductImageButton =
        document.getElementById(
            "removeProductImageButton"
        );


    /* ==========================================
       START
    ========================================== */

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeInventory
        );
    } else {
        initializeInventory();
    }


    function initializeInventory() {
        loadProducts();

        migrateProductsToBranchStock();

        connectEvents();

        resetForm();

        refreshInventory();

        console.log(
            "Jufelix Inventory loaded successfully."
        );
    }


    /* ==========================================
       EVENTS
    ========================================== */

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

        if (productCategory) {
            productCategory.addEventListener(
                "change",
                handleCategoryChange
            );
        }

        if (productImageInput) {
            productImageInput.addEventListener(
                "change",
                handleProductImage
            );
        }

        if (removeProductImageButton) {
            removeProductImageButton.addEventListener(
                "click",
                removeProductImage
            );
        }
    }


    /* ==========================================
       CATEGORY
    ========================================== */

    function handleCategoryChange() {

        if (
            !productCategory ||
            !customCategoryGroup ||
            !customProductCategory
        ) {
            return;
        }

        const isOther =
            productCategory.value === "Other";

        customCategoryGroup.style.display =
            isOther
                ? "block"
                : "none";

        customProductCategory.required =
            isOther;

        if (!isOther) {
            customProductCategory.value =
                "";
        }
    }


    function getSelectedCategory() {

        const selected =
            getValue(
                "productCategory"
            );

        if (selected === "Other") {
            return getValue(
                "customProductCategory"
            );
        }

        return selected;
    }


    function setCategoryValue(
        category
    ) {

        if (!productCategory) {
            return;
        }

        const categoryValue =
            String(
                category || ""
            ).trim();

        const options =
            Array.from(
                productCategory.options
            );

        const optionExists =
            options.some(
                function (option) {
                    return (
                        option.value ===
                        categoryValue
                    );
                }
            );

        if (
            categoryValue &&
            optionExists
        ) {

            productCategory.value =
                categoryValue;

            if (
                customCategoryGroup
            ) {
                customCategoryGroup
                    .style.display =
                    "none";
            }

            if (
                customProductCategory
            ) {
                customProductCategory
                    .required =
                    false;

                customProductCategory
                    .value =
                    "";
            }

            return;
        }


        if (categoryValue) {

            productCategory.value =
                "Other";

            if (
                customCategoryGroup
            ) {
                customCategoryGroup
                    .style.display =
                    "block";
            }

            if (
                customProductCategory
            ) {
                customProductCategory
                    .required =
                    true;

                customProductCategory
                    .value =
                    categoryValue;
            }

            return;
        }


        productCategory.value =
            "";

        if (customCategoryGroup) {
            customCategoryGroup.style.display =
                "none";
        }

        if (customProductCategory) {
            customProductCategory.required =
                false;

            customProductCategory.value =
                "";
        }
    }


    /* ==========================================
       PRODUCT IMAGE
    ========================================== */

    function handleProductImage(
        event
    ) {

        const file =
            event.target.files &&
            event.target.files[0];

        if (!file) {
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (
            !allowedTypes.includes(
                file.type
            )
        ) {
            alert(
                "Please select a JPG, PNG or WebP image."
            );

            if (productImageInput) {
                productImageInput.value =
                    "";
            }

            return;
        }

        if (
            file.size >
            10 * 1024 * 1024
        ) {
            alert(
                "The selected image is too large. Please choose an image below 10 MB."
            );

            if (productImageInput) {
                productImageInput.value =
                    "";
            }

            return;
        }

        compressProductImage(
            file
        )
            .then(
                function (
                    compressedImage
                ) {

                    productImageData =
                        compressedImage;

                    showProductImagePreview(
                        productImageData
                    );
                }
            )
            .catch(
                function (error) {

                    console.error(
                        "Image processing failed:",
                        error
                    );

                    alert(
                        "Unable to process this image. Please try another image."
                    );

                    productImageData =
                        "";

                    if (
                        productImageInput
                    ) {
                        productImageInput.value =
                            "";
                    }

                    showProductImagePreview(
                        ""
                    );
                }
            );
    }


    function compressProductImage(
        file
    ) {

        return new Promise(
            function (
                resolve,
                reject
            ) {

                const reader =
                    new FileReader();

                reader.onerror =
                    function () {

                        reject(
                            new Error(
                                "Unable to read image."
                            )
                        );
                    };

                reader.onload =
                    function () {

                        const image =
                            new Image();

                        image.onerror =
                            function () {

                                reject(
                                    new Error(
                                        "Unable to load image."
                                    )
                                );
                            };

                        image.onload =
                            function () {

                                try {

                                    const MAX_SIZE =
                                        700;

                                    let width =
                                        image.naturalWidth ||
                                        image.width;

                                    let height =
                                        image.naturalHeight ||
                                        image.height;

                                    if (
                                        width >
                                            MAX_SIZE ||
                                        height >
                                            MAX_SIZE
                                    ) {

                                        const ratio =
                                            Math.min(
                                                MAX_SIZE /
                                                    width,
                                                MAX_SIZE /
                                                    height
                                            );

                                        width =
                                            Math.round(
                                                width *
                                                    ratio
                                            );

                                        height =
                                            Math.round(
                                                height *
                                                    ratio
                                            );
                                    }

                                    const canvas =
                                        document
                                            .createElement(
                                                "canvas"
                                            );

                                    canvas.width =
                                        width;

                                    canvas.height =
                                        height;

                                    const context =
                                        canvas.getContext(
                                            "2d"
                                        );

                                    if (
                                        !context
                                    ) {

                                        reject(
                                            new Error(
                                                "Canvas is unavailable."
                                            )
                                        );

                                        return;
                                    }

                                    context.drawImage(
                                        image,
                                        0,
                                        0,
                                        width,
                                        height
                                    );

                                    const compressed =
                                        canvas.toDataURL(
                                            "image/jpeg",
                                            0.72
                                        );

                                    resolve(
                                        compressed
                                    );

                                } catch (
                                    error
                                ) {
                                    reject(
                                        error
                                    );
                                }
                            };

                        image.src =
                            reader.result;
                    };

                reader.readAsDataURL(
                    file
                );
            }
        );
    }


    function showProductImagePreview(
        imageSource
    ) {

        if (
            !productImagePreview ||
            !productImagePreviewContainer
        ) {
            return;
        }

        if (!imageSource) {

            productImagePreview
                .removeAttribute(
                    "src"
                );

            productImagePreviewContainer
                .style.display =
                "none";

            return;
        }

        productImagePreview.src =
            imageSource;

        productImagePreviewContainer
            .style.display =
            "block";
    }


    function removeProductImage() {

        productImageData =
            "";

        if (productImageInput) {
            productImageInput.value =
                "";
        }

        showProductImagePreview(
            ""
        );
    }


    /* ==========================================
       MIGRATE OLD PRODUCTS
    ========================================== */

    function migrateProductsToBranchStock() {

        const activeBranchId =
            getActiveBranchId();

        let changed =
            false;

        products =
            products.map(
                function (
                    product
                ) {

                    if (
                        !product.branchStock ||
                        typeof product.branchStock !==
                            "object" ||
                        Array.isArray(
                            product.branchStock
                        )
                    ) {

                        product.branchStock =
                            {};

                        product.branchStock[
                            activeBranchId
                        ] =
                            toNumber(
                                product.quantity
                            );

                        changed =
                            true;
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

    function saveProduct(
        event
    ) {

        event.preventDefault();

        if (
            saveButton &&
            saveButton.disabled
        ) {
            return;
        }

        const activeBranchId =
            getActiveBranchId();

        const branchQuantity =
            getNumber(
                "productQuantity"
            );

        const category =
            getSelectedCategory();

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
                category,

            brand:
                getValue(
                    "productBrand"
                ),

            image:
                productImageData ||
                "",

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
                ) ||
                "active",

            description:
                getValue(
                    "productDescription"
                )
        };


        /* ======================================
           VALIDATION
        ====================================== */

        if (
            !productData.name
        ) {
            alert(
                "Enter the product name."
            );

            return;
        }

        if (
            !productData.category
        ) {
            alert(
                "Select or enter a product category."
            );

            return;
        }

        if (
            !productData.unit
        ) {
            alert(
                "Select the product unit."
            );

            return;
        }

        if (
            productData.costPrice <
                0 ||
            productData.sellingPrice <
                0 ||
            branchQuantity <
                0
        ) {

            alert(
                "Prices and quantities cannot be negative."
            );

            return;
        }


        /* ======================================
           DUPLICATE SKU
        ====================================== */

        const duplicateSku =
            products.find(
                function (
                    product
                ) {

                    return (
                        String(
                            product.id
                        ) !==
                            String(
                                editingProductId
                            ) &&
                        productData.sku &&
                        String(
                            product.sku ||
                            ""
                        )
                            .trim()
                            .toLowerCase() ===
                            productData.sku
                                .trim()
                                .toLowerCase()
                    );
                }
            );

        if (
            duplicateSku
        ) {

            alert(
                "Another product already uses this SKU."
            );

            return;
        }


        const wasEditing =
            editingProductId !==
            null;

        try {

            if (
                saveButton
            ) {

                saveButton.disabled =
                    true;

                saveButton.textContent =
                    wasEditing
                        ? "Updating..."
                        : "Saving...";
            }


            if (
                wasEditing
            ) {

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

        } catch (
            error
        ) {

            console.error(
                "Unable to save product:",
                error
            );

            alert(
                "Unable to save product. " +
                (
                    error &&
                    error.message
                        ? error.message
                        : ""
                )
            );

        } finally {

            if (
                saveButton
            ) {

                saveButton.disabled =
                    false;

                saveButton.textContent =
                    editingProductId
                        ? "Update Product"
                        : "Save Product";
            }
        }
    }


    /* ==========================================
       CREATE PRODUCT
    ========================================== */

    function createProduct(
        productData,
        branchQuantity,
        branchId
    ) {

        const currentTime =
            new Date()
                .toISOString();

        const branchStock =
            {};

        branchStock[
            branchId
        ] =
            branchQuantity;

        const newProduct = {

            id:
                "prd-" +
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(
                        2,
                        7
                    ),

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

        products.push(
            newProduct
        );
    }


    /* ==========================================
       UPDATE PRODUCT
    ========================================== */

    function updateProduct(
        productData,
        branchQuantity,
        branchId
    ) {

        const productIndex =
            products.findIndex(
                function (
                    product
                ) {

                    return (
                        String(
                            product.id
                        ) ===
                        String(
                            editingProductId
                        )
                    );
                }
            );

        if (
            productIndex ===
            -1
        ) {

            throw new Error(
                "Product not found."
            );
        }

        const existingProduct =
            products[
                productIndex
            ];

        const branchStock = {
            ...(
                existingProduct
                    .branchStock ||
                {}
            )
        };

        branchStock[
            branchId
        ] =
            branchQuantity;

        products[
            productIndex
        ] = {

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
                existingProduct.createdAt ||
                new Date()
                    .toISOString(),

            updatedAt:
                new Date()
                    .toISOString()
        };
    }


    /* ==========================================
       EDIT PRODUCT
    ========================================== */

    function editProduct(
        productId
    ) {

        const product =
            products.find(
                function (
                    item
                ) {

                    return (
                        String(
                            item.id
                        ) ===
                        String(
                            productId
                        )
                    );
                }
            );

        if (
            !product
        ) {

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

        setCategoryValue(
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
            product.tax ||
            0
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


        productImageData =
            product.image ||
            "";

        if (
            productImageInput
        ) {
            productImageInput.value =
                "";
        }

        showProductImagePreview(
            productImageData
        );


        if (
            formTitle
        ) {
            formTitle.textContent =
                "Edit Product";
        }

        if (
            saveButton
        ) {
            saveButton.textContent =
                "Update Product";
        }

        if (
            form
        ) {

            form.scrollIntoView({
                behavior:
                    "smooth",

                block:
                    "start"
            });
        }
    }


    /* ==========================================
       DELETE PRODUCT
    ========================================== */

    function deleteProduct(
        productId
    ) {

        const product =
            products.find(
                function (
                    item
                ) {

                    return (
                        String(
                            item.id
                        ) ===
                        String(
                            productId
                        )
                    );
                }
            );

        if (
            !product
        ) {

            alert(
                "Product not found."
            );

            return;
        }

        const confirmed =
            confirm(
                `Delete "${product.name}" permanently?`
            );

        if (
            !confirmed
        ) {
            return;
        }

        products =
            products.filter(
                function (
                    item
                ) {

                    return (
                        String(
                            item.id
                        ) !==
                        String(
                            productId
                        )
                    );
                }
            );

        saveProducts();

        if (
            String(
                editingProductId
            ) ===
            String(
                productId
            )
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

        if (
            !tableBody
        ) {
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
                function (
                    product
                ) {

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
                        searchableText
                            .includes(
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
                        )
                            .toLowerCase() ===
                            selectedStatus;

                    let matchesStock =
                        true;

                    if (
                        selectedStock ===
                        "out"
                    ) {

                        matchesStock =
                            branchQuantity <=
                            0;
                    }

                    if (
                        selectedStock ===
                        "low"
                    ) {

                        matchesStock =
                            branchQuantity >
                                0 &&
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
            filteredProducts.length ===
            0
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
                    function (
                        product
                    ) {

                        return createProductRow(
                            product,
                            activeBranchId
                        );
                    }
                )
                .join("");
    }


    /* ==========================================
       PRODUCT ROW
    ========================================== */

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

        if (
            branchQuantity <=
            0
        ) {

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


        const productImageHTML =
            product.image
                ? `
                    <img
                        src="${escapeHTML(
                            product.image
                        )}"
                        alt="${escapeHTML(
                            product.name
                        )}"
                        style="
                            width:55px;
                            height:55px;
                            object-fit:cover;
                            border-radius:10px;
                            border:1px solid #e1e5eb;
                            flex-shrink:0;
                        "
                    >
                `
                : `
                    <div
                        class="product-thumbnail-fallback"
                    >
                        📦
                    </div>
                `;


        return `
            <tr>

                <td>
                    <div class="product-cell">

                        ${productImageHTML}

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
                        product.unit ||
                        ""
                    )}
                </td>

                <td>
                    <span
                        class="stock-status ${stockClass}"
                    >
                        ${stockStatus}
                    </span>
                </td>

                <td>
                    ${
                        String(
                            product.status ||
                            "active"
                        )
                            .toLowerCase() ===
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
                        (
                            getBranchStock(
                                product,
                                activeBranchId
                            ) *
                            toNumber(
                                product.costPrice
                            )
                        )
                    );
                },
                0
            );

        const lowStockProducts =
            products.filter(
                function (
                    product
                ) {

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


    /* ==========================================
       CATEGORY FILTER
    ========================================== */

    function updateCategoryFilter() {

        if (
            !categoryFilter
        ) {
            return;
        }

        const selectedValue =
            categoryFilter.value;

        const categories = [
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
                    .filter(
                        Boolean
                    )
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
                            <option
                                value="${escapeHTML(
                                    category
                                )}"
                            >
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
       BRANCH STOCK
    ========================================== */

    function getBranchStock(
        product,
        branchId
    ) {

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
                    toNumber(
                        value
                    )
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
       RESET FORM
    ========================================== */

    function resetForm() {

        editingProductId =
            null;

        productImageData =
            "";

        if (
            form
        ) {
            form.reset();
        }

        if (
            productImageInput
        ) {

            productImageInput.value =
                "";
        }

        showProductImagePreview(
            ""
        );

        setCategoryValue(
            ""
        );

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

        if (
            formTitle
        ) {

            formTitle.textContent =
                "Add New Product";
        }

        if (
            saveButton
        ) {

            saveButton.disabled =
                false;

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

            if (
                !savedProducts
            ) {

                products =
                    [];

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

        } catch (
            error
        ) {

            console.error(
                "Unable to load products:",
                error
            );

            products =
                [];
        }
    }


    function saveProducts() {

        products =
            products.map(
                function (
                    product
                ) {

                    return {
                        ...product,

                        quantity:
                            calculateTotalStock(
                                product
                            )
                    };
                }
            );

        try {

            localStorage.setItem(
                PRODUCTS_KEY,
                JSON.stringify(
                    products
                )
            );

        } catch (
            error
        ) {

            console.error(
                "Local inventory save failed:",
                error
            );

            if (
                error &&
                (
                    error.name ===
                        "QuotaExceededError" ||
                    error.name ===
                        "NS_ERROR_DOM_QUOTA_REACHED"
                )
            ) {

                throw new Error(
                    "Phone storage for the app is full. Try a smaller product image."
                );
            }

            throw error;
        }


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

            if (
                !savedData
            ) {

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

        } catch (
            error
        ) {

            return null;
        }
    }


    /* ==========================================
       HELPERS
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


    function getNumber(
        id
    ) {

        return toNumber(
            getValue(
                id
            )
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

        if (
            element
        ) {

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

        if (
            element
        ) {

            element.textContent =
                value;
        }
    }


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
