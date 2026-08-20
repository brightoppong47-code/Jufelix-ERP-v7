/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   CUSTOMER-AWARE MULTI-ITEM SALES / POS

   COMPLETE REPLACEMENT

   + Multi-item cart
   + Branch-aware stock
   + Multi-device branch support
   + Customer accounts
   + Credit sales
   + Stock ledger
   + Realtime Firebase data
   + Stable product dropdown
   + Dropdown blinking protection
   + Reliable Firebase sale sync
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

    let refreshTimer = null;
    let cloudListenerStarted = false;

    const el = {};


    /* ==========================================
       START
    ========================================== */

    if (
        document.readyState === "loading"
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
            readArray(PRODUCTS_KEY);

        sales =
            readArray(SALES_KEY);

        customers =
            readArray(CUSTOMERS_KEY);

        connectEvents();

        loadProductDropdown(true);

        loadCustomerDropdown(true);

        resetProductInformation();

        updateCustomerSelection();

        renderCart();

        displayRecentSales();

        updateSalesSummary();

        startSalesCloud();

        console.log(
            "✅ Jufelix Sales module loaded."
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

        if (el.product) {

            el.product.addEventListener(
                "change",
                updateSelectedProduct
            );
        }


        if (el.quantity) {

            el.quantity.addEventListener(
                "input",
                calculateItemTotal
            );
        }


        if (el.form) {

            el.form.addEventListener(
                "submit",
                addSelectedProductToCart
            );
        }


        if (el.customer) {

            el.customer.addEventListener(
                "change",
                updateCustomerSelection
            );
        }


        if (el.paymentMethod) {

            el.paymentMethod.addEventListener(
                "change",
                updateCreditSaleWarning
            );
        }


        if (el.completeSaleButton) {

            el.completeSaleButton.addEventListener(
                "click",
                completeCartSale
            );
        }


        if (el.clearCartButton) {

            el.clearCartButton.addEventListener(
                "click",
                clearCart
            );
        }


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
       REFRESH SCHEDULER
    ========================================== */

    function scheduleRefresh(key) {

        const watchedKeys = [
            PRODUCTS_KEY,
            SALES_KEY,
            CUSTOMERS_KEY,
            BRANCHES_KEY,
            ACTIVE_BRANCH_KEY
        ];


        if (
            key &&
            !watchedKeys.includes(key)
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
            changedKey === PRODUCTS_KEY ||
            changedKey === BRANCHES_KEY ||
            changedKey === ACTIVE_BRANCH_KEY
        ) {

            products =
                readArray(PRODUCTS_KEY);

            loadProductDropdown(false);


            if (
                el.product &&
                el.product.value
            ) {

                refreshSelectedProductInformation();
            }
        }


        if (
            !changedKey ||
            changedKey === CUSTOMERS_KEY
        ) {

            customers =
                readArray(CUSTOMERS_KEY);

            loadCustomerDropdown(false);

            updateCustomerSelection();
        }


        if (
            !changedKey ||
            changedKey === SALES_KEY
        ) {

            sales =
                readArray(SALES_KEY);
        }


        if (
            changedKey ===
            ACTIVE_BRANCH_KEY
        ) {

            productDropdownSignature = "";

            resetProductSelection();

            loadProductDropdown(true);
        }


        displayRecentSales();

        updateSalesSummary();
    }


    /* ==========================================
       CUSTOMER DROPDOWN
    ========================================== */

    function loadCustomerDropdown(
        force
    ) {

        if (!el.customer) {
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
                    function (a, b) {

                        return String(
                            a.name ||
                            a.fullName ||
                            ""
                        ).localeCompare(
                            String(
                                b.name ||
                                b.fullName ||
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
                                customer.id || ""
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

        walkIn.value = "";

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


        if (!customer) {

            if (el.customerInfo) {

                el.customerInfo.classList.remove(
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
                formatMoney(0)
            );

            setText(
                el.checkoutCustomerCreditLimit,
                formatMoney(0)
            );

            setText(
                el.checkoutCustomerAvailableCredit,
                formatMoney(0)
            );

            updateCreditSaleWarning();

            return;
        }


        if (el.customerInfo) {

            el.customerInfo.classList.add(
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

        if (!el.creditSaleWarning) {
            return;
        }


        const paymentMethod =
            getPaymentMethod();


        if (
            paymentMethod !==
            "Credit"
        ) {

            el.creditSaleWarning.classList.remove(
                "show"
            );

            return;
        }


        const customer =
            getSelectedCustomer();


        el.creditSaleWarning.classList.add(
            "show"
        );


        if (!customer) {

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
       PRODUCT DROPDOWN
    ========================================== */

    function loadProductDropdown(
        force
    ) {

        if (!el.product) {
            return;
        }


        products =
            readArray(
                PRODUCTS_KEY
            );


        const previousValue =
            el.product.value;


        const activeBranchId =
            getActiveBranchId();


        const availableProducts =
            products
                .filter(
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
                )
                .sort(
                    function (a, b) {

                        return String(
                            a.name ||
                            ""
                        ).localeCompare(
                            String(
                                b.name ||
                                ""
                            )
                        );
                    }
                );


        const signature =
            JSON.stringify({
                branchId:
                    String(
                        activeBranchId
                    ),

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
                                    product.unit ||
                                    ""
                                ),
                                getAvailableStockForCart(
                                    product
                                )
                            ];
                        }
                    )
            });


        /*
         * CRITICAL BLINKING FIX:
         * Do not rebuild native select unless
         * options actually changed.
         */

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


        firstOption.value = "";


        firstOption.textContent =
            availableProducts.length
                ? "Select Product"
                : "No products available";


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


                option.textContent =
                    (
                        product.name ||
                        "Unnamed Product"
                    ) +
                    " — " +
                    formatNumber(
                        stock
                    ) +
                    (
                        product.unit
                            ? " " +
                              product.unit
                            : ""
                    );


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


        if (stillAvailable) {

            el.product.value =
                previousValue;

        } else {

            el.product.value =
                "";
        }
    }


    /* ==========================================
       SELECTED PRODUCT
    ========================================== */

    function updateSelectedProduct() {

        const product =
            getSelectedProduct();


        if (!product) {

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


        if (!product) {

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

        if (el.productName) {

            el.productName.textContent =
                product.name ||
                "Unnamed Product";
        }


        if (el.productCategory) {

            el.productCategory.textContent =
                "Category: " +
                (
                    product.category ||
                    "—"
                );
        }


        if (el.productUnit) {

            el.productUnit.textContent =
                "Unit: " +
                (
                    product.unit ||
                    "—"
                );
        }


        if (el.productImage) {

            const image =
                product.image ||
                product.imageUrl ||
                "";


            if (image) {

                el.productImage.innerHTML = `
                    <img
                        src="${escapeHTML(image)}"
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


        if (el.productName) {

            el.productName.textContent =
                "No product selected";
        }


        if (el.productCategory) {

            el.productCategory.textContent =
                "Category: —";
        }


        if (el.productUnit) {

            el.productUnit.textContent =
                "Unit: —";
        }


        if (el.productImage) {

            el.productImage.innerHTML =
                "📦";
        }
    }


    function resetProductSelection() {

        if (el.product) {

            el.product.value =
                "";
        }


        resetProductInformation();
    }


    /* ==========================================
       TOTAL
    ========================================== */

    function calculateItemTotal() {

        const product =
            getSelectedProduct();


        if (!product) {

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


        if (!product) {

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


        productDropdownSignature =
            "";


        loadProductDropdown(false);

        renderCart();
    }


    /* ==========================================
       CART
    ========================================== */

    function renderCart() {

        if (!el.cartBody) {

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
            index >= cart.length
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


        if (!product) {

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


        loadProductDropdown(false);
    }


    function removeCartItem(
        index
    ) {

        if (
            index < 0 ||
            index >= cart.length
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


        loadProductDropdown(false);
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


        loadProductDropdown(false);


        resetProductSelection();
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
                    totals.quantity === 1
                        ? ""
                        : "s"
                );
        }


        if (
            el.completeSaleButton
        ) {

            el.completeSaleButton.disabled =
                cart.length === 0;
        }


        if (
            el.clearCartButton
        ) {

            el.clearCartButton.disabled =
                cart.length === 0;
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

        if (!customer) {

            return {
                valid: false,
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
            status !== "active"
        ) {

            return {
                valid: false,
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
                valid: false,
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
                valid: false,
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
            valid: true,
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


        /* FINAL STOCK CHECK */

        for (
            const cartItem of cart
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


            if (!product) {

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

                loadProductDropdown(false);

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


        if (!confirmed) {
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


            const saleItems = [];


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
                            .hasOwnProperty.call(
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


            if (selectedCustomer) {

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

            if (selectedCustomer) {

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


            /*
             * FIREBASE.
             *
             * Do not silently skip anymore.
             */

            syncCompletedSaleToCloud(
                sale,
                products
            )
                .then(
                    function (synced) {

                        if (synced) {

                            console.log(
                                "✅ Completed sale confirmed in Firebase:",
                                sale.receiptNumber
                            );
                        }
                    }
                );


            cart = [];


            renderCart();


            resetProductSelection();


            productDropdownSignature =
                "";


            loadProductDropdown(
                false
            );


            if (el.customer) {

                el.customer.value =
                    "";
            }


            if (el.paymentMethod) {

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


        } catch (error) {

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

            } catch (error) {

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

            } catch (error) {

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
                    .toString(36)
                    .slice(2, 7),

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

        if (!el.historyTable) {
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
                    function (a, b) {

                        return (
                            getTimestamp(b) -
                            getTimestamp(a)
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
                        .join(", "),

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
                .hasOwnProperty.call(
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


        if (!branch) {

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
            .map(String);


        for (
            const key of
            possibleKeys
        ) {

            if (
                Object.prototype
                    .hasOwnProperty.call(
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


        return String(
            branchId
        );
    }


    function getProductBranchStock(
        product
    ) {

        if (!product) {
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
                    .hasOwnProperty.call(
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
            value === undefined ||
            value === null ||
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
            value === undefined ||
            value === null ||
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


        if (activeBranch) {

            const value =

                activeBranch.id ||
                activeBranch.branchId ||
                activeBranch.value ||
                activeBranch.branch ||
                activeBranch.code ||
                activeBranch.branchName ||
                activeBranch.name;


            if (value) {

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


        if (currentUser) {

            const value =

                currentUser.branchId ||
                currentUser.branch ||
                currentUser.branchCode ||
                currentUser.branchName;


            if (value) {

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


        if (branch) {

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


        if (activeBranch) {

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


        if (!user) {

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
                once: true
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


            console.log(
                "✅ Sales Cloud detected."
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


                    if (!product) {
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


        } catch (error) {

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


        } catch (error) {

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
                .toString(36)
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
                validDate.getMonth() + 1
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

        if (!value) {
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

        } catch (error) {

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
                ).toLowerCase()
            ] ||
            "Retail"
        );
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


    function setValue(
        element,
        value
    ) {

        if (element) {

            element.value =
                value === undefined ||
                value === null
                    ? ""
                    : value;
        }
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


                loadProductDropdown(
                    false
                );

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


                loadProductDropdown(
                    true
                );

                loadCustomerDropdown(
                    true
                );

                renderCart();

                updateCustomerSelection();

                displayRecentSales();

                updateSalesSummary();
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