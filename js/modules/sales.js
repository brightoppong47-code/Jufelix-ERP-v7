/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   CUSTOMER-AWARE MULTI-ITEM SALES / POS

   Features:
   - Multi-item cart
   - Branch-aware inventory
   - Registered customers
   - Walk-in customer
   - Cash / MoMo / Card / Bank
   - Credit sales
   - Credit-limit validation
   - Customer balance updates
   - Customer purchase totals
   - COGS
   - Gross profit
   - Stock ledger
   - Firebase sales sync
   - Professional receipt preview

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


    const el = {};


    /* ==========================================
       START
    ========================================== */

    document.addEventListener(
        "DOMContentLoaded",
        initializeSales
    );


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


        loadProductDropdown();

        loadCustomerDropdown();


        resetProductSelection();

        updateCustomerSelection();


        renderCart();

        displayRecentSales();

        updateSalesSummary();

        startSalesCloud();


        console.log(
            "Jufelix Customer-Aware Sales module loaded."
        );
    }


    /* ==========================================
       ELEMENTS
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
                    !event.detail
                ) {
                    return;
                }


                if (
                    event.detail.key ===
                    CUSTOMERS_KEY
                ) {

                    customers =
                        readArray(
                            CUSTOMERS_KEY
                        );


                    loadCustomerDropdown();

                    updateCustomerSelection();
                }


                if (
                    event.detail.key ===
                    PRODUCTS_KEY
                ) {

                    products =
                        readArray(
                            PRODUCTS_KEY
                        );


                    loadProductDropdown();
                }
            }
        );


        window.addEventListener(
            "storage",
            function (event) {

                if (
                    event.key ===
                    CUSTOMERS_KEY
                ) {

                    customers =
                        readArray(
                            CUSTOMERS_KEY
                        );


                    loadCustomerDropdown();

                    updateCustomerSelection();
                }


                if (
                    event.key ===
                    PRODUCTS_KEY
                ) {

                    products =
                        readArray(
                            PRODUCTS_KEY
                        );


                    loadProductDropdown();
                }
            }
        );
    }


    /* ==========================================
       CUSTOMER DROPDOWN
    ========================================== */

    function loadCustomerDropdown() {

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
                            ""
                        )
                            .localeCompare(
                                String(
                                    b.name ||
                                    ""
                                )
                            );
                    }
                );


        el.customer.innerHTML = `

            <option value="">
                Walk-in Customer
            </option>

        `;


        activeCustomers.forEach(
            function (customer) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    customer.id;


                option.textContent =
                    `${customer.name || "Customer"}` +
                    (
                        customer.phone
                            ? ` — ${customer.phone}`
                            : ""
                    );


                el.customer.appendChild(
                    option
                );
            }
        );


        if (
            previousValue &&
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
            )
        ) {

            el.customer.value =
                previousValue;
        }
    }


    /* ==========================================
       SELECTED CUSTOMER
    ========================================== */

    function getSelectedCustomer() {

        if (
            !el.customer ||
            !el.customer.value
        ) {

            return null;
        }


        customers =
            readArray(
                CUSTOMERS_KEY
            );


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
                "Credit payment requires a registered customer. Select a customer before completing the sale.";


            return;
        }


        const currentBalance =
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
                currentBalance
            );


        const saleTotal =
            getCartTotals()
                .revenue;


        if (
            creditLimit <=
            0
        ) {

            el.creditSaleWarning.textContent =
                `${customer.name} does not have a credit limit. Edit the customer and set a credit limit first.`;


            return;
        }


        if (
            saleTotal >
            availableCredit
        ) {

            el.creditSaleWarning.textContent =
                `Credit limit exceeded. Available credit is ${formatMoney(
                    availableCredit
                )}, but this sale is ${formatMoney(
                    saleTotal
                )}.`;


            return;
        }


        el.creditSaleWarning.textContent =
            `Credit sale for ${customer.name}. ` +
            `Current balance: ${formatMoney(
                currentBalance
            )}. ` +
            `Available credit: ${formatMoney(
                availableCredit
            )}. ` +
            `After this sale the balance will be ${formatMoney(
                currentBalance +
                saleTotal
            )}.`;
    }


    /* ==========================================
       PRODUCT DROPDOWN
    ========================================== */

    function loadProductDropdown() {

        if (!el.product) {
            return;
        }


        const previousValue =
            el.product.value;


        products =
            readArray(
                PRODUCTS_KEY
            );


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
                            ) >
                                0
                        );
                    }
                )
                .sort(
                    function (a, b) {

                        return String(
                            a.name ||
                            ""
                        )
                            .localeCompare(
                                String(
                                    b.name ||
                                    ""
                                )
                            );
                    }
                );


        el.product.innerHTML =
            '<option value="">Select Product</option>';


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
                    product.id;


                option.textContent =
                    `${product.name || "Unnamed Product"} — ` +
                    `${formatNumber(stock)} ` +
                    `${product.unit || ""}`;


                el.product.appendChild(
                    option
                );
            }
        );


        if (
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
            )
        ) {

            el.product.value =
                previousValue;
        }
    }


    /* ==========================================
       SELECT PRODUCT
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

            `${formatNumber(
                available
            )} ${product.unit || ""}`
        );


        setValue(
            el.sellingPrice,

            toNumber(
                product.sellingPrice
            )
                .toFixed(2)
        );


        setValue(
            el.quantity,

            available > 0
                ? 1
                : ""
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

        if (el.form) {

            el.form.reset();
        }


        resetProductInformation();
    }


    /* ==========================================
       ITEM TOTAL
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


        const total =
            quantity *
            price;


        setValue(
            el.itemTotal,
            total.toFixed(2)
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
            quantity <=
            0
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
                `Only ${formatNumber(
                    available
                )} ${product.unit || ""} ` +
                "is available after considering the current cart."
            );


            return;
        }


        const existingIndex =
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
            existingIndex !==
            -1
        ) {

            cart[
                existingIndex
            ].quantity +=
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


        loadProductDropdown();


        renderCart();
    }


    /* ==========================================
       CART DISPLAY
    ========================================== */

    function renderCart() {

        if (!el.cartBody) {

            updateCartSummary();

            return;
        }


        if (
            cart.length ===
            0
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

                            const itemTotal =
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
                                            class="cart-quantity-input"
                                            min="1"
                                            step="1"
                                            value="${item.quantity}"
                                            data-cart-index="${index}"
                                        >

                                    </td>


                                    <td>

                                        <strong>

                                            ${formatMoney(
                                                itemTotal
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


    /* ==========================================
       UPDATE CART
    ========================================== */

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


        const newQuantity =
            toNumber(
                value
            );


        if (
            newQuantity <=
            0
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
                            cart[
                                index
                            ].productId
                        )
                    );
                }
            );


        if (!product) {

            alert(
                "The product could not be found."
            );


            renderCart();


            return;
        }


        const actualStock =
            getProductBranchStock(
                product
            );


        if (
            newQuantity >
            actualStock
        ) {

            alert(
                `Only ${formatNumber(
                    actualStock
                )} ${product.unit || ""} is available.`
            );


            renderCart();


            return;
        }


        cart[
            index
        ].quantity =
            newQuantity;


        renderCart();


        loadProductDropdown();
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


        loadProductDropdown();
    }


    function clearCart() {

        if (
            cart.length ===
            0
        ) {

            return;
        }


        const confirmed =
            window.confirm(
                "Clear all products from the cart?"
            );


        if (!confirmed) {
            return;
        }


        cart = [];


        renderCart();


        loadProductDropdown();


        resetProductSelection();
    }


    /* ==========================================
       CART SUMMARY
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

            el.cartItemCountBadge
                .textContent =

                `${formatNumber(
                    totals.quantity
                )} item${

                    totals.quantity ===
                    1
                        ? ""
                        : "s"
                }`;
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
                quantity:
                    0,

                revenue:
                    0,

                cogs:
                    0,

                grossProfit:
                    0
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


    /* ==========================================
       CREDIT VALIDATION
    ========================================== */

    function validateCreditSale(
        customer,
        total
    ) {

        if (!customer) {

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
                    "The selected customer is inactive and cannot make a credit purchase."
            };
        }


        const creditLimit =
            toNumber(
                customer.creditLimit
            );


        if (
            creditLimit <=
            0
        ) {

            return {
                valid:
                    false,

                message:
                    `${customer.name} does not have a credit limit.`
            };
        }


        const balance =
            Math.max(
                0,
                toNumber(
                    customer.balance
                )
            );


        const availableCredit =
            Math.max(
                0,
                creditLimit -
                balance
            );


        if (
            total >
            availableCredit
        ) {

            return {
                valid:
                    false,

                message:
                    `Credit limit exceeded.\n\n` +
                    `Customer: ${customer.name}\n` +
                    `Credit Limit: ${formatMoney(
                        creditLimit
                    )}\n` +
                    `Current Balance: ${formatMoney(
                        balance
                    )}\n` +
                    `Available Credit: ${formatMoney(
                        availableCredit
                    )}\n` +
                    `Sale Amount: ${formatMoney(
                        total
                    )}`
            };
        }


        return {
            valid:
                true,

            availableCredit:
                availableCredit,

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
            cart.length ===
            0
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


        /* ======================================
           FINAL STOCK VALIDATION
        ====================================== */

        for (
            let index = 0;
            index <
                cart.length;
            index++
        ) {

            const cartItem =
                cart[
                    index
                ];


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
                    `${cartItem.productName} could not be found.`
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
                    `${cartItem.productName} now has only ` +
                    `${formatNumber(
                        stock
                    )} ` +
                    `${product.unit || ""} available.`
                );


                loadProductDropdown();


                return;
            }
        }


        const totals =
            getCartTotals();


        const paymentMethod =
            getPaymentMethod();


        let selectedCustomer =
            getSelectedCustomer();


        /* ======================================
           CUSTOMER VALIDATION
        ====================================== */

        if (selectedCustomer) {

            const customerStatus =
                String(
                    selectedCustomer.status ||
                    "active"
                )
                    .trim()
                    .toLowerCase();


            if (
                customerStatus !==
                "active"
            ) {

                alert(
                    "The selected customer is inactive."
                );


                return;
            }
        }


        /* ======================================
           CREDIT VALIDATION
        ====================================== */

        if (
            paymentMethod ===
            "Credit"
        ) {

            const creditValidation =
                validateCreditSale(
                    selectedCustomer,
                    totals.revenue
                );


            if (
                !creditValidation.valid
            ) {

                alert(
                    creditValidation.message
                );


                return;
            }
        }


        /* ======================================
           CONFIRM
        ====================================== */

        const customerName =
            selectedCustomer
                ? (
                    selectedCustomer.name ||
                    "Customer"
                )
                : "Walk-in Customer";


        const confirmed =
            window.confirm(

                `Complete this sale?\n\n` +

                `Customer: ${customerName}\n` +

                `Products: ${cart.length}\n` +

                `Quantity: ${formatNumber(
                    totals.quantity
                )}\n` +

                `Total: ${formatMoney(
                    totals.revenue
                )}\n` +

                `Payment: ${paymentMethod}`
            );


        if (!confirmed) {
            return;
        }


        /* ======================================
           LOCK BUTTON
        ====================================== */

        if (
            el.completeSaleButton
        ) {

            el.completeSaleButton.disabled =
                true;


            el.completeSaleButton.textContent =
                "Processing Sale...";
        }


        /* ======================================
           SNAPSHOTS
        ====================================== */

        const oldProductsSnapshot =
            deepClone(
                products
            );


        const oldSalesSnapshot =
            deepClone(
                sales
            );


        const oldCustomersSnapshot =
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


            /* ==================================
               DEDUCT STOCK
            ================================== */

            cart.forEach(
                function (cartItem) {

                    const productIndex =
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
                        productIndex ===
                        -1
                    ) {

                        throw new Error(
                            "A product in the cart could not be found."
                        );
                    }


                    const product =
                        products[
                            productIndex
                        ];


                    const branchStock = {

                        ...(
                            product.branchStock ||
                            {}
                        )
                    };


                    let currentStock =
                        toNumber(
                            branchStock[
                                branchId
                            ]
                        );


                    if (
                        !Object.prototype
                            .hasOwnProperty.call(
                                branchStock,
                                branchId
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
                        newStock <
                        0
                    ) {

                        throw new Error(
                            `${cartItem.productName} does not have enough stock.`
                        );
                    }


                    branchStock[
                        branchId
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


                    const costTotal =
                        quantity *
                        costPrice;


                    const grossProfit =
                        revenue -
                        costTotal;


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
                            costTotal,

                        cogs:
                            costTotal,

                        grossProfit:
                            grossProfit,

                        balanceAfterSale:
                            newStock
                    });
                }
            );


            /* ==================================
               CUSTOMER INFORMATION
            ================================== */

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


            /* ==================================
               CREATE SALE
            ================================== */

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


            /* ==================================
               UPDATE CUSTOMER
            ================================== */

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
                    customerIndex ===
                    -1
                ) {

                    throw new Error(
                        "The selected customer could not be found."
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


                /*
                 * Store customer balance
                 * information on the sale.
                 */

                sale.customerBalanceAfter =
                    toNumber(
                        customer.balance
                    );


                sale.customerCreditLimit =
                    toNumber(
                        customer.creditLimit
                    );
            }


            /* ==================================
               SAVE PRODUCTS
            ================================== */

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


            /* ==================================
               SAVE SALE
            ================================== */

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

                    oldProductsSnapshot,

                    oldSalesSnapshot,

                    oldCustomersSnapshot
                );


                throw new Error(
                    "Sale record could not be saved."
                );
            }


            /* ==================================
               SAVE CUSTOMER
            ================================== */

            if (
                selectedCustomer &&
                !saveArray(
                    CUSTOMERS_KEY,
                    customers
                )
            ) {

                restoreSnapshots(

                    oldProductsSnapshot,

                    oldSalesSnapshot,

                    oldCustomersSnapshot
                );


                throw new Error(
                    "Customer account could not be updated. Sale was cancelled."
                );
            }


            /* ==================================
               STOCK LEDGER
            ================================== */

            saleItems.forEach(
                function (item) {

                    addSalesLedgerEntry(
                        sale,
                        item
                    );
                }
            );


            /* ==================================
               CLOUD SYNC
            ================================== */

            syncCompletedSaleToCloud(
                sale,
                products
            );


            /* ==================================
               CLEAR CART
            ================================== */

            cart = [];


            renderCart();


            loadProductDropdown();


            resetProductSelection();


            /*
             * Keep Walk-in Customer as the
             * default after each completed sale.
             */

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


            /* ==================================
               EVENTS
            ================================== */

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


            /* ==================================
               SUCCESS
            ================================== */

            let successMessage =
                "Sale completed successfully.\n" +
                `Receipt: ${receiptNumber}\n` +
                `Customer: ${customerName}\n` +
                `Total: ${formatMoney(
                    totals.revenue
                )}`;


            if (
                paymentMethod ===
                "Credit" &&
                selectedCustomer
            ) {

                const updatedCustomer =
                    customers.find(
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


                if (updatedCustomer) {

                    successMessage +=
                        "\nNew Customer Balance: " +
                        formatMoney(
                            updatedCustomer.balance
                        );
                }
            }


            alert(
                successMessage
            );


            /* ==================================
               RECEIPT
            ================================== */

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
       RESTORE SNAPSHOTS
    ========================================== */

    function restoreSnapshots(
        productsSnapshot,
        salesSnapshot,
        customersSnapshot
    ) {

        products =
            deepClone(
                productsSnapshot
            );


        sales =
            deepClone(
                salesSnapshot
            );


        customers =
            deepClone(
                customersSnapshot
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

            console.error(
                "JufelixReceipt is undefined."
            );


            alert(
                "Sale completed successfully, but receipt.js did not load."
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


                return;

            } catch (error) {

                console.error(
                    "Receipt preview error:",
                    error
                );


                alert(
                    "Sale completed successfully, but the receipt preview could not open."
                );


                return;
            }
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
                    "Receipt compatibility error:",
                    error
                );


                alert(
                    "Sale completed successfully, but the receipt could not open."
                );
            }


            return;
        }


        console.error(
            "Receipt module loaded but has no show() function."
        );
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

                        const saleBranch =
                            sale.branchId ||
                            DEFAULT_BRANCH_ID;


                        return (
                            String(
                                saleBranch
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
                                .trim()
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

                    const saleBranch =
                        sale.branchId ||
                        DEFAULT_BRANCH_ID;


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
                            .trim()
                            .toLowerCase();


                    return (
                        String(
                            saleBranch
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


        const salesTotal =
            todaySales.reduce(
                function (
                    total,
                    sale
                ) {

                    return (
                        total +
                        getSaleRevenue(
                            sale
                        )
                    );
                },
                0
            );


        const itemQuantity =
            todaySales.reduce(
                function (
                    total,
                    sale
                ) {

                    return (
                        total +
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
                salesTotal
            )
        );


        setText(
            el.todayItemsSold,
            formatNumber(
                itemQuantity
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


        const selectedId =
            el.product.value;


        return (
            products.find(
                function (product) {

                    return (
                        String(
                            product.id
                        ) ===
                        String(
                            selectedId
                        )
                    );
                }
            ) ||
            null
        );
    }


    function getProductBranchStock(
        product
    ) {

        const branchId =
            getActiveBranchId();


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
            branchId ===
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
       BRANCH / USER
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
            normalizeRole(
                currentUser.role
            ) !==
                "admin" &&
            currentUser.branchId
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


    function getActiveBranchName() {

        const currentUser =
            readObject(
                CURRENT_USER_KEY
            ) ||
            readObject(
                "currentUser"
            );


        if (
            currentUser &&
            normalizeRole(
                currentUser.role
            ) !==
                "admin" &&
            currentUser.branchName
        ) {

            return currentUser.branchName;
        }


        const activeBranch =
            readObject(
                ACTIVE_BRANCH_KEY
            );


        if (activeBranch) {

            return (
                activeBranch.branchName ||
                activeBranch.name ||
                "Head Office"
            );
        }


        if (
            currentUser &&
            currentUser.branchName
        ) {

            return currentUser.branchName;
        }


        return "Head Office";
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
       ROLE
    ========================================== */

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

            admin:
                "admin",

            administrator:
                "admin",

            "system-administrator":
                "admin",

            manager:
                "manager",

            "branch-manager":
                "manager",

            sales:
                "sales-officer",

            salesperson:
                "sales-officer",

            "sales-person":
                "sales-officer",

            "sales-personnel":
                "sales-officer",

            "sales-officer":
                "sales-officer",

            cashier:
                "cashier",

            stockkeeper:
                "store-keeper",

            "stock-keeper":
                "store-keeper",

            storekeeper:
                "store-keeper",

            "store-keeper":
                "store-keeper",

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
       STOCK
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


    /* ==========================================
       SALES HELPERS
    ========================================== */

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
            )
                .getTime();


        return Number.isNaN(
            timestamp
        )
            ? 0
            : timestamp;
    }


    /* ==========================================
       FIREBASE CLOUD
    ========================================== */

    function startSalesCloud() {

        function connect() {

            if (
                !window.JufelixSalesCloud
            ) {

                return false;
            }


            if (
                typeof window
                    .JufelixSalesCloud
                    .listen ===
                    "function"
            ) {

                window.JufelixSalesCloud.listen(
                    function () {

                        products =
                            readArray(
                                PRODUCTS_KEY
                            );


                        sales =
                            readArray(
                                SALES_KEY
                            );


                        loadProductDropdown();


                        displayRecentSales();


                        updateSalesSummary();
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

                window.JufelixSalesCloud
                    .syncLocal(
                        products,
                        sales
                    )
                    .catch(
                        function (error) {

                            console.warn(
                                "Initial sales cloud sync failed:",
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

            connect,

            {
                once:
                    true
            }
        );
    }


    function syncCompletedSaleToCloud(
        sale,
        updatedProducts
    ) {

        if (
            !navigator.onLine ||
            !window.JufelixSalesCloud
        ) {

            return;
        }


        const operations =
            [];


        if (
            typeof window
                .JufelixSalesCloud
                .saveSale ===
                "function"
        ) {

            operations.push(

                window
                    .JufelixSalesCloud
                    .saveSale(
                        sale
                    )
            );
        }


        if (
            typeof window
                .JufelixSalesCloud
                .saveProduct ===
                "function"
        ) {

            sale.items.forEach(
                function (saleItem) {

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


                    if (product) {

                        operations.push(

                            window
                                .JufelixSalesCloud
                                .saveProduct(
                                    product
                                )
                        );
                    }
                }
            );
        }


        if (
            operations.length ===
            0
        ) {

            return;
        }


        Promise.all(
            operations
        )
            .catch(
                function (error) {

                    console.warn(
                        "Sale saved locally; cloud sync pending:",
                        error
                    );
                }
            );
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


        document.dispatchEvent(

            new CustomEvent(
                "jufelix:dataChanged",

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
                .substring(2,8)
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
            )
                .padStart(
                    2,
                    "0"
                ) +

            String(
                now.getDate()
            )
                .padStart(
                    2,
                    "0"
                );


        const timePart =

            String(
                now.getHours()
            )
                .padStart(
                    2,
                    "0"
                ) +

            String(
                now.getMinutes()
            )
                .padStart(
                    2,
                    "0"
                ) +

            String(
                now.getSeconds()
            )
                .padStart(
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
       DATE
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
                validDate.getMonth() +
                1
            )
                .padStart(
                    2,
                    "0"
                ) +

            "-" +

            String(
                validDate.getDate()
            )
                .padStart(
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
       FORMATTERS
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
            )
                .format(
                    toNumber(
                        value
                    )
                );

        } catch (error) {

            return (
                "GH₵" +
                toNumber(
                    value
                )
                    .toFixed(2)
            );
        }
    }


    function formatNumber(
        value
    ) {

        return new Intl.NumberFormat(
            "en-GH"
        )
            .format(
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


                loadProductDropdown();


                loadCustomerDropdown();


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
            getProductBranchStock
    };


})();