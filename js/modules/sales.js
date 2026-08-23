/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   SALES / POS MODULE v1011

   COMPLETE REPLACEMENT

   + Multi-item cart
   + Branch-aware stock
   + Multi-device branch support
   + Customer accounts
   + Credit sales
   + Stock ledger
   + Realtime Firebase data
   + Product Search
   + LIVE Product Suggestions
   + Tap Product From Search Results
   + Search by Name / SKU / Barcode / Brand
   + Automatic Category Tabs
   + Admin Sales Search
   + Stable Product Dropdown
   + Dropdown Blinking Protection
   + Reliable Firebase Sale Sync
   + Waits for Sales Cloud before upload

   File:
   js/modules/sales.js
========================================== */

(function () {

    "use strict";


    /* ==========================================
       STORAGE KEYS
    ========================================== */

    const PRODUCTS_KEY =
        "jufelix_products";

    const SALES_KEY =
        "jufelix_v7_sales";

    const CUSTOMERS_KEY =
        "jufelix_v7_customers";

    const BRANCHES_KEY =
        "jufelix_v7_branches";

    const LEDGER_KEY =
        "jufelix_stock_ledger";

    const ACTIVE_BRANCH_KEY =
        "jufelix_v7_active_branch";

    const CURRENT_USER_KEY =
        "jufelix_v7_current_user";

    const DEFAULT_BRANCH_ID =
        "head-office";


    /* ==========================================
       STATE
    ========================================== */

    let products = [];
    let sales = [];
    let customers = [];
    let cart = [];

    let productDropdownSignature = "";
    let customerDropdownSignature = "";
    let categorySignature = "";

    let productSearchTerm = "";
    let activeProductCategory = "all";

    let refreshTimer = null;
    let cloudListenerStarted = false;

    const el = {};


    /* ==========================================
       START
    ========================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeSales
        );

    } else {

        initializeSales();
    }


    /* ==========================================
       INITIALIZE
    ========================================== */

    function initializeSales() {

        cacheElements();

        products =
            readArray(
                PRODUCTS_KEY
            );

        sales =
            readArray(
                SALES_KEY
            );

        customers =
            readArray(
                CUSTOMERS_KEY
            );

        connectEvents();

        buildCategoryTabs(
            true
        );

        loadProductDropdown(
            true
        );

        loadCustomerDropdown(
            true
        );

        resetProductInformation();

        updateCustomerSelection();

        renderCart();

        displayRecentSales();

        updateSalesSummary();

        startSalesCloud();

        console.log(
            "✅ Jufelix Sales v1011 loaded."
        );

        console.log(
            "Active branch:",
            getActiveBranchId(),
            getActiveBranchName()
        );
    }


    /* ==========================================
       CACHE ELEMENTS
    ========================================== */

    function cacheElements() {

        /* PRODUCT SEARCH */

        el.productSearch =
            document.getElementById(
                "saleProductSearch"
            );

        el.clearProductSearch =
            document.getElementById(
                "clearProductSearch"
            );

        el.productSuggestions =
            document.getElementById(
                "saleProductSuggestions"
            );

        el.categoryTabs =
            document.getElementById(
                "saleCategoryTabs"
            );

        el.productFilterResult =
            document.getElementById(
                "productFilterResult"
            );


        /* SALE FORM */

        el.form =
            document.getElementById(
                "salesForm"
            );

        el.product =
            document.getElementById(
                "saleProduct"
            );

        el.availableStock =
            document.getElementById(
                "availableStock"
            );

        el.sellingPrice =
            document.getElementById(
                "sellingPrice"
            );

        el.quantity =
            document.getElementById(
                "saleQuantity"
            );

        el.itemTotal =
            document.getElementById(
                "saleTotal"
            );


        /* PRODUCT PREVIEW */

        el.productName =
            document.getElementById(
                "selectedProductName"
            );

        el.productCategory =
            document.getElementById(
                "selectedProductCategory"
            );

        el.productUnit =
            document.getElementById(
                "selectedProductUnit"
            );

        el.productImage =
            document.getElementById(
                "saleProductImage"
            );


        /* CART */

        el.cartBody =
            document.getElementById(
                "cartTableBody"
            );

        el.cartItemCountBadge =
            document.getElementById(
                "cartItemCountBadge"
            );

        el.cartProductCount =
            document.getElementById(
                "cartProductCount"
            );

        el.cartTotalQuantity =
            document.getElementById(
                "cartTotalQuantity"
            );

        el.saleSummaryTotal =
            document.getElementById(
                "saleSummaryTotal"
            );


        /* CUSTOMER */

        el.customer =
            document.getElementById(
                "saleCustomer"
            );

        el.customerInfo =
            document.getElementById(
                "selectedCustomerInfo"
            );

        el.checkoutCustomerName =
            document.getElementById(
                "checkoutCustomerName"
            );

        el.checkoutCustomerType =
            document.getElementById(
                "checkoutCustomerType"
            );

        el.checkoutCustomerPhone =
            document.getElementById(
                "checkoutCustomerPhone"
            );

        el.checkoutCustomerBalance =
            document.getElementById(
                "checkoutCustomerBalance"
            );

        el.checkoutCustomerCreditLimit =
            document.getElementById(
                "checkoutCustomerCreditLimit"
            );

        el.checkoutCustomerAvailableCredit =
            document.getElementById(
                "checkoutCustomerAvailableCredit"
            );

        el.creditSaleWarning =
            document.getElementById(
                "creditSaleWarning"
            );


        /* PAYMENT */

        el.paymentMethod =
            document.getElementById(
                "paymentMethod"
            );

        el.completeSaleButton =
            document.getElementById(
                "completeSaleButton"
            );

        el.clearCartButton =
            document.getElementById(
                "clearCartButton"
            );


        /* HISTORY */

        el.historyTable =
            document.getElementById(
                "salesHistoryTable"
            );

        el.todayTransactionCount =
            document.getElementById(
                "todayTransactionCount"
            );

        el.todaySalesTotal =
            document.getElementById(
                "todaySalesTotal"
            );

        el.todayItemsSold =
            document.getElementById(
                "todayItemsSold"
            );
    }


    /* ==========================================
       EVENTS
    ========================================== */

    function connectEvents() {

        /* ======================================
           LIVE PRODUCT SEARCH
        ====================================== */

        if (
            el.productSearch
        ) {

            el.productSearch.addEventListener(
                "input",
                function () {

                    productSearchTerm =
                        String(
                            el.productSearch.value ||
                            ""
                        )
                            .trim()
                            .toLowerCase();


                    productDropdownSignature =
                        "";


                    loadProductDropdown(
                        true
                    );


                    renderProductSuggestions();
                }
            );


            el.productSearch.addEventListener(
                "focus",
                function () {

                    productSearchTerm =
                        String(
                            el.productSearch.value ||
                            ""
                        )
                            .trim()
                            .toLowerCase();


                    renderProductSuggestions();
                }
            );


            el.productSearch.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key ===
                        "Escape"
                    ) {

                        hideProductSuggestions();
                    }
                }
            );
        }


        /* ======================================
           CLEAR PRODUCT SEARCH
        ====================================== */

        if (
            el.clearProductSearch
        ) {

            el.clearProductSearch.addEventListener(
                "click",
                function () {

                    productSearchTerm =
                        "";


                    if (
                        el.productSearch
                    ) {

                        el.productSearch.value =
                            "";

                        el.productSearch.focus();
                    }


                    productDropdownSignature =
                        "";


                    loadProductDropdown(
                        true
                    );


                    hideProductSuggestions();
                }
            );
        }


        /* ======================================
           CLOSE SEARCH WHEN TAPPING ELSEWHERE
        ====================================== */

        document.addEventListener(
            "click",
            function (event) {

                if (
                    !el.productSuggestions ||
                    !el.productSearch
                ) {

                    return;
                }


                const searchArea =
                    el.productSearch.closest(
                        ".product-search-area"
                    );


                if (
                    searchArea &&
                    !searchArea.contains(
                        event.target
                    )
                ) {

                    hideProductSuggestions();
                }
            }
        );


        /* PRODUCT SELECT */

        if (
            el.product
        ) {

            el.product.addEventListener(
                "change",
                function () {

                    updateSelectedProduct();

                    hideProductSuggestions();
                }
            );
        }


        /* QUANTITY */

        if (
            el.quantity
        ) {

            el.quantity.addEventListener(
                "input",
                calculateItemTotal
            );
        }


        /* ADD CART */

        if (
            el.form
        ) {

            el.form.addEventListener(
                "submit",
                addSelectedProductToCart
            );
        }


        /* CUSTOMER */

        if (
            el.customer
        ) {

            el.customer.addEventListener(
                "change",
                updateCustomerSelection
            );
        }


        /* PAYMENT */

        if (
            el.paymentMethod
        ) {

            el.paymentMethod.addEventListener(
                "change",
                updateCreditSaleWarning
            );
        }


        /* COMPLETE SALE */

        if (
            el.completeSaleButton
        ) {

            el.completeSaleButton.addEventListener(
                "click",
                completeCartSale
            );
        }


        /* CLEAR CART */

        if (
            el.clearCartButton
        ) {

            el.clearCartButton.addEventListener(
                "click",
                clearCart
            );
        }


        /* LOCAL/FIREBASE DATA */

        document.addEventListener(
            "jufelix:data-updated",
            function (event) {

                if (
                    !event ||
                    !event.detail
                ) {

                    return;
                }


                scheduleRefresh(
                    event.detail.key
                );
            }
        );


        document.addEventListener(
            "jufelix:dataChanged",
            function (event) {

                if (
                    !event ||
                    !event.detail
                ) {

                    return;
                }


                scheduleRefresh(
                    event.detail.key
                );
            }
        );


        /* CROSS TAB */

        window.addEventListener(
            "storage",
            function (event) {

                scheduleRefresh(
                    event.key
                );
            }
        );
    }


    /* ==========================================
       LIVE PRODUCT SUGGESTIONS
    ========================================== */

    function renderProductSuggestions() {

        if (
            !el.productSuggestions
        ) {

            return;
        }


        const searchValue =
            String(
                productSearchTerm ||
                ""
            )
                .trim();


        /*
         * Do not show a huge product list
         * when nothing has been typed.
         */

        if (
            !searchValue
        ) {

            hideProductSuggestions();

            return;
        }


        products =
            readArray(
                PRODUCTS_KEY
            );


        const matches =
            getFilteredProducts()
                .slice(
                    0,
                    15
                );


        if (
            matches.length === 0
        ) {

            el.productSuggestions.innerHTML = `
                <div class="product-suggestion-empty">
                    No matching product found.
                </div>
            `;


            el.productSuggestions.classList.add(
                "show"
            );


            return;
        }


        el.productSuggestions.innerHTML =
            matches
                .map(
                    function (product) {

                        const stock =
                            getAvailableStockForCart(
                                product
                            );


                        const image =
                            product.image ||
                            product.imageUrl ||
                            "";


                        const imageMarkup =
                            image
                                ? `
                                    <img
                                        src="${escapeHTML(
                                            image
                                        )}"
                                        alt="${escapeHTML(
                                            product.name ||
                                            "Product"
                                        )}"
                                    >
                                `
                                : "📦";


                        const metaParts =
                            [];


                        if (
                            product.category
                        ) {

                            metaParts.push(
                                product.category
                            );
                        }


                        if (
                            product.brand
                        ) {

                            metaParts.push(
                                product.brand
                            );
                        }


                        if (
                            product.sku
                        ) {

                            metaParts.push(
                                "SKU: " +
                                product.sku
                            );
                        }


                        if (
                            product.barcode
                        ) {

                            metaParts.push(
                                "Barcode: " +
                                product.barcode
                            );
                        }


                        return `
                            <button
                                type="button"
                                class="product-suggestion-item"
                                data-product-id="${escapeHTML(
                                    product.id
                                )}"
                            >

                                <span class="product-suggestion-image">
                                    ${imageMarkup}
                                </span>


                                <span class="product-suggestion-info">

                                    <span class="product-suggestion-name">
                                        ${escapeHTML(
                                            product.name ||
                                            "Unnamed Product"
                                        )}
                                    </span>


                                    <span class="product-suggestion-meta">
                                        ${escapeHTML(
                                            metaParts.join(
                                                " • "
                                            ) ||
                                            "Product"
                                        )}
                                    </span>

                                </span>


                                <span class="product-suggestion-stock">

                                    ${formatNumber(
                                        stock
                                    )}

                                    ${escapeHTML(
                                        product.unit ||
                                        ""
                                    )}

                                </span>

                            </button>
                        `;
                    }
                )
                .join("");


        el.productSuggestions.classList.add(
            "show"
        );


        el.productSuggestions
            .querySelectorAll(
                "[data-product-id]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            selectProductFromSuggestion(
                                button.getAttribute(
                                    "data-product-id"
                                )
                            );
                        }
                    );
                }
            );
    }


    /* ==========================================
       SELECT LIVE SEARCH PRODUCT
    ========================================== */

    function selectProductFromSuggestion(
        productId
    ) {

        if (
            !productId
        ) {

            return;
        }


        products =
            readArray(
                PRODUCTS_KEY
            );


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


        if (
            !product
        ) {

            return;
        }


        /*
         * Clear filters so the selected product
         * remains present in the normal dropdown.
         */

        productSearchTerm =
            "";

        activeProductCategory =
            "all";


        if (
            el.productSearch
        ) {

            el.productSearch.value =
                "";
        }


        productDropdownSignature =
            "";


        updateActiveCategoryButton();


        loadProductDropdown(
            true
        );


        if (
            el.product
        ) {

            el.product.value =
                String(
                    product.id
                );
        }


        updateSelectedProduct();


        hideProductSuggestions();


        /*
         * Move user directly to quantity.
         */

        if (
            el.quantity
        ) {

            window.setTimeout(
                function () {

                    el.quantity.focus();

                    if (
                        typeof el.quantity.select ===
                        "function"
                    ) {

                        el.quantity.select();
                    }

                },
                50
            );
        }
    }


    /* ==========================================
       HIDE PRODUCT SUGGESTIONS
    ========================================== */

    function hideProductSuggestions() {

        if (
            !el.productSuggestions
        ) {

            return;
        }


        el.productSuggestions.classList.remove(
            "show"
        );


        el.productSuggestions.innerHTML =
            "";
    }


    /* ==========================================
       CATEGORY TABS
    ========================================== */

    function buildCategoryTabs(
        force
    ) {

        if (
            !el.categoryTabs
        ) {

            return;
        }


        products =
            readArray(
                PRODUCTS_KEY
            );


        const categoryProducts =
            getBaseAvailableProducts();


        const categories = [
            ...new Set(
                categoryProducts
                    .map(
                        function (product) {

                            return String(
                                product.category ||
                                "Uncategorized"
                            ).trim();
                        }
                    )
                    .filter(Boolean)
            )
        ]
            .sort(
                function (first, second) {

                    return first.localeCompare(
                        second
                    );
                }
            );


        const signature =
            JSON.stringify({

                branch:
                    getActiveBranchId(),

                categories:
                    categories
            });


        if (
            !force &&
            signature ===
            categorySignature
        ) {

            updateActiveCategoryButton();

            return;
        }


        categorySignature =
            signature;


        if (
            activeProductCategory !==
                "all" &&
            !categories.some(
                function (category) {

                    return (
                        normalizeComparable(
                            category
                        ) ===
                        normalizeComparable(
                            activeProductCategory
                        )
                    );
                }
            )
        ) {

            activeProductCategory =
                "all";
        }


        const fragment =
            document.createDocumentFragment();


        const allButton =
            createCategoryButton(
                "all",
                "All Products"
            );


        fragment.appendChild(
            allButton
        );


        categories.forEach(
            function (category) {

                fragment.appendChild(
                    createCategoryButton(
                        category,
                        category
                    )
                );
            }
        );


        el.categoryTabs.replaceChildren(
            fragment
        );


        updateActiveCategoryButton();
    }


    function createCategoryButton(
        category,
        label
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "product-category-button";


        button.dataset.category =
            category;


        button.textContent =
            label;


        button.addEventListener(
            "click",
            function () {

                activeProductCategory =
                    category;


                productDropdownSignature =
                    "";


                updateActiveCategoryButton();


                loadProductDropdown(
                    true
                );


                if (
                    productSearchTerm
                ) {

                    renderProductSuggestions();

                } else {

                    hideProductSuggestions();
                }
            }
        );


        return button;
    }


    function updateActiveCategoryButton() {

        if (
            !el.categoryTabs
        ) {

            return;
        }


        el.categoryTabs
            .querySelectorAll(
                ".product-category-button"
            )
            .forEach(
                function (button) {

                    const category =
                        button.dataset.category ||
                        "all";


                    const selected =
                        normalizeComparable(
                            category
                        ) ===
                        normalizeComparable(
                            activeProductCategory
                        );


                    button.classList.toggle(
                        "active",
                        selected
                    );
                }
            );
    }


    /* ==========================================
       BASE AVAILABLE PRODUCTS
    ========================================== */

    function getBaseAvailableProducts() {

        return products.filter(
            function (product) {

                const status =
                    String(
                        product.status ||
                        "active"
                    )
                        .trim()
                        .toLowerCase();


                return (
                    status ===
                        "active" &&
                    getAvailableStockForCart(
                        product
                    ) > 0
                );
            }
        );
    }


    /* ==========================================
       PRODUCT SEARCH / FILTER
    ========================================== */

    function getFilteredProducts() {

        let filtered =
            getBaseAvailableProducts();


        if (
            activeProductCategory !==
            "all"
        ) {

            const selectedCategory =
                normalizeComparable(
                    activeProductCategory
                );


            filtered =
                filtered.filter(
                    function (product) {

                        return (
                            normalizeComparable(
                                product.category ||
                                "Uncategorized"
                            ) ===
                            selectedCategory
                        );
                    }
                );
        }


        if (
            productSearchTerm
        ) {

            const words =
                String(
                    productSearchTerm
                )
                    .toLowerCase()
                    .split(/\s+/)
                    .filter(Boolean);


            filtered =
                filtered.filter(
                    function (product) {

                        const searchableText = [

                            product.name,

                            product.sku,

                            product.barcode,

                            product.brand,

                            product.category,

                            product.unit,

                            product.description

                        ]
                            .map(
                                function (value) {

                                    return String(
                                        value ||
                                        ""
                                    )
                                        .toLowerCase();
                                }
                            )
                            .join(
                                " "
                            );


                        return words.every(
                            function (word) {

                                return searchableText.includes(
                                    word
                                );
                            }
                        );
                    }
                );
        }


        return filtered.sort(
            function (first, second) {

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
    }


    /* ==========================================
       FILTER RESULT MESSAGE
    ========================================== */

    function updateProductFilterMessage(
        filteredProducts
    ) {

        if (
            !el.productFilterResult
        ) {

            return;
        }


        const count =
            filteredProducts.length;


        const total =
            getBaseAvailableProducts()
                .length;


        let message;


        if (
            productSearchTerm &&
            activeProductCategory !==
                "all"
        ) {

            message =
                "Found " +
                formatNumber(
                    count
                ) +
                " product" +
                (
                    count === 1
                        ? ""
                        : "s"
                ) +
                " in " +
                activeProductCategory +
                ' matching "' +
                productSearchTerm +
                '".';


        } else if (
            productSearchTerm
        ) {

            message =
                "Found " +
                formatNumber(
                    count
                ) +
                " of " +
                formatNumber(
                    total
                ) +
                ' products matching "' +
                productSearchTerm +
                '".';


        } else if (
            activeProductCategory !==
            "all"
        ) {

            message =
                "Showing " +
                formatNumber(
                    count
                ) +
                " product" +
                (
                    count === 1
                        ? ""
                        : "s"
                ) +
                " in " +
                activeProductCategory +
                ".";


        } else {

            message =
                "Showing all " +
                formatNumber(
                    total
                ) +
                " available product" +
                (
                    total === 1
                        ? ""
                        : "s"
                ) +
                ".";
        }


        if (
            count === 0
        ) {

            message =
                "No available products match the current search/filter.";
        }


        el.productFilterResult.textContent =
            message;
    }


    /* ==========================================
       REFRESH SCHEDULER
    ========================================== */

    function scheduleRefresh(
        key
    ) {

        const watchedKeys = [

            PRODUCTS_KEY,

            SALES_KEY,

            CUSTOMERS_KEY,

            BRANCHES_KEY,

            ACTIVE_BRANCH_KEY

        ];


        if (
            key &&
            !watchedKeys.includes(
                key
            )
        ) {

            return;
        }


        window.clearTimeout(
            refreshTimer
        );


        refreshTimer =
            window.setTimeout(
                function () {

                    refreshFromStorage(
                        key
                    );

                },
                120
            );
    }


    function refreshFromStorage(
        changedKey
    ) {

        if (
            !changedKey ||
            changedKey ===
                PRODUCTS_KEY ||
            changedKey ===
                BRANCHES_KEY ||
            changedKey ===
                ACTIVE_BRANCH_KEY
        ) {

            products =
                readArray(
                    PRODUCTS_KEY
                );


            buildCategoryTabs(
                false
            );


            loadProductDropdown(
                false
            );


            if (
                productSearchTerm
            ) {

                renderProductSuggestions();
            }


            if (
                el.product &&
                el.product.value
            ) {

                refreshSelectedProductInformation();
            }
        }


        if (
            !changedKey ||
            changedKey ===
                CUSTOMERS_KEY
        ) {

            customers =
                readArray(
                    CUSTOMERS_KEY
                );


            loadCustomerDropdown(
                false
            );


            updateCustomerSelection();
        }


        if (
            !changedKey ||
            changedKey ===
                SALES_KEY
        ) {

            sales =
                readArray(
                    SALES_KEY
                );
        }


        if (
            changedKey ===
            ACTIVE_BRANCH_KEY
        ) {

            productDropdownSignature =
                "";

            categorySignature =
                "";

            productSearchTerm =
                "";

            activeProductCategory =
                "all";


            if (
                el.productSearch
            ) {

                el.productSearch.value =
                    "";
            }


            hideProductSuggestions();


            resetProductSelection();


            buildCategoryTabs(
                true
            );


            loadProductDropdown(
                true
            );
        }


        displayRecentSales();

        updateSalesSummary();
    }


    /* ==========================================
       PRODUCT DROPDOWN
    ========================================== */

    function loadProductDropdown(
        force
    ) {

        if (
            !el.product
        ) {

            return;
        }


        products =
            readArray(
                PRODUCTS_KEY
            );


        buildCategoryTabs(
            false
        );


        const previousValue =
            el.product.value;


        const activeBranchId =
            getActiveBranchId();


        const availableProducts =
            getFilteredProducts();


        updateProductFilterMessage(
            availableProducts
        );


        const signature =
            JSON.stringify({

                branchId:
                    String(
                        activeBranchId
                    ),

                search:
                    productSearchTerm,

                category:
                    activeProductCategory,

                products:
                    availableProducts.map(
                        function (product) {

                            return [

                                String(
                                    product.id ||
                                    ""
                                ),

                                String(
                                    product.name ||
                                    ""
                                ),

                                String(
                                    product.category ||
                                    ""
                                ),

                                String(
                                    product.sku ||
                                    ""
                                ),

                                getAvailableStockForCart(
                                    product
                                )

                            ];
                        }
                    )
            });


        if (
            !force &&
            signature ===
            productDropdownSignature
        ) {

            return;
        }


        productDropdownSignature =
            signature;


        const fragment =
            document.createDocumentFragment();


        const firstOption =
            document.createElement(
                "option"
            );


        firstOption.value =
            "";


        firstOption.textContent =
            availableProducts.length
                ? "Select Product"
                : "No matching products";


        fragment.appendChild(
            firstOption
        );


        availableProducts.forEach(
            function (product) {

                const option =
                    document.createElement(
                        "option"
                    );


                const stock =
                    getAvailableStockForCart(
                        product
                    );


                option.value =
                    String(
                        product.id
                    );


                const extras =
                    [];


                if (
                    product.sku
                ) {

                    extras.push(
                        "SKU: " +
                        product.sku
                    );
                }


                if (
                    product.category
                ) {

                    extras.push(
                        product.category
                    );
                }


                let label =
                    product.name ||
                    "Unnamed Product";


                if (
                    extras.length
                ) {

                    label +=
                        " (" +
                        extras.join(
                            " • "
                        ) +
                        ")";
                }


                label +=
                    " — " +
                    formatNumber(
                        stock
                    );


                if (
                    product.unit
                ) {

                    label +=
                        " " +
                        product.unit;
                }


                option.textContent =
                    label;


                fragment.appendChild(
                    option
                );
            }
        );


        el.product.replaceChildren(
            fragment
        );


        const stillAvailable =
            previousValue &&
            availableProducts.some(
                function (product) {

                    return (
                        String(
                            product.id
                        ) ===
                        String(
                            previousValue
                        )
                    );
                }
            );


        if (
            stillAvailable
        ) {

            el.product.value =
                previousValue;

        } else {

            el.product.value =
                "";


            if (
                previousValue
            ) {

                resetProductInformation();
            }
        }
    }


    /* ==========================================
       CUSTOMER DROPDOWN
    ========================================== */

    function loadCustomerDropdown(
        force
    ) {

        if (
            !el.customer
        ) {

            return;
        }


        const previousValue =
            el.customer.value;


        customers =
            readArray(
                CUSTOMERS_KEY
            );


        const activeCustomers =
            customers
                .filter(
                    function (customer) {

                        return (
                            String(
                                customer.status ||
                                "active"
                            )
                                .trim()
                                .toLowerCase() ===
                            "active"
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
                            first.fullName ||
                            ""
                        ).localeCompare(
                            String(
                                second.name ||
                                second.fullName ||
                                ""
                            )
                        );
                    }
                );


        const signature =
            JSON.stringify(
                activeCustomers.map(
                    function (customer) {

                        return [

                            String(
                                customer.id ||
                                ""
                            ),

                            String(
                                customer.name ||
                                customer.fullName ||
                                ""
                            ),

                            String(
                                customer.phone ||
                                ""
                            )

                        ];
                    }
                )
            );


        if (
            !force &&
            signature ===
            customerDropdownSignature
        ) {

            return;
        }


        customerDropdownSignature =
            signature;


        const fragment =
            document.createDocumentFragment();


        const walkIn =
            document.createElement(
                "option"
            );


        walkIn.value =
            "";


        walkIn.textContent =
            "Walk-in Customer";


        fragment.appendChild(
            walkIn
        );


        activeCustomers.forEach(
            function (customer) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    String(
                        customer.id
                    );


                option.textContent =
                    (
                        customer.name ||
                        customer.fullName ||
                        "Customer"
                    ) +
                    (
                        customer.phone
                            ? " — " +
                              customer.phone
                            : ""
                    );


                fragment.appendChild(
                    option
                );
            }
        );


        el.customer.replaceChildren(
            fragment
        );


        const stillExists =
            activeCustomers.some(
                function (customer) {

                    return (
                        String(
                            customer.id
                        ) ===
                        String(
                            previousValue
                        )
                    );
                }
            );


        if (
            previousValue &&
            stillExists
        ) {

            el.customer.value =
                previousValue;

        } else {

            el.customer.value =
                "";
        }
    }


    /* ==========================================
       CUSTOMER
    ========================================== */

    function getSelectedCustomer() {

        if (
            !el.customer ||
            !el.customer.value
        ) {

            return null;
        }


        return (
            customers.find(
                function (customer) {

                    return (
                        String(
                            customer.id
                        ) ===
                        String(
                            el.customer.value
                        )
                    );
                }
            ) ||
            null
        );
    }


    function updateCustomerSelection() {

        const customer =
            getSelectedCustomer();


        if (
            !customer
        ) {

            if (
                el.customerInfo
            ) {

                el.customerInfo
                    .classList
                    .remove(
                        "show"
                    );
            }


            setText(
                el.checkoutCustomerName,
                "—"
            );

            setText(
                el.checkoutCustomerType,
                "—"
            );

            setText(
                el.checkoutCustomerPhone,
                "—"
            );

            setText(
                el.checkoutCustomerBalance,
                formatMoney(
                    0
                )
            );

            setText(
                el.checkoutCustomerCreditLimit,
                formatMoney(
                    0
                )
            );

            setText(
                el.checkoutCustomerAvailableCredit,
                formatMoney(
                    0
                )
            );


            updateCreditSaleWarning();


            return;
        }


        if (
            el.customerInfo
        ) {

            el.customerInfo
                .classList
                .add(
                    "show"
                );
        }


        const balance =
            toNumber(
                customer.balance
            );


        const creditLimit =
            toNumber(
                customer.creditLimit
            );


        const availableCredit =
            Math.max(
                0,
                creditLimit -
                balance
            );


        setText(
            el.checkoutCustomerName,
            customer.name ||
            customer.fullName ||
            "Customer"
        );


        setText(
            el.checkoutCustomerType,
            formatCustomerType(
                customer.type
            )
        );


        setText(
            el.checkoutCustomerPhone,
            customer.phone ||
            "—"
        );


        setText(
            el.checkoutCustomerBalance,
            formatMoney(
                balance
            )
        );


        setText(
            el.checkoutCustomerCreditLimit,
            formatMoney(
                creditLimit
            )
        );


        setText(
            el.checkoutCustomerAvailableCredit,
            formatMoney(
                availableCredit
            )
        );


        updateCreditSaleWarning();
    }


    /* ==========================================
       CREDIT WARNING
    ========================================== */

    function updateCreditSaleWarning() {

        if (
            !el.creditSaleWarning
        ) {

            return;
        }


        const paymentMethod =
            getPaymentMethod();


        if (
            paymentMethod !==
            "Credit"
        ) {

            el.creditSaleWarning
                .classList
                .remove(
                    "show"
                );


            return;
        }


        const customer =
            getSelectedCustomer();


        el.creditSaleWarning
            .classList
            .add(
                "show"
            );


        if (
            !customer
        ) {

            el.creditSaleWarning.textContent =
                "Credit payment requires a registered customer.";


            return;
        }


        const balance =
            toNumber(
                customer.balance
            );


        const creditLimit =
            toNumber(
                customer.creditLimit
            );


        const available =
            Math.max(
                0,
                creditLimit -
                balance
            );


        const saleTotal =
            getCartTotals()
                .revenue;


        if (
            creditLimit <= 0
        ) {

            el.creditSaleWarning.textContent =
                (
                    customer.name ||
                    "Customer"
                ) +
                " does not have a credit limit.";


            return;
        }


        if (
            saleTotal >
            available
        ) {

            el.creditSaleWarning.textContent =
                "Credit limit exceeded. " +
                "Available credit: " +
                formatMoney(
                    available
                ) +
                ". Sale amount: " +
                formatMoney(
                    saleTotal
                ) +
                ".";


            return;
        }


        el.creditSaleWarning.textContent =
            "Available credit: " +
            formatMoney(
                available
            ) +
            ".";
    }


    /* ==========================================
       SELECTED PRODUCT
    ========================================== */

    function updateSelectedProduct() {

        const product =
            getSelectedProduct();


        if (
            !product
        ) {

            resetProductInformation();

            return;
        }


        const available =
            getAvailableStockForCart(
                product
            );


        setValue(
            el.availableStock,
            formatNumber(
                available
            ) +
            (
                product.unit
                    ? " " +
                      product.unit
                    : ""
            )
        );


        setValue(
            el.sellingPrice,
            toNumber(
                product.sellingPrice
            ).toFixed(
                2
            )
        );


        if (
            el.quantity &&
            !el.quantity.value
        ) {

            el.quantity.value =
                available > 0
                    ? "1"
                    : "";
        }


        updateProductPreview(
            product
        );


        calculateItemTotal();
    }


    function refreshSelectedProductInformation() {

        const product =
            getSelectedProduct();


        if (
            !product
        ) {

            resetProductInformation();

            return;
        }


        const available =
            getAvailableStockForCart(
                product
            );


        setValue(
            el.availableStock,
            formatNumber(
                available
            ) +
            (
                product.unit
                    ? " " +
                      product.unit
                    : ""
            )
        );


        setValue(
            el.sellingPrice,
            toNumber(
                product.sellingPrice
            ).toFixed(
                2
            )
        );


        updateProductPreview(
            product
        );


        calculateItemTotal();
    }


    function updateProductPreview(
        product
    ) {

        if (
            el.productName
        ) {

            el.productName.textContent =
                product.name ||
                "Unnamed Product";
        }


        if (
            el.productCategory
        ) {

            el.productCategory.textContent =
                "Category: " +
                (
                    product.category ||
                    "—"
                );
        }


        if (
            el.productUnit
        ) {

            el.productUnit.textContent =
                "Unit: " +
                (
                    product.unit ||
                    "—"
                );
        }


        if (
            el.productImage
        ) {

            const image =
                product.image ||
                product.imageUrl ||
                "";


            if (
                image
            ) {

                el.productImage.innerHTML = `
                    <img
                        src="${escapeHTML(
                            image
                        )}"
                        alt="${escapeHTML(
                            product.name ||
                            "Product"
                        )}"
                    >
                `;

            } else {

                el.productImage.innerHTML =
                    "📦";
            }
        }
    }


    function resetProductInformation() {

        setValue(
            el.availableStock,
            ""
        );

        setValue(
            el.sellingPrice,
            ""
        );

        setValue(
            el.quantity,
            ""
        );

        setValue(
            el.itemTotal,
            ""
        );


        if (
            el.productName
        ) {

            el.productName.textContent =
                "No product selected";
        }


        if (
            el.productCategory
        ) {

            el.productCategory.textContent =
                "Category: —";
        }


        if (
            el.productUnit
        ) {

            el.productUnit.textContent =
                "Unit: —";
        }


        if (
            el.productImage
        ) {

            el.productImage.innerHTML =
                "📦";
        }
    }


    function resetProductSelection() {

        if (
            el.product
        ) {

            el.product.value =
                "";
        }


        resetProductInformation();
    }


    /* ==========================================
       ITEM TOTAL
    ========================================== */

    function calculateItemTotal() {

        const product =
            getSelectedProduct();


        if (
            !product
        ) {

            setValue(
                el.itemTotal,
                ""
            );


            return;
        }


        const quantity =
            toNumber(
                el.quantity
                    ? el.quantity.value
                    : 0
            );


        const price =
            toNumber(
                product.sellingPrice
            );


        setValue(
            el.itemTotal,
            (
                quantity *
                price
            ).toFixed(
                2
            )
        );
    }


    /* ==========================================
       ADD TO CART
    ========================================== */

    function addSelectedProductToCart(
        event
    ) {

        event.preventDefault();


        products =
            readArray(
                PRODUCTS_KEY
            );


        const product =
            getSelectedProduct();


        if (
            !product
        ) {

            alert(
                "Select a product."
            );


            return;
        }


        const quantity =
            toNumber(
                el.quantity
                    ? el.quantity.value
                    : 0
            );


        if (
            quantity <= 0
        ) {

            alert(
                "Enter a valid quantity."
            );


            return;
        }


        const available =
            getAvailableStockForCart(
                product
            );


        if (
            quantity >
            available
        ) {

            alert(
                "Only " +
                formatNumber(
                    available
                ) +
                " " +
                (
                    product.unit ||
                    ""
                ) +
                " is available."
            );


            return;
        }


        const index =
            cart.findIndex(
                function (item) {

                    return (
                        String(
                            item.productId
                        ) ===
                        String(
                            product.id
                        )
                    );
                }
            );


        if (
            index !== -1
        ) {

            cart[index].quantity +=
                quantity;


        } else {

            cart.push({

                productId:
                    String(
                        product.id
                    ),

                productName:
                    product.name ||
                    "Unnamed Product",

                sku:
                    product.sku ||
                    "",

                unit:
                    product.unit ||
                    "",

                image:
                    product.image ||
                    product.imageUrl ||
                    "",

                quantity:
                    quantity,

                sellingPrice:
                    toNumber(
                        product.sellingPrice
                    ),

                costPriceAtSale:
                    toNumber(
                        product.costPrice
                    )
            });
        }


        resetProductSelection();


        hideProductSuggestions();


        productDropdownSignature =
            "";


        buildCategoryTabs(
            false
        );


        loadProductDropdown(
            true
        );


        renderCart();
    }


    /* ==========================================
       CART
    ========================================== */

    function renderCart() {

        if (
            !el.cartBody
        ) {

            updateCartSummary();

            return;
        }


        if (
            cart.length === 0
        ) {

            el.cartBody.innerHTML = `
                <tr>

                    <td
                        colspan="5"
                        class="table-empty"
                    >
                        Your cart is empty.
                    </td>

                </tr>
            `;


        } else {

            el.cartBody.innerHTML =
                cart
                    .map(
                        function (
                            item,
                            index
                        ) {

                            const total =
                                toNumber(
                                    item.quantity
                                ) *
                                toNumber(
                                    item.sellingPrice
                                );


                            const imageMarkup =
                                item.image
                                    ? `
                                        <img
                                            src="${escapeHTML(
                                                item.image
                                            )}"
                                            alt="${escapeHTML(
                                                item.productName
                                            )}"
                                        >
                                    `
                                    : "📦";


                            return `
                                <tr>

                                    <td>

                                        <div class="cart-product">

                                            <div class="cart-product-image">
                                                ${imageMarkup}
                                            </div>

                                            <div>

                                                <strong>
                                                    ${escapeHTML(
                                                        item.productName
                                                    )}
                                                </strong>

                                                <div>
                                                    ${escapeHTML(
                                                        item.unit ||
                                                        ""
                                                    )}
                                                </div>

                                            </div>

                                        </div>

                                    </td>

                                    <td>
                                        ${formatMoney(
                                            item.sellingPrice
                                        )}
                                    </td>

                                    <td>

                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            class="cart-quantity-input"
                                            value="${item.quantity}"
                                            data-cart-index="${index}"
                                        >

                                    </td>

                                    <td>

                                        <strong>
                                            ${formatMoney(
                                                total
                                            )}
                                        </strong>

                                    </td>

                                    <td>

                                        <button
                                            type="button"
                                            class="remove-cart-button"
                                            data-remove-index="${index}"
                                        >
                                            Remove
                                        </button>

                                    </td>

                                </tr>
                            `;
                        }
                    )
                    .join("");
        }


        connectCartRowEvents();

        updateCartSummary();
    }


    function connectCartRowEvents() {

        document
            .querySelectorAll(
                "[data-cart-index]"
            )
            .forEach(
                function (input) {

                    input.addEventListener(
                        "change",
                        function () {

                            updateCartQuantity(
                                Number(
                                    input.getAttribute(
                                        "data-cart-index"
                                    )
                                ),
                                input.value
                            );
                        }
                    );
                }
            );


        document
            .querySelectorAll(
                "[data-remove-index]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            removeCartItem(
                                Number(
                                    button.getAttribute(
                                        "data-remove-index"
                                    )
                                )
                            );
                        }
                    );
                }
            );
    }


    function updateCartQuantity(
        index,
        value
    ) {

        if (
            index < 0 ||
            index >=
                cart.length
        ) {

            return;
        }


        const quantity =
            toNumber(
                value
            );


        if (
            quantity <= 0
        ) {

            removeCartItem(
                index
            );


            return;
        }


        products =
            readArray(
                PRODUCTS_KEY
            );


        const product =
            products.find(
                function (item) {

                    return (
                        String(
                            item.id
                        ) ===
                        String(
                            cart[index]
                                .productId
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


            renderCart();


            return;
        }


        const stock =
            getProductBranchStock(
                product
            );


        if (
            quantity >
            stock
        ) {

            alert(
                "Only " +
                formatNumber(
                    stock
                ) +
                " available."
            );


            renderCart();


            return;
        }


        cart[index].quantity =
            quantity;


        renderCart();


        productDropdownSignature =
            "";


        buildCategoryTabs(
            false
        );


        loadProductDropdown(
            true
        );
    }


    function removeCartItem(
        index
    ) {

        if (
            index < 0 ||
            index >=
                cart.length
        ) {

            return;
        }


        cart.splice(
            index,
            1
        );


        renderCart();


        productDropdownSignature =
            "";


        buildCategoryTabs(
            false
        );


        loadProductDropdown(
            true
        );
    }


    function clearCart() {

        if (
            cart.length === 0
        ) {

            return;
        }


        if (
            !window.confirm(
                "Clear all products from the cart?"
            )
        ) {

            return;
        }


        cart = [];


        renderCart();


        productDropdownSignature =
            "";


        buildCategoryTabs(
            false
        );


        loadProductDropdown(
            true
        );


        resetProductSelection();


        hideProductSuggestions();
    }


    /* ==========================================
       CART TOTALS
    ========================================== */

    function updateCartSummary() {

        const totals =
            getCartTotals();


        setText(
            el.cartProductCount,
            formatNumber(
                cart.length
            )
        );


        setText(
            el.cartTotalQuantity,
            formatNumber(
                totals.quantity
            )
        );


        setText(
            el.saleSummaryTotal,
            formatMoney(
                totals.revenue
            )
        );


        if (
            el.cartItemCountBadge
        ) {

            el.cartItemCountBadge.textContent =
                formatNumber(
                    totals.quantity
                ) +
                " item" +
                (
                    totals.quantity ===
                        1
                        ? ""
                        : "s"
                );
        }


        if (
            el.completeSaleButton
        ) {

            el.completeSaleButton.disabled =
                cart.length ===
                0;
        }


        if (
            el.clearCartButton
        ) {

            el.clearCartButton.disabled =
                cart.length ===
                0;
        }


        updateCreditSaleWarning();
    }


    function getCartTotals() {

        return cart.reduce(
            function (
                totals,
                item
            ) {

                const quantity =
                    toNumber(
                        item.quantity
                    );


                const sellingPrice =
                    toNumber(
                        item.sellingPrice
                    );


                const costPrice =
                    toNumber(
                        item.costPriceAtSale
                    );


                const revenue =
                    quantity *
                    sellingPrice;


                const cogs =
                    quantity *
                    costPrice;


                totals.quantity +=
                    quantity;

                totals.revenue +=
                    revenue;

                totals.cogs +=
                    cogs;

                totals.grossProfit +=
                    revenue -
                    cogs;


                return totals;

            },
            {

                quantity: 0,

                revenue: 0,

                cogs: 0,

                grossProfit: 0

            }
        );
    }


    /* ==========================================
       PAYMENT
    ========================================== */

    function getPaymentMethod() {

        return el.paymentMethod
            ? (
                el.paymentMethod.value ||
                "Cash"
            )
            : "Cash";
    }


    function validateCreditSale(
        customer,
        total
    ) {

        if (
            !customer
        ) {

            return {

                valid:
                    false,

                message:
                    "Credit payment requires a registered customer."

            };
        }


        const status =
            String(
                customer.status ||
                "active"
            )
                .trim()
                .toLowerCase();


        if (
            status !==
            "active"
        ) {

            return {

                valid:
                    false,

                message:
                    "The selected customer is inactive."

            };
        }


        const limit =
            toNumber(
                customer.creditLimit
            );


        if (
            limit <= 0
        ) {

            return {

                valid:
                    false,

                message:
                    "This customer does not have a credit limit."

            };
        }


        const balance =
            Math.max(
                0,
                toNumber(
                    customer.balance
                )
            );


        const available =
            Math.max(
                0,
                limit -
                balance
            );


        if (
            total >
            available
        ) {

            return {

                valid:
                    false,

                message:
                    "Credit limit exceeded.\n\n" +
                    "Available: " +
                    formatMoney(
                        available
                    ) +
                    "\nSale: " +
                    formatMoney(
                        total
                    )

            };
        }


        return {

            valid:
                true,

            newBalance:
                balance +
                total

        };
    }


    /* ==========================================
       COMPLETE SALE
    ========================================== */

    function completeCartSale() {

        if (
            cart.length === 0
        ) {

            alert(
                "Add at least one product to the cart."
            );


            return;
        }


        products =
            readArray(
                PRODUCTS_KEY
            );

        sales =
            readArray(
                SALES_KEY
            );

        customers =
            readArray(
                CUSTOMERS_KEY
            );


        for (
            const cartItem of
            cart
        ) {

            const product =
                products.find(
                    function (item) {

                        return (
                            String(
                                item.id
                            ) ===
                            String(
                                cartItem.productId
                            )
                        );
                    }
                );


            if (
                !product
            ) {

                alert(
                    cartItem.productName +
                    " could not be found."
                );


                return;
            }


            const stock =
                getProductBranchStock(
                    product
                );


            if (
                toNumber(
                    cartItem.quantity
                ) >
                stock
            ) {

                alert(
                    cartItem.productName +
                    " has only " +
                    formatNumber(
                        stock
                    ) +
                    " available."
                );


                productDropdownSignature =
                    "";


                loadProductDropdown(
                    true
                );


                return;
            }
        }


        const totals =
            getCartTotals();


        const paymentMethod =
            getPaymentMethod();


        const selectedCustomer =
            getSelectedCustomer();


        if (
            paymentMethod ===
            "Credit"
        ) {

            const validation =
                validateCreditSale(
                    selectedCustomer,
                    totals.revenue
                );


            if (
                !validation.valid
            ) {

                alert(
                    validation.message
                );


                return;
            }
        }


        const customerName =
            selectedCustomer
                ? (
                    selectedCustomer.name ||
                    selectedCustomer.fullName ||
                    "Customer"
                )
                : "Walk-in Customer";


        const confirmed =
            window.confirm(
                "Complete this sale?\n\n" +
                "Customer: " +
                customerName +
                "\nProducts: " +
                cart.length +
                "\nQuantity: " +
                formatNumber(
                    totals.quantity
                ) +
                "\nTotal: " +
                formatMoney(
                    totals.revenue
                ) +
                "\nPayment: " +
                paymentMethod
            );


        if (
            !confirmed
        ) {

            return;
        }


        if (
            el.completeSaleButton
        ) {

            el.completeSaleButton.disabled =
                true;


            el.completeSaleButton.textContent =
                "Processing Sale...";
        }


        const oldProducts =
            deepClone(
                products
            );


        const oldSales =
            deepClone(
                sales
            );


        const oldCustomers =
            deepClone(
                customers
            );


        try {

            const branchId =
                getActiveBranchId();


            const branchName =
                getActiveBranchName();


            const receiptNumber =
                generateReceiptNumber();


            const now =
                new Date();


            const saleItems =
                [];


            cart.forEach(
                function (cartItem) {

                    const index =
                        products.findIndex(
                            function (product) {

                                return (
                                    String(
                                        product.id
                                    ) ===
                                    String(
                                        cartItem.productId
                                    )
                                );
                            }
                        );


                    if (
                        index === -1
                    ) {

                        throw new Error(
                            "Product not found."
                        );
                    }


                    const product =
                        products[index];


                    const branchStock = {

                        ...(
                            product.branchStock ||
                            {}
                        )

                    };


                    const stockKey =
                        resolveProductBranchStockKey(
                            product,
                            branchId
                        );


                    let currentStock =
                        toNumber(
                            branchStock[
                                stockKey
                            ]
                        );


                    if (
                        !Object.prototype
                            .hasOwnProperty
                            .call(
                                branchStock,
                                stockKey
                            ) &&
                        branchId ===
                            DEFAULT_BRANCH_ID
                    ) {

                        currentStock =
                            toNumber(
                                product.quantity
                            );
                    }


                    const quantity =
                        toNumber(
                            cartItem.quantity
                        );


                    const newStock =
                        currentStock -
                        quantity;


                    if (
                        newStock < 0
                    ) {

                        throw new Error(
                            cartItem.productName +
                            " does not have enough stock."
                        );
                    }


                    branchStock[
                        stockKey
                    ] =
                        newStock;


                    product.branchStock =
                        branchStock;


                    product.quantity =
                        sumBranchStock(
                            branchStock
                        );


                    product.updatedAt =
                        now.toISOString();


                    const sellingPrice =
                        toNumber(
                            cartItem.sellingPrice
                        );


                    const costPrice =
                        toNumber(
                            cartItem.costPriceAtSale
                        );


                    const revenue =
                        quantity *
                        sellingPrice;


                    const cost =
                        quantity *
                        costPrice;


                    saleItems.push({

                        productId:
                            String(
                                cartItem.productId
                            ),

                        productName:
                            cartItem.productName,

                        sku:
                            cartItem.sku ||
                            "",

                        unit:
                            cartItem.unit ||
                            "",

                        quantity:
                            quantity,

                        sellingPrice:
                            sellingPrice,

                        unitPrice:
                            sellingPrice,

                        total:
                            revenue,

                        revenue:
                            revenue,

                        costPrice:
                            costPrice,

                        costPriceAtSale:
                            costPrice,

                        unitCost:
                            costPrice,

                        costTotal:
                            cost,

                        cogs:
                            cost,

                        grossProfit:
                            revenue -
                            cost,

                        balanceAfterSale:
                            newStock
                    });
                }
            );


            let customerId =
                null;

            let customerPhone =
                "";

            let customerType =
                "walk-in";


            if (
                selectedCustomer
            ) {

                customerId =
                    selectedCustomer.id;


                customerPhone =
                    selectedCustomer.phone ||
                    "";


                customerType =
                    selectedCustomer.type ||
                    "retail";
            }


            const sale = {

                id:
                    generateSaleId(),

                receiptNumber:
                    receiptNumber,

                branchId:
                    branchId,

                branchName:
                    branchName,

                items:
                    saleItems,

                itemCount:
                    saleItems.length,

                totalQuantity:
                    totals.quantity,

                total:
                    totals.revenue,

                totalAmount:
                    totals.revenue,

                revenue:
                    totals.revenue,

                cogs:
                    totals.cogs,

                costTotal:
                    totals.cogs,

                grossProfit:
                    totals.grossProfit,

                paymentMethod:
                    paymentMethod,

                isCreditSale:
                    paymentMethod ===
                    "Credit",

                customerId:
                    customerId,

                customerName:
                    customerName,

                customerPhone:
                    customerPhone,

                customerType:
                    customerType,

                cashier:
                    getCurrentUserName(),

                saleDate:
                    getLocalDateKey(
                        now
                    ),

                createdAt:
                    now.toISOString(),

                updatedAt:
                    now.toISOString(),

                status:
                    "completed"
            };


            /* CUSTOMER UPDATE */

            if (
                selectedCustomer
            ) {

                const customerIndex =
                    customers.findIndex(
                        function (customer) {

                            return (
                                String(
                                    customer.id
                                ) ===
                                String(
                                    selectedCustomer.id
                                )
                            );
                        }
                    );


                if (
                    customerIndex === -1
                ) {

                    throw new Error(
                        "Customer not found."
                    );
                }


                const customer =
                    customers[
                        customerIndex
                    ];


                customer.totalPurchases =
                    toNumber(
                        customer.totalPurchases
                    ) +
                    totals.revenue;


                customer.lastPurchaseDate =
                    now.toISOString();


                customer.lastReceiptNumber =
                    receiptNumber;


                if (
                    paymentMethod ===
                    "Credit"
                ) {

                    customer.balance =
                        toNumber(
                            customer.balance
                        ) +
                        totals.revenue;


                    customer.totalCreditSales =
                        toNumber(
                            customer.totalCreditSales
                        ) +
                        totals.revenue;
                }


                customer.updatedAt =
                    now.toISOString();


                sale.customerBalanceAfter =
                    toNumber(
                        customer.balance
                    );


                sale.customerCreditLimit =
                    toNumber(
                        customer.creditLimit
                    );
            }


            /* SAVE PRODUCTS */

            if (
                !saveArray(
                    PRODUCTS_KEY,
                    products
                )
            ) {

                throw new Error(
                    "Stock could not be saved."
                );
            }


            /* SAVE SALE */

            sales.push(
                sale
            );


            if (
                !saveArray(
                    SALES_KEY,
                    sales
                )
            ) {

                restoreSnapshots(
                    oldProducts,
                    oldSales,
                    oldCustomers
                );


                throw new Error(
                    "Sale could not be saved."
                );
            }


            /* SAVE CUSTOMER */

            if (
                selectedCustomer &&
                !saveArray(
                    CUSTOMERS_KEY,
                    customers
                )
            ) {

                restoreSnapshots(
                    oldProducts,
                    oldSales,
                    oldCustomers
                );


                throw new Error(
                    "Customer account could not be saved."
                );
            }


            saleItems.forEach(
                function (item) {

                    addSalesLedgerEntry(
                        sale,
                        item
                    );
                }
            );


            /* FIREBASE */

            syncCompletedSaleToCloud(
                sale,
                products
            )
                .then(
                    function (synced) {

                        if (
                            synced
                        ) {

                            console.log(
                                "✅ Completed sale confirmed in Firebase:",
                                sale.receiptNumber
                            );
                        }
                    }
                );


            /* RESET CART */

            cart =
                [];


            renderCart();


            resetProductSelection();


            hideProductSuggestions();


            productSearchTerm =
                "";


            if (
                el.productSearch
            ) {

                el.productSearch.value =
                    "";
            }


            productDropdownSignature =
                "";

            categorySignature =
                "";


            buildCategoryTabs(
                true
            );


            loadProductDropdown(
                true
            );


            if (
                el.customer
            ) {

                el.customer.value =
                    "";
            }


            if (
                el.paymentMethod
            ) {

                el.paymentMethod.value =
                    "Cash";
            }


            updateCustomerSelection();

            displayRecentSales();

            updateSalesSummary();


            dispatchDataUpdated(
                PRODUCTS_KEY,
                products
            );


            dispatchDataUpdated(
                SALES_KEY,
                sales
            );


            if (
                selectedCustomer
            ) {

                dispatchDataUpdated(
                    CUSTOMERS_KEY,
                    customers
                );
            }


            alert(
                "Sale completed successfully.\n" +
                "Receipt: " +
                receiptNumber +
                "\nCustomer: " +
                customerName +
                "\nTotal: " +
                formatMoney(
                    totals.revenue
                )
            );


            showCompletedSaleReceipt(
                sale
            );


        } catch (
            error
        ) {

            console.error(
                "Complete sale error:",
                error
            );


            alert(
                error.message ||
                "The sale could not be completed."
            );


            renderCart();


        } finally {

            if (
                el.completeSaleButton
            ) {

                el.completeSaleButton.textContent =
                    "Complete Sale";


                el.completeSaleButton.disabled =
                    cart.length ===
                    0;
            }
        }
    }


    /* ==========================================
       RESTORE
    ========================================== */

    function restoreSnapshots(
        productSnapshot,
        saleSnapshot,
        customerSnapshot
    ) {

        products =
            deepClone(
                productSnapshot
            );

        sales =
            deepClone(
                saleSnapshot
            );

        customers =
            deepClone(
                customerSnapshot
            );


        saveArray(
            PRODUCTS_KEY,
            products
        );

        saveArray(
            SALES_KEY,
            sales
        );

        saveArray(
            CUSTOMERS_KEY,
            customers
        );
    }


    /* ==========================================
       RECEIPT
    ========================================== */

    function showCompletedSaleReceipt(
        sale
    ) {

        if (
            !window.JufelixReceipt
        ) {

            console.warn(
                "Receipt module unavailable."
            );


            return;
        }


        if (
            typeof window
                .JufelixReceipt
                .show ===
            "function"
        ) {

            try {

                window
                    .JufelixReceipt
                    .show(
                        sale
                    );


            } catch (
                error
            ) {

                console.error(
                    "Receipt preview error:",
                    error
                );
            }


            return;
        }


        if (
            typeof window
                .JufelixReceipt
                .print ===
            "function"
        ) {

            try {

                window
                    .JufelixReceipt
                    .print(
                        sale
                    );


            } catch (
                error
            ) {

                console.error(
                    "Receipt print error:",
                    error
                );
            }
        }
    }


    /* ==========================================
       STOCK LEDGER
    ========================================== */

    function addSalesLedgerEntry(
        sale,
        item
    ) {

        const ledger =
            readArray(
                LEDGER_KEY
            );


        ledger.push({

            id:
                "LED-" +
                Date.now() +
                "-" +
                Math.random()
                    .toString(
                        36
                    )
                    .slice(
                        2,
                        7
                    ),

            date:
                sale.saleDate,

            createdAt:
                sale.createdAt,

            type:
                "SALE_OUT",

            productId:
                item.productId,

            productName:
                item.productName,

            branchId:
                sale.branchId,

            branchName:
                sale.branchName,

            customerId:
                sale.customerId,

            customerName:
                sale.customerName,

            paymentMethod:
                sale.paymentMethod,

            quantity:
                -toNumber(
                    item.quantity
                ),

            quantityOut:
                toNumber(
                    item.quantity
                ),

            balance:
                toNumber(
                    item.balanceAfterSale
                ),

            reference:
                sale.receiptNumber,

            costPrice:
                item.costPriceAtSale,

            costTotal:
                item.costTotal,

            sellingPrice:
                item.sellingPrice,

            revenue:
                item.total,

            grossProfit:
                item.grossProfit
        });


        saveArray(
            LEDGER_KEY,
            ledger
        );
    }


    /* ==========================================
       RECENT SALES
    ========================================== */

    function displayRecentSales() {

        if (
            !el.historyTable
        ) {

            return;
        }


        sales =
            readArray(
                SALES_KEY
            );


        const branchId =
            getActiveBranchId();


        const branchSales =
            sales
                .filter(
                    function (sale) {

                        return (
                            String(
                                sale.branchId ||
                                DEFAULT_BRANCH_ID
                            ) ===
                            String(
                                branchId
                            )
                        );
                    }
                )
                .filter(
                    function (sale) {

                        return (
                            String(
                                sale.status ||
                                "completed"
                            )
                                .toLowerCase() !==
                            "cancelled"
                        );
                    }
                )
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
                )
                .slice(
                    0,
                    20
                );


        if (
            branchSales.length ===
            0
        ) {

            el.historyTable.innerHTML = `
                <tr>

                    <td
                        colspan="7"
                        class="table-empty"
                    >
                        No sales have been recorded.
                    </td>

                </tr>
            `;


            return;
        }


        el.historyTable.innerHTML =
            branchSales
                .map(
                    function (sale) {

                        const summary =
                            getSaleItemSummary(
                                sale
                            );


                        return `
                            <tr>

                                <td>
                                    <strong>
                                        ${escapeHTML(
                                            sale.receiptNumber ||
                                            "—"
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHTML(
                                        formatDateTime(
                                            sale.createdAt
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        sale.customerName ||
                                        "Walk-in Customer"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        summary.names
                                    )}
                                </td>

                                <td>
                                    ${formatNumber(
                                        summary.quantity
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        sale.paymentMethod ||
                                        "Cash"
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${formatMoney(
                                            getSaleRevenue(
                                                sale
                                            )
                                        )}
                                    </strong>
                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");
    }


    function getSaleItemSummary(
        sale
    ) {

        if (
            Array.isArray(
                sale.items
            ) &&
            sale.items.length
        ) {

            return {

                names:
                    sale.items
                        .map(
                            function (item) {

                                return (
                                    item.productName ||
                                    "Product"
                                );
                            }
                        )
                        .join(
                            ", "
                        ),

                quantity:
                    sale.items.reduce(
                        function (
                            total,
                            item
                        ) {

                            return (
                                total +
                                toNumber(
                                    item.quantity
                                )
                            );
                        },
                        0
                    )

            };
        }


        return {

            names:
                sale.productName ||
                "Product",

            quantity:
                toNumber(
                    sale.quantity
                )

        };
    }


    /* ==========================================
       TODAY SUMMARY
    ========================================== */

    function updateSalesSummary() {

        sales =
            readArray(
                SALES_KEY
            );


        const branchId =
            getActiveBranchId();


        const today =
            getLocalDateKey(
                new Date()
            );


        const todaySales =
            sales.filter(
                function (sale) {

                    const saleDate =
                        sale.saleDate ||
                        getLocalDateKey(
                            new Date(
                                sale.createdAt
                            )
                        );


                    const status =
                        String(
                            sale.status ||
                            "completed"
                        )
                            .toLowerCase();


                    return (
                        String(
                            sale.branchId ||
                            DEFAULT_BRANCH_ID
                        ) ===
                            String(
                                branchId
                            ) &&
                        saleDate ===
                            today &&
                        status !==
                            "cancelled"
                    );
                }
            );


        const total =
            todaySales.reduce(
                function (
                    sum,
                    sale
                ) {

                    return (
                        sum +
                        getSaleRevenue(
                            sale
                        )
                    );
                },
                0
            );


        const quantity =
            todaySales.reduce(
                function (
                    sum,
                    sale
                ) {

                    return (
                        sum +
                        getSaleItemSummary(
                            sale
                        ).quantity
                    );
                },
                0
            );


        setText(
            el.todayTransactionCount,
            formatNumber(
                todaySales.length
            )
        );


        setText(
            el.todaySalesTotal,
            formatMoney(
                total
            )
        );


        setText(
            el.todayItemsSold,
            formatNumber(
                quantity
            )
        );
    }


    /* ==========================================
       PRODUCT HELPERS
    ========================================== */

    function getSelectedProduct() {

        if (
            !el.product ||
            !el.product.value
        ) {

            return null;
        }


        return (
            products.find(
                function (product) {

                    return (
                        String(
                            product.id
                        ) ===
                        String(
                            el.product.value
                        )
                    );
                }
            ) ||
            null
        );
    }


    function resolveProductBranchStockKey(
        product,
        branchId
    ) {

        if (
            !product ||
            !product.branchStock ||
            typeof product.branchStock !==
                "object" ||
            Array.isArray(
                product.branchStock
            )
        ) {

            return String(
                branchId
            );
        }


        const branchStock =
            product.branchStock;


        if (
            Object.prototype
                .hasOwnProperty
                .call(
                    branchStock,
                    String(
                        branchId
                    )
                )
        ) {

            return String(
                branchId
            );
        }


        const branchList =
            readArray(
                BRANCHES_KEY
            );


        const branch =
            findBranchByAnyIdentifier(
                branchId,
                branchList
            );


        if (
            !branch
        ) {

            return String(
                branchId
            );
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
                        value !==
                            undefined &&
                        value !==
                            null &&
                        String(
                            value
                        ).trim()
                    );
                }
            )
            .map(
                String
            );


        for (
            const key of
            possibleKeys
        ) {

            if (
                Object.prototype
                    .hasOwnProperty
                    .call(
                        branchStock,
                        key
                    )
            ) {

                return key;
            }
        }


        const actualKeys =
            Object.keys(
                branchStock
            );


        for (
            const actualKey of
            actualKeys
        ) {

            const match =
                possibleKeys.some(
                    function (
                        possibleKey
                    ) {

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


            if (
                match
            ) {

                return actualKey;
            }
        }


        return String(
            branchId
        );
    }


    function getProductBranchStock(
        product
    ) {

        if (
            !product
        ) {

            return 0;
        }


        const branchId =
            getActiveBranchId();


        if (
            product.branchStock &&
            typeof product.branchStock ===
                "object" &&
            !Array.isArray(
                product.branchStock
            )
        ) {

            const stockKey =
                resolveProductBranchStockKey(
                    product,
                    branchId
                );


            if (
                Object.prototype
                    .hasOwnProperty
                    .call(
                        product.branchStock,
                        stockKey
                    )
            ) {

                return toNumber(
                    product.branchStock[
                        stockKey
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


    function getCartQuantityForProduct(
        productId
    ) {

        const item =
            cart.find(
                function (cartItem) {

                    return (
                        String(
                            cartItem.productId
                        ) ===
                        String(
                            productId
                        )
                    );
                }
            );


        return item
            ? toNumber(
                item.quantity
            )
            : 0;
    }


    function getAvailableStockForCart(
        product
    ) {

        return Math.max(
            0,
            getProductBranchStock(
                product
            ) -
            getCartQuantityForProduct(
                product.id
            )
        );
    }


    /* ==========================================
       BRANCH HELPERS
    ========================================== */

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


    function findBranchByAnyIdentifier(
        value,
        branchList
    ) {

        if (
            value ===
                undefined ||
            value ===
                null ||
            String(
                value
            ).trim() ===
                ""
        ) {

            return null;
        }


        const target =
            normalizeComparable(
                value
            );


        return (
            branchList.find(
                function (branch) {

                    const values = [

                        branch.id,

                        branch.branchId,

                        branch.code,

                        branch.branchName,

                        branch.name

                    ];


                    return values.some(
                        function (candidate) {

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


    function resolveBranchIdFromValue(
        value
    ) {

        if (
            value ===
                undefined ||
            value ===
                null ||
            String(
                value
            ).trim() ===
                ""
        ) {

            return "";
        }


        const branchList =
            readArray(
                BRANCHES_KEY
            );


        const branch =
            findBranchByAnyIdentifier(
                value,
                branchList
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


    /* ==========================================
       ACTIVE BRANCH
    ========================================== */

    function getActiveBranchId() {

        const activeBranch =
            readObject(
                ACTIVE_BRANCH_KEY
            );


        if (
            activeBranch
        ) {

            const value =

                activeBranch.id ||

                activeBranch.branchId ||

                activeBranch.value ||

                activeBranch.branch ||

                activeBranch.code ||

                activeBranch.branchName ||

                activeBranch.name;


            if (
                value
            ) {

                return resolveBranchIdFromValue(
                    value
                );
            }
        }


        const currentUser =
            readObject(
                CURRENT_USER_KEY
            ) ||
            readObject(
                "currentUser"
            );


        if (
            currentUser
        ) {

            const value =

                currentUser.branchId ||

                currentUser.branch ||

                currentUser.branchCode ||

                currentUser.branchName;


            if (
                value
            ) {

                return resolveBranchIdFromValue(
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


        const branchList =
            readArray(
                BRANCHES_KEY
            );


        const branch =
            findBranchByAnyIdentifier(
                branchId,
                branchList
            );


        if (
            branch
        ) {

            return (
                branch.branchName ||
                branch.name ||
                branch.code ||
                "Branch"
            );
        }


        const activeBranch =
            readObject(
                ACTIVE_BRANCH_KEY
            );


        if (
            activeBranch
        ) {

            return (
                activeBranch.branchName ||
                activeBranch.name ||
                activeBranch.code ||
                "Branch"
            );
        }


        return "Branch";
    }


    function getCurrentUserName() {

        const user =
            readObject(
                CURRENT_USER_KEY
            ) ||
            readObject(
                "currentUser"
            );


        if (
            !user
        ) {

            return "System Administrator";
        }


        return (
            user.fullName ||
            user.name ||
            user.email ||
            user.username ||
            "System Administrator"
        );
    }


    /* ==========================================
       SALES HELPERS
    ========================================== */

    function sumBranchStock(
        branchStock
    ) {

        return Object
            .values(
                branchStock ||
                {}
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


    function getSaleRevenue(
        sale
    ) {

        return toNumber(
            sale.total ??
            sale.totalAmount ??
            sale.revenue ??
            sale.grandTotal
        );
    }


    function getTimestamp(
        sale
    ) {

        const value =
            sale.createdAt ||
            sale.saleDate ||
            sale.date ||
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
       SALES CLOUD LISTENER
    ========================================== */

    function startSalesCloud() {

        if (
            cloudListenerStarted
        ) {

            return;
        }


        function connect() {

            if (
                !window.JufelixSalesCloud
            ) {

                return false;
            }


            if (
                cloudListenerStarted
            ) {

                return true;
            }


            cloudListenerStarted =
                true;


            if (
                typeof window
                    .JufelixSalesCloud
                    .listen ===
                "function"
            ) {

                window
                    .JufelixSalesCloud
                    .listen(
                        function (type) {

                            if (
                                type ===
                                "products"
                            ) {

                                scheduleRefresh(
                                    PRODUCTS_KEY
                                );


                            } else if (
                                type ===
                                "sales"
                            ) {

                                scheduleRefresh(
                                    SALES_KEY
                                );


                            } else {

                                scheduleRefresh();
                            }
                        }
                    );
            }


            if (
                navigator.onLine &&
                typeof window
                    .JufelixSalesCloud
                    .syncLocal ===
                "function"
            ) {

                window
                    .JufelixSalesCloud
                    .syncLocal(
                        products,
                        sales
                    )
                    .catch(
                        function (error) {

                            console.warn(
                                "Initial Sales Cloud sync failed:",
                                error
                            );
                        }
                    );
            }


            return true;
        }


        if (
            connect()
        ) {

            return;
        }


        document.addEventListener(
            "jufelix:sales-cloud-ready",
            function () {

                connect();
            },
            {
                once:
                    true
            }
        );
    }


    /* ==========================================
       WAIT FOR SALES CLOUD
    ========================================== */

    function waitForSalesCloud(
        timeout = 15000
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
                        window.JufelixSalesCloud &&
                        typeof window
                            .JufelixSalesCloud
                            .saveSale ===
                        "function"
                    ) {

                        resolve(
                            window.JufelixSalesCloud
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
                                "Sales Cloud did not become ready."
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


    /* ==========================================
       SYNC COMPLETED SALE
    ========================================== */

    async function syncCompletedSaleToCloud(
        sale,
        updatedProducts
    ) {

        if (
            !navigator.onLine
        ) {

            console.warn(
                "Device offline. Sale kept locally:",
                sale.receiptNumber
            );


            return false;
        }


        try {

            console.log(
                "☁️ Preparing Firebase sale sync:",
                sale.receiptNumber
            );


            const cloud =
                await waitForSalesCloud(
                    15000
                );


            await cloud.saveSale(
                sale
            );


            console.log(
                "✅ Sale uploaded:",
                sale.receiptNumber
            );


            if (
                typeof cloud.saveProduct ===
                    "function" &&
                Array.isArray(
                    sale.items
                )
            ) {

                for (
                    const saleItem of
                    sale.items
                ) {

                    const product =
                        updatedProducts.find(
                            function (item) {

                                return (
                                    String(
                                        item.id
                                    ) ===
                                    String(
                                        saleItem.productId
                                    )
                                );
                            }
                        );


                    if (
                        !product
                    ) {

                        continue;
                    }


                    await cloud.saveProduct(
                        product
                    );


                    console.log(
                        "✅ Product stock uploaded:",
                        product.name ||
                        product.id
                    );
                }
            }


            console.log(
                "✅ Firebase sale sync completed:",
                sale.receiptNumber
            );


            return true;


        } catch (
            error
        ) {

            console.error(
                "❌ FIREBASE SALES SYNC FAILED:",
                error
            );


            alert(
                "Sale was saved locally, but Firebase sync failed.\n\n" +
                (
                    error &&
                    error.message
                        ? error.message
                        : String(
                            error
                        )
                )
            );


            return false;
        }
    }


    /* ==========================================
       STORAGE
    ========================================== */

    function readArray(
        key
    ) {

        try {

            const stored =
                localStorage.getItem(
                    key
                );


            if (
                !stored
            ) {

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


        } catch (
            error
        ) {

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


            if (
                !stored
            ) {

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


        } catch (
            error
        ) {

            return null;
        }
    }


    function saveArray(
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


        } catch (
            error
        ) {

            console.error(
                "Unable to save:",
                key,
                error
            );


            return false;
        }
    }


    function deepClone(
        value
    ) {

        return JSON.parse(
            JSON.stringify(
                value
            )
        );
    }


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
       GENERATORS
    ========================================== */

    function generateSaleId() {

        return (
            "sale-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(
                    36
                )
                .substring(
                    2,
                    8
                )
        );
    }


    function generateReceiptNumber() {

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
            "JFX-" +
            datePart +
            "-" +
            timePart +
            random
        );
    }


    /* ==========================================
       DATES
    ========================================== */

    function getLocalDateKey(
        date
    ) {

        const validDate =
            date instanceof
                Date &&
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


    function formatDateTime(
        value
    ) {

        if (
            !value
        ) {

            return "—";
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

            return "—";
        }


        return date.toLocaleString(
            "en-GH",
            {

                day:
                    "2-digit",

                month:
                    "short",

                year:
                    "numeric",

                hour:
                    "2-digit",

                minute:
                    "2-digit"

            }
        );
    }


    /* ==========================================
       FORMAT
    ========================================== */

    function formatMoney(
        value
    ) {

        const settings =
            readObject(
                "jufelix_v7_settings"
            );


        const currency =
            settings &&
            settings.currency
                ? settings.currency
                : "GHS";


        try {

            return new Intl.NumberFormat(
                "en-GH",
                {

                    style:
                        "currency",

                    currency:
                        currency,

                    minimumFractionDigits:
                        2

                }
            ).format(
                toNumber(
                    value
                )
            );


        } catch (
            error
        ) {

            return (
                "GH₵" +
                toNumber(
                    value
                ).toFixed(
                    2
                )
            );
        }
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
        element,
        value
    ) {

        if (
            element
        ) {

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

    window.JufelixSales = {

        refresh:
            function () {

                products =
                    readArray(
                        PRODUCTS_KEY
                    );

                sales =
                    readArray(
                        SALES_KEY
                    );

                customers =
                    readArray(
                        CUSTOMERS_KEY
                    );


                buildCategoryTabs(
                    false
                );


                loadProductDropdown(
                    false
                );


                if (
                    productSearchTerm
                ) {

                    renderProductSuggestions();
                }


                loadCustomerDropdown(
                    false
                );


                renderCart();

                updateCustomerSelection();

                displayRecentSales();

                updateSalesSummary();
            },


        forceRefresh:
            function () {

                productDropdownSignature =
                    "";

                customerDropdownSignature =
                    "";

                categorySignature =
                    "";


                products =
                    readArray(
                        PRODUCTS_KEY
                    );

                sales =
                    readArray(
                        SALES_KEY
                    );

                customers =
                    readArray(
                        CUSTOMERS_KEY
                    );


                buildCategoryTabs(
                    true
                );


                loadProductDropdown(
                    true
                );


                if (
                    productSearchTerm
                ) {

                    renderProductSuggestions();
                }


                loadCustomerDropdown(
                    true
                );


                renderCart();

                updateCustomerSelection();

                displayRecentSales();

                updateSalesSummary();
            },


        clearProductFilters:
            function () {

                productSearchTerm =
                    "";

                activeProductCategory =
                    "all";


                if (
                    el.productSearch
                ) {

                    el.productSearch.value =
                        "";
                }


                productDropdownSignature =
                    "";


                updateActiveCategoryButton();


                loadProductDropdown(
                    true
                );


                hideProductSuggestions();
            },


        getCart:
            function () {

                return cart.slice();
            },


        getSelectedCustomer:
            getSelectedCustomer,


        getProductBranchStock:
            getProductBranchStock,


        getActiveBranchId:
            getActiveBranchId,


        getActiveBranchName:
            getActiveBranchName

    };


})();