/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   MULTI-BRANCH INVENTORY MODULE

   COMPLETE REPLACEMENT

   File:
   js/modules/inventory.js

   + Branch-aware stock
   + Safe legacy stock migration
   + Active branch compatibility
   + Branch ID / code / name compatibility
   + Product image support
   + LocalStorage offline copy
   + Direct single-product Firebase sync
   + Realtime cloud refresh support
   + Permanent Firebase deletion
   + Two-way inventory CRUD
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

    let editingProductId =
        null;

    let productImageData =
        "";

    let refreshTimer =
        null;

    let saveInProgress =
        false;


    let form = null;
    let tableBody = null;
    let saveButton = null;
    let formTitle = null;
    let clearButton = null;
    let searchInput = null;
    let categoryFilter = null;
    let stockFilter = null;
    let statusFilter = null;
    let productCategory = null;
    let customCategoryGroup = null;
    let customProductCategory = null;
    let productImageInput = null;
    let productImagePreview = null;
    let productImagePreviewContainer = null;
    let removeProductImageButton = null;


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeInventory
        );

    } else {

        initializeInventory();
    }


    function initializeInventory() {

        cacheElements();

        loadProducts();

        migrateProductsToBranchStock();

        connectEvents();

        resetForm();

        refreshInventory();


        console.log(
            "✅ Jufelix Inventory module loaded."
        );


        console.log(
            "Inventory active branch:",
            getActiveBranchId(),
            getActiveBranchName()
        );
    }


    function cacheElements() {

        form =
            document.getElementById(
                "productForm"
            );

        tableBody =
            document.getElementById(
                "inventoryTableBody"
            );

        saveButton =
            document.getElementById(
                "saveProductButton"
            );

        formTitle =
            document.getElementById(
                "productFormTitle"
            );

        clearButton =
            document.getElementById(
                "cancelProductButton"
            );

        searchInput =
            document.getElementById(
                "inventorySearch"
            );

        categoryFilter =
            document.getElementById(
                "inventoryCategoryFilter"
            );

        stockFilter =
            document.getElementById(
                "inventoryStockFilter"
            );

        statusFilter =
            document.getElementById(
                "inventoryStatusFilter"
            );

        productCategory =
            document.getElementById(
                "productCategory"
            );

        customCategoryGroup =
            document.getElementById(
                "customCategoryGroup"
            );

        customProductCategory =
            document.getElementById(
                "customProductCategory"
            );

        productImageInput =
            document.getElementById(
                "productImage"
            );

        productImagePreview =
            document.getElementById(
                "productImagePreview"
            );

        productImagePreviewContainer =
            document.getElementById(
                "productImagePreviewContainer"
            );

        removeProductImageButton =
            document.getElementById(
                "removeProductImageButton"
            );
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
                function (event) {

                    event.preventDefault();

                    resetForm();
                }
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
                function (event) {

                    event.preventDefault();

                    removeProductImage();
                }
            );
        }


        document.addEventListener(
            "jufelix:data-updated",
            handleInventoryDataUpdate
        );


        document.addEventListener(
            "jufelix:dataChanged",
            handleInventoryDataUpdate
        );


        document.addEventListener(
            "jufelix:cloud-products-updated",
            function () {

                scheduleInventoryRefresh();
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

                    scheduleInventoryRefresh();
                }
            }
        );
    }


    function handleInventoryDataUpdate(
        event
    ) {

        if (
            !event ||
            !event.detail
        ) {

            return;
        }


        const key =
            event.detail.key;


        if (
            key === PRODUCTS_KEY ||
            key === BRANCHES_KEY ||
            key === ACTIVE_BRANCH_KEY
        ) {

            scheduleInventoryRefresh();
        }
    }


    function scheduleInventoryRefresh() {

        window.clearTimeout(
            refreshTimer
        );


        refreshTimer =
            window.setTimeout(
                function () {

                    loadProducts();

                    refreshInventory();
                },
                120
            );
    }


    function handleCategoryChange() {

        if (
            !productCategory ||
            !customCategoryGroup ||
            !customProductCategory
        ) {

            return;
        }


        const isOther =
            productCategory.value ===
            "Other";


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


        if (
            selected ===
            "Other"
        ) {

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
                category ||
                ""
            ).trim();


        const options =
            Array.from(
                productCategory.options
            );


        const exists =
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
            exists
        ) {

            productCategory.value =
                categoryValue;


            if (
                customCategoryGroup
            ) {

                customCategoryGroup.style.display =
                    "none";
            }


            if (
                customProductCategory
            ) {

                customProductCategory.required =
                    false;

                customProductCategory.value =
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

                customCategoryGroup.style.display =
                    "block";
            }


            if (
                customProductCategory
            ) {

                customProductCategory.required =
                    true;

                customProductCategory.value =
                    categoryValue;
            }


            return;
        }


        productCategory.value =
            "";


        if (
            customCategoryGroup
        ) {

            customCategoryGroup.style.display =
                "none";
        }


        if (
            customProductCategory
        ) {

            customProductCategory.required =
                false;

            customProductCategory.value =
                "";
        }
    }


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


            if (
                productImageInput
            ) {

                productImageInput.value =
                    "";
            }


            return;
        }


        if (
            file.size >
            10 *
            1024 *
            1024
        ) {

            alert(
                "The selected image is too large. Please choose an image below 10 MB."
            );


            if (
                productImageInput
            ) {

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
                        compressedImage
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
                        "Unable to process this image."
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
                                        width > MAX_SIZE ||
                                        height > MAX_SIZE
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
                                        document.createElement(
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


                                    if (!context) {

                                        reject(
                                            new Error(
                                                "Canvas unavailable."
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


                                    resolve(
                                        canvas.toDataURL(
                                            "image/jpeg",
                                            0.72
                                        )
                                    );


                                } catch (error) {

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

            productImagePreview.removeAttribute(
                "src"
            );


            productImagePreviewContainer.style.display =
                "none";


            return;
        }


        productImagePreview.src =
            imageSource;


        productImagePreviewContainer.style.display =
            "block";
    }


    function removeProductImage() {

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


    function migrateProductsToBranchStock() {

        let changed =
            false;


        products =
            products.map(
                function (product) {

                    const updated = {
                        ...product
                    };


                    if (
                        !updated.branchStock ||
                        typeof updated.branchStock !==
                        "object" ||
                        Array.isArray(
                            updated.branchStock
                        )
                    ) {

                        updated.branchStock =
                            {};


                        updated.branchStock[
                            DEFAULT_BRANCH_ID
                        ] =
                            toNumber(
                                updated.quantity
                            );


                        changed =
                            true;
                    }


                    updated.branchStock =
                        normalizeBranchStock(
                            updated.branchStock
                        );


                    updated.quantity =
                        sumBranchStock(
                            updated.branchStock
                        );


                    return updated;
                }
            );


        if (changed) {

            saveProductsLocally(
                products,
                false
            );
        }
    }


    async function saveProduct(
        event
    ) {

        event.preventDefault();


        if (saveInProgress) {

            return;
        }


        products =
            readProducts();


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


        if (!productData.name) {

            alert(
                "Enter the product name."
            );

            return;
        }


        if (!productData.category) {

            alert(
                "Select or enter a product category."
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

                        String(
                            productData.sku
                        )
                            .trim()
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
            editingProductId !==
            null;


        saveInProgress =
            true;


        setSaveButtonState(
            true,
            wasEditing
        );


        try {

            let savedProduct =
                null;


            if (wasEditing) {

                savedProduct =
                    updateProduct(
                        productData,
                        branchQuantity,
                        activeBranchId
                    );

            } else {

                savedProduct =
                    createProduct(
                        productData,
                        branchQuantity,
                        activeBranchId
                    );
            }


            if (!savedProduct) {

                throw new Error(
                    "Product record was not created."
                );
            }


            saveProductsLocally(
                products,
                true
            );


            const cloudResult =
                await syncSingleProductToCloud(
                    savedProduct
                );


            resetForm();

            refreshInventory();


            if (cloudResult) {

                alert(
                    wasEditing
                        ? "Product updated and synced to Firebase."
                        : "Product saved and synced to Firebase."
                );

            } else {

                alert(
                    wasEditing
                        ? "Product updated locally, but Firebase sync failed."
                        : "Product saved locally, but Firebase sync failed."
                );
            }


        } catch (error) {

            console.error(
                "Unable to save product:",
                error
            );


            alert(
                error.message ||
                "Unable to save product."
            );


        } finally {

            saveInProgress =
                false;


            setSaveButtonState(
                false,
                false
            );
        }
    }


    function createProduct(
        productData,
        branchQuantity,
        branchId
    ) {

        const now =
            new Date()
                .toISOString();


        const branchStock =
            {};


        branchStock[
            String(
                branchId
            )
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

            image:
                productImageData ||
                "",

            branchStock:
                branchStock,

            quantity:
                sumBranchStock(
                    branchStock
                ),

            localOnly:
                true,

            createdAt:
                now,

            updatedAt:
                now
        };


        products.push(
            newProduct
        );


        return newProduct;
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


        const branchStock =
            normalizeBranchStock(
                existingProduct.branchStock
            );


        const stockKey =
            resolveProductBranchStockKey(
                existingProduct,
                branchId
            );


        branchStock[
            stockKey
        ] =
            branchQuantity;


        const updatedProduct = {

            ...existingProduct,

            ...productData,

            id:
                existingProduct.id,

            image:
                productImageData,

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


        products[
            productIndex
        ] =
            updatedProduct;


        return updatedProduct;
    }


    async function syncSingleProductToCloud(
        product
    ) {

        if (
            !navigator.onLine
        ) {

            console.warn(
                "Inventory offline. Product kept locally."
            );

            return false;
        }


        try {

            const cloud =
                await waitForInventoryCloud(
                    15000
                );


            await cloud.saveProduct(
                product
            );


            product.localOnly =
                false;


            products =
                readProducts()
                    .map(
                        function (item) {

                            if (
                                String(
                                    item.id
                                ) ===
                                String(
                                    product.id
                                )
                            ) {

                                return {

                                    ...item,

                                    localOnly:
                                        false
                                };
                            }


                            return item;
                        }
                    );


            saveProductsLocally(
                products,
                true
            );


            console.log(
                "✅ Inventory product synced:",
                product.name ||
                product.id
            );


            return true;


        } catch (error) {

            console.error(
                "❌ Inventory product Firebase sync failed:",
                error
            );


            showCloudError(
                error
            );


            return false;
        }
    }


    function waitForInventoryCloud(
        timeout
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
                        window.JufelixInventoryCloud &&
                        typeof window
                            .JufelixInventoryCloud
                            .saveProduct ===
                        "function"
                    ) {

                        resolve(
                            window.JufelixInventoryCloud
                        );


                        return;
                    }


                    if (
                        Date.now() -
                        started >=
                        timeout
                    ) {

                        reject(
                            new Error(
                                "Inventory Cloud did not become ready."
                            )
                        );


                        return;
                    }


                    window.setTimeout(
                        check,
                        100
                    );
                }


                check();
            }
        );
    }


    function editProduct(
        productId
    ) {

        products =
            readProducts();


        const product =
            products.find(
                function (item) {

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
       FIREBASE + LOCAL + OTHER DEVICES
    ========================================== */

    async function deleteProduct(
        productId
    ) {

        products =
            readProducts();


        const product =
            products.find(
                function (item) {

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


        if (!product) {

            alert(
                "Product not found."
            );


            return;
        }


        const confirmed =
            window.confirm(
                `Delete "${product.name}" permanently?\n\n` +
                `This will remove it from Firebase and synchronized devices.`
            );


        if (!confirmed) {

            return;
        }


        if (
            !navigator.onLine
        ) {

            alert(
                "You must be online to permanently delete a synchronized product."
            );


            return;
        }


        try {

            const cloud =
                await waitForInventoryCloud(
                    15000
                );


            if (
                typeof cloud.deleteProduct !==
                "function"
            ) {

                throw new Error(
                    "Inventory Cloud deletion is unavailable."
                );
            }


            await cloud.deleteProduct(
                product.id
            );


            products =
                products.filter(
                    function (item) {

                        return (
                            String(
                                item.id
                            ) !==
                            String(
                                product.id
                            )
                        );
                    }
                );


            saveProductsLocally(
                products,
                true
            );


            if (
                String(
                    editingProductId
                ) ===
                String(
                    product.id
                )
            ) {

                resetForm();
            }


            refreshInventory();


            alert(
                "Product deleted successfully from Firebase and synchronized devices."
            );


        } catch (error) {

            console.error(
                "Product deletion failed:",
                error
            );


            showCloudError(
                error
            );


            alert(
                "Product was not deleted.\n\n" +
                (
                    error &&
                    error.message
                        ? error.message
                        : "Firebase deletion failed."
                )
            );
        }
    }


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
                        String(
                            selectedCategory
                        );


                    const matchesStatus =
                        !selectedStatus ||
                        String(
                            product.status ||
                            "active"
                        )
                            .toLowerCase() ===
                        String(
                            selectedStatus
                        )
                            .toLowerCase();


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
                    <div class="product-thumbnail-fallback">
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
                    <span class="stock-status ${stockClass}">
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
                            function (product) {

                                return String(
                                    product.category ||
                                    ""
                                ).trim();
                            }
                        )
                        .filter(Boolean)
                )
            ]
                .sort();


        const signature =
            categories.join(
                "||"
            );


        if (
            categoryFilter.dataset.signature ===
            signature
        ) {

            return;
        }


        categoryFilter.dataset.signature =
            signature;


        categoryFilter.innerHTML =
            `
                <option value="">
                    All Categories
                </option>

                ${
                    categories
                        .map(
                            function (category) {

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
                        .join("")
                }
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

        products =
            readProducts();


        updateInventorySummary();

        updateCategoryFilter();

        displayProducts();
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

            const key =
                resolveProductBranchStockKey(
                    product,
                    branchId
                );


            if (
                Object.prototype
                    .hasOwnProperty.call(
                        product.branchStock,
                        key
                    )
            ) {

                return toNumber(
                    product.branchStock[
                        key
                    ]
                );
            }
        }


        if (
            String(
                branchId
            ) ===
            DEFAULT_BRANCH_ID
        ) {

            return toNumber(
                product.quantity
            );
        }


        return 0;
    }


    function resolveProductBranchStockKey(
        product,
        branchId
    ) {

        const branchStock =
            normalizeBranchStock(
                product &&
                product.branchStock
            );


        const directKey =
            String(
                branchId
            );


        if (
            Object.prototype
                .hasOwnProperty.call(
                    branchStock,
                    directKey
                )
        ) {

            return directKey;
        }


        const branches =
            readArray(
                BRANCHES_KEY
            );


        const branch =
            findBranchByAnyIdentifier(
                branchId,
                branches
            );


        if (!branch) {

            return directKey;
        }


        const possibleKeys = [

            branch.id,
            branch.branchId,
            branch.code,
            branch.branchName,
            branch.name

        ]
            .filter(
                function (value) {

                    return (
                        value !== undefined &&
                        value !== null &&
                        String(
                            value
                        ).trim() !==
                        ""
                    );
                }
            )
            .map(
                function (value) {

                    return String(
                        value
                    );
                }
            );


        for (
            const possibleKey of
            possibleKeys
        ) {

            if (
                Object.prototype
                    .hasOwnProperty.call(
                        branchStock,
                        possibleKey
                    )
            ) {

                return possibleKey;
            }
        }


        for (
            const actualKey of
            Object.keys(
                branchStock
            )
        ) {

            const match =
                possibleKeys.some(
                    function (possibleKey) {

                        return (
                            normalizeComparable(
                                possibleKey
                            ) ===
                            normalizeComparable(
                                actualKey
                            )
                        );
                    }
                );


            if (match) {

                return actualKey;
            }
        }


        return directKey;
    }


    function normalizeBranchStock(
        branchStock
    ) {

        if (
            !branchStock ||
            typeof branchStock !==
            "object" ||
            Array.isArray(
                branchStock
            )
        ) {

            return {};
        }


        const result =
            {};


        Object.keys(
            branchStock
        ).forEach(
            function (key) {

                result[
                    String(
                        key
                    )
                ] =
                    toNumber(
                        branchStock[
                            key
                        ]
                    );
            }
        );


        return result;
    }


    function sumBranchStock(
        branchStock
    ) {

        return Object.values(
            normalizeBranchStock(
                branchStock
            )
        )
            .reduce(
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


    function getLowStockLevel(
        product
    ) {

        return toNumber(
            product.lowStockLevel ??
            product.lowStock ??
            5
        );
    }


    function getActiveBranchId() {

        const activeBranch =
            readStoredObject(
                ACTIVE_BRANCH_KEY
            );


        if (activeBranch) {

            const value =

                activeBranch.id ||
                activeBranch.branchId ||
                activeBranch.code ||
                activeBranch.branchName ||
                activeBranch.name;


            if (value) {

                return resolveBranchId(
                    value
                );
            }
        }


        const currentUser =
            readStoredObject(
                CURRENT_USER_KEY
            ) ||
            readStoredObject(
                "currentUser"
            );


        if (currentUser) {

            const value =

                currentUser.branchId ||
                currentUser.branch ||
                currentUser.branchCode ||
                currentUser.branchName;


            if (value) {

                return resolveBranchId(
                    value
                );
            }
        }


        return DEFAULT_BRANCH_ID;
    }


    function getActiveBranchName() {

        const branchId =
            getActiveBranchId();


        if (
            String(
                branchId
            ) ===
            DEFAULT_BRANCH_ID
        ) {

            return "Head Office";
        }


        const branch =
            findBranchByAnyIdentifier(
                branchId,
                readArray(
                    BRANCHES_KEY
                )
            );


        if (branch) {

            return (
                branch.branchName ||
                branch.name ||
                branch.code ||
                "Branch"
            );
        }


        return "Branch";
    }


    function resolveBranchId(
        value
    ) {

        if (!value) {

            return DEFAULT_BRANCH_ID;
        }


        const branch =
            findBranchByAnyIdentifier(
                value,
                readArray(
                    BRANCHES_KEY
                )
            );


        if (
            branch &&
            branch.id
        ) {

            return String(
                branch.id
            );
        }


        return String(
            value
        );
    }


    function findBranchByAnyIdentifier(
        value,
        branchList
    ) {

        if (!value) {

            return null;
        }


        const target =
            normalizeComparable(
                value
            );


        return (
            branchList.find(
                function (branch) {

                    return [

                        branch.id,
                        branch.branchId,
                        branch.code,
                        branch.branchName,
                        branch.name

                    ].some(
                        function (
                            candidate
                        ) {

                            return (
                                normalizeComparable(
                                    candidate
                                ) ===
                                target
                            );
                        }
                    );
                }
            ) ||
            null
        );
    }


    function normalizeComparable(
        value
    ) {

        return String(
            value ||
            ""
        )
            .trim()
            .toLowerCase();
    }


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


    function setSaveButtonState(
        saving,
        editing
    ) {

        if (!saveButton) {

            return;
        }


        saveButton.disabled =
            saving;


        if (saving) {

            saveButton.textContent =
                editing
                    ? "Updating..."
                    : "Saving...";

        } else {

            saveButton.textContent =
                editingProductId
                    ? "Update Product"
                    : "Save Product";
        }
    }


    function loadProducts() {

        products =
            readProducts();
    }


    function readProducts() {

        return readArray(
            PRODUCTS_KEY
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

            console.error(
                "Unable to read:",
                key,
                error
            );


            return [];
        }
    }


    function saveProductsLocally(
        productList,
        dispatchEvent
    ) {

        products =
            productList.map(
                function (product) {

                    return {

                        ...product,

                        branchStock:
                            normalizeBranchStock(
                                product.branchStock
                            ),

                        quantity:
                            sumBranchStock(
                                product.branchStock
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


        } catch (error) {

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


        if (
            dispatchEvent !==
            false
        ) {

            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:data-updated",
                    {
                        detail: {

                            key:
                                PRODUCTS_KEY,

                            value:
                                products,

                            source:
                                "inventory-module"
                        }
                    }
                )
            );
        }


        return true;
    }


    function readStoredObject(
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


    function showCloudError(
        error
    ) {

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
                "inventoryFirebaseError"
            );


        if (!box) {

            box =
                document.createElement(
                    "div"
                );


            box.id =
                "inventoryFirebaseError";


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
                "14px";

            box.style.background =
                "#7f1d1d";

            box.style.color =
                "#ffffff";

            box.style.borderRadius =
                "10px";

            box.style.fontWeight =
                "700";


            document.body.appendChild(
                box
            );
        }


        box.textContent =
            "Inventory Firebase error: " +
            message;


        window.setTimeout(
            function () {

                if (box) {

                    box.remove();
                }
            },
            9000
        );
    }


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
            document.getElementById(
                id
            );


        if (element) {

            element.textContent =
                value;
        }
    }


    function toNumber(
        value
    ) {

        if (
            value === undefined ||
            value === null ||
            value === ""
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


    window.JufelixInventory = {

        editProduct:
            editProduct,

        deleteProduct:
            deleteProduct,

        refresh:
            function () {

                loadProducts();

                refreshInventory();
            },

        resetForm:
            resetForm,

        getBranchStock:
            getBranchStock,

        getActiveBranchId:
            getActiveBranchId,

        getActiveBranchName:
            getActiveBranchName
    };


})();