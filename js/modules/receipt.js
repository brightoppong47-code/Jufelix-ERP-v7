/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   STABLE RECEIPT MODULE

   Features:
   - Automatic in-page receipt preview
   - Multi-item receipts
   - Company branding
   - Android Share
   - Optional PDF generation
   - New Sale / Done buttons

   File:
   js/modules/receipt.js
========================================== */

(function () {
    "use strict";


    const SETTINGS_KEY =
        "jufelix_v7_settings";

    const COMPANY_KEY =
        "jufelix_v7_company";

    const LOGO_KEY =
        "jufelix_v7_company_logo";


    let currentSale = null;


    /* ==========================================
       INITIALIZE
    ========================================== */

    console.log(
        "Jufelix Receipt module loaded."
    );


    /* ==========================================
       SHOW RECEIPT
    ========================================== */

    function showReceipt(
        sale
    ) {

        if (!sale) {

            window.alert(
                "Receipt data was not provided."
            );

            return;
        }


        currentSale =
            sale;


        closeReceipt();


        const company =
            getCompanyData();


        const items =
            getSaleItems(
                sale
            );


        const overlay =
            document.createElement(
                "div"
            );


        overlay.id =
            "jufelixReceiptOverlay";


        overlay.className =
            "jufelix-receipt-overlay";


        overlay.innerHTML =
            createReceiptMarkup(
                sale,
                items,
                company
            );


        addReceiptStyles();


        document.body.appendChild(
            overlay
        );


        connectReceiptEvents();


        document.body.style.overflow =
            "hidden";


        console.log(
            "Receipt preview opened:",
            sale.receiptNumber ||
            sale.id
        );
    }


    /* ==========================================
       RECEIPT EVENTS
    ========================================== */

    function connectReceiptEvents() {

        const overlay =
            document.getElementById(
                "jufelixReceiptOverlay"
            );


        const closeButton =
            document.getElementById(
                "closeReceiptButton"
            );


        const pdfButton =
            document.getElementById(
                "printReceiptButton"
            );


        const shareButton =
            document.getElementById(
                "shareReceiptButton"
            );


        const newSaleButton =
            document.getElementById(
                "newSaleButton"
            );


        const doneButton =
            document.getElementById(
                "doneReceiptButton"
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeReceipt
            );
        }


        if (pdfButton) {

            pdfButton.addEventListener(
                "click",
                generatePDF
            );
        }


        if (shareButton) {

            shareButton.addEventListener(
                "click",
                shareReceipt
            );
        }


        if (newSaleButton) {

            newSaleButton.addEventListener(
                "click",
                startNewSale
            );
        }


        if (doneButton) {

            doneButton.addEventListener(
                "click",
                closeReceipt
            );
        }


        if (overlay) {

            overlay.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target ===
                        overlay
                    ) {

                        closeReceipt();
                    }
                }
            );
        }
    }


    /* ==========================================
       RECEIPT MARKUP
    ========================================== */

    function createReceiptMarkup(
        sale,
        items,
        company
    ) {

        const receiptNumber =
            sale.receiptNumber ||
            sale.id ||
            "—";


        const branchName =
            sale.branchName ||
            "Head Office";


        const cashier =
            sale.cashier ||
            "User";


        const customerName =
            sale.customerName ||
            "Walk-in Customer";


        const paymentMethod =
            sale.paymentMethod ||
            "Cash";


        const receiptDate =
            formatDateTime(
                sale.createdAt ||
                sale.saleDate
            );


        const total =
            getSaleTotal(
                sale
            );


        const totalQuantity =
            items.reduce(
                function (
                    result,
                    item
                ) {

                    return (
                        result +
                        toNumber(
                            item.quantity
                        )
                    );
                },
                0
            );


        const logoMarkup =
            company.logo
                ? `
                    <img
                        class="receipt-company-logo"
                        src="${escapeHTML(
                            company.logo
                        )}"
                        alt="${escapeHTML(
                            company.companyName
                        )}"
                    >
                `
                : `
                    <div
                        class="receipt-logo-fallback"
                    >
                        ${escapeHTML(
                            getCompanyInitial(
                                company.companyName
                            )
                        )}
                    </div>
                `;


        const itemRows =
            items
                .map(
                    function (item) {

                        return `
                            <tr>

                                <td>

                                    <strong>
                                        ${escapeHTML(
                                            item.productName
                                        )}
                                    </strong>

                                    <div
                                        class="receipt-item-detail"
                                    >

                                        ${formatNumber(
                                            item.quantity
                                        )}

                                        ${escapeHTML(
                                            item.unit ||
                                            ""
                                        )}

                                        ×

                                        ${formatMoney(
                                            item.sellingPrice
                                        )}

                                    </div>

                                </td>


                                <td
                                    class="receipt-right"
                                >

                                    <strong>

                                        ${formatMoney(
                                            item.total
                                        )}

                                    </strong>

                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");


        return `

            <div
                class="jufelix-receipt-dialog"
            >


                <div
                    class="receipt-toolbar"
                >

                    <div>

                        <strong>
                            ✅ Sale Completed
                        </strong>

                        <span>
                            Receipt ready
                        </span>

                    </div>


                    <button
                        type="button"
                        id="closeReceiptButton"
                        class="receipt-close-button"
                        aria-label="Close receipt"
                    >
                        ×
                    </button>

                </div>



                <div
                    id="jufelixPrintableReceipt"
                    class="receipt-paper"
                >


                    <header
                        class="receipt-header"
                    >

                        ${logoMarkup}


                        <h1>
                            ${escapeHTML(
                                company.companyName
                            )}
                        </h1>


                        ${
                            company.address
                                ? `
                                    <p>
                                        ${escapeHTML(
                                            company.address
                                        )}
                                    </p>
                                `
                                : ""
                        }


                        ${
                            company.phone
                                ? `
                                    <p>
                                        Tel:
                                        ${escapeHTML(
                                            company.phone
                                        )}
                                    </p>
                                `
                                : ""
                        }


                        ${
                            company.email
                                ? `
                                    <p>
                                        ${escapeHTML(
                                            company.email
                                        )}
                                    </p>
                                `
                                : ""
                        }


                        ${
                            company.taxId
                                ? `
                                    <p>
                                        Tax ID:
                                        ${escapeHTML(
                                            company.taxId
                                        )}
                                    </p>
                                `
                                : ""
                        }


                        <div
                            class="receipt-title"
                        >
                            SALES RECEIPT
                        </div>

                    </header>



                    <section
                        class="receipt-information"
                    >


                        ${createInfoRow(
                            "Receipt",
                            receiptNumber,
                            true
                        )}


                        ${createInfoRow(
                            "Date",
                            receiptDate
                        )}


                        ${createInfoRow(
                            "Branch",
                            branchName
                        )}


                        ${createInfoRow(
                            "Cashier",
                            cashier
                        )}


                        ${createInfoRow(
                            "Customer",
                            customerName
                        )}


                        ${createInfoRow(
                            "Payment",
                            paymentMethod,
                            true
                        )}


                    </section>



                    <table
                        class="receipt-table"
                    >

                        <thead>

                            <tr>

                                <th>
                                    ITEM
                                </th>

                                <th
                                    class="receipt-right"
                                >
                                    AMOUNT
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            ${itemRows}

                        </tbody>

                    </table>



                    <section
                        class="receipt-summary"
                    >


                        <div
                            class="receipt-summary-row"
                        >

                            <span>
                                Different Products
                            </span>

                            <strong>
                                ${formatNumber(
                                    items.length
                                )}
                            </strong>

                        </div>


                        <div
                            class="receipt-summary-row"
                        >

                            <span>
                                Total Quantity
                            </span>

                            <strong>
                                ${formatNumber(
                                    totalQuantity
                                )}
                            </strong>

                        </div>


                        <div
                            class="receipt-grand-total"
                        >

                            <span>
                                TOTAL
                            </span>

                            <strong>
                                ${formatMoney(
                                    total
                                )}
                            </strong>

                        </div>


                    </section>



                    <footer
                        class="receipt-footer"
                    >

                        <strong>
                            ${escapeHTML(
                                company.receiptFooter
                            )}
                        </strong>


                        <p>
                            Keep this receipt for your records.
                        </p>


                        <small>
                            Powered by Jufelix ERP v7.0 Professional
                        </small>

                    </footer>


                </div>



                <div
                    class="receipt-actions"
                >


                    <button
                        type="button"
                        id="printReceiptButton"
                        class="
                            receipt-action-button
                            receipt-print-button
                        "
                    >
                        📄 Open PDF
                    </button>


                    <button
                        type="button"
                        id="shareReceiptButton"
                        class="
                            receipt-action-button
                            receipt-share-button
                        "
                    >
                        📤 Share Receipt
                    </button>


                    <button
                        type="button"
                        id="newSaleButton"
                        class="
                            receipt-action-button
                            receipt-new-sale-button
                        "
                    >
                        🛒 New Sale
                    </button>


                    <button
                        type="button"
                        id="doneReceiptButton"
                        class="
                            receipt-action-button
                            receipt-done-button
                        "
                    >
                        Done
                    </button>


                </div>


            </div>

        `;
    }


    function createInfoRow(
        label,
        value,
        boldValue
    ) {

        return `

            <div
                class="receipt-info-row"
            >

                <span>
                    ${escapeHTML(
                        label
                    )}:
                </span>

                ${
                    boldValue
                        ? `
                            <strong>
                                ${escapeHTML(
                                    value
                                )}
                            </strong>
                        `
                        : `
                            <span>
                                ${escapeHTML(
                                    value
                                )}
                            </span>
                        `
                }

            </div>

        `;
    }


    /* ==========================================
       PDF
    ========================================== */

    function generatePDF() {

        if (!currentSale) {

            alert(
                "No receipt is available."
            );

            return;
        }


        if (
            !window.jspdf ||
            typeof window.jspdf.jsPDF !==
                "function"
        ) {

            alert(
                "The PDF feature is not available in this preview. " +
                "Your receipt is still saved and can be shared."
            );

            return;
        }


        try {

            const jsPDF =
                window.jspdf.jsPDF;


            const sale =
                currentSale;


            const company =
                getCompanyData();


            const items =
                getSaleItems(
                    sale
                );


            const pageWidth =
                80;


            const pageHeight =
                Math.max(
                    125,
                    100 +
                    (
                        items.length *
                        12
                    )
                );


            const pdf =
                new jsPDF({

                    orientation:
                        "portrait",

                    unit:
                        "mm",

                    format: [
                        pageWidth,
                        pageHeight
                    ]

                });


            let y =
                8;


            /* LOGO */

            if (
                company.logo &&
                String(
                    company.logo
                ).startsWith(
                    "data:image"
                )
            ) {

                try {

                    const format =
                        String(
                            company.logo
                        ).includes(
                            "image/jpeg"
                        )
                            ? "JPEG"
                            : "PNG";


                    pdf.addImage(
                        company.logo,
                        format,
                        31,
                        y,
                        18,
                        18
                    );


                    y +=
                        21;

                } catch (
                    logoError
                ) {

                    console.warn(
                        "PDF logo skipped:",
                        logoError
                    );
                }
            }


            /* COMPANY */

            pdf.setFont(
                "helvetica",
                "bold"
            );


            pdf.setFontSize(
                11
            );


            const companyLines =
                pdf.splitTextToSize(
                    company.companyName ||
                    "Jufelix Services",
                    68
                );


            pdf.text(
                companyLines,
                40,
                y,
                {
                    align:
                        "center"
                }
            );


            y +=
                companyLines.length *
                4.5;


            pdf.setFont(
                "helvetica",
                "normal"
            );


            pdf.setFontSize(
                7
            );


            if (
                company.address
            ) {

                const addressLines =
                    pdf.splitTextToSize(
                        company.address,
                        68
                    );


                pdf.text(
                    addressLines,
                    40,
                    y,
                    {
                        align:
                            "center"
                    }
                );


                y +=
                    addressLines.length *
                    3.4;
            }


            if (
                company.phone
            ) {

                pdf.text(
                    "Tel: " +
                    company.phone,
                    40,
                    y,
                    {
                        align:
                            "center"
                    }
                );


                y +=
                    3.5;
            }


            if (
                company.email
            ) {

                pdf.text(
                    company.email,
                    40,
                    y,
                    {
                        align:
                            "center",
                        maxWidth:
                            68
                    }
                );


                y +=
                    3.5;
            }


            y +=
                2;


            pdf.setFont(
                "helvetica",
                "bold"
            );


            pdf.setFontSize(
                8
            );


            pdf.text(
                "SALES RECEIPT",
                40,
                y,
                {
                    align:
                        "center"
                }
            );


            y +=
                5;


            pdf.line(
                5,
                y,
                75,
                y
            );


            y +=
                5;


            /* SALE INFO */

            drawInfoLine(
                pdf,
                "Receipt",
                sale.receiptNumber ||
                sale.id ||
                "—",
                y
            );


            y +=
                4;


            drawInfoLine(
                pdf,
                "Date",
                formatDateTime(
                    sale.createdAt ||
                    sale.saleDate
                ),
                y
            );


            y +=
                4;


            drawInfoLine(
                pdf,
                "Branch",
                sale.branchName ||
                "Head Office",
                y
            );


            y +=
                4;


            drawInfoLine(
                pdf,
                "Cashier",
                sale.cashier ||
                "User",
                y
            );


            y +=
                4;


            drawInfoLine(
                pdf,
                "Payment",
                sale.paymentMethod ||
                "Cash",
                y
            );


            y +=
                6;


            /* ITEMS */

            pdf.setFont(
                "helvetica",
                "bold"
            );


            pdf.text(
                "ITEM",
                5,
                y
            );


            pdf.text(
                "AMOUNT",
                75,
                y,
                {
                    align:
                        "right"
                }
            );


            y +=
                3;


            pdf.line(
                5,
                y,
                75,
                y
            );


            y +=
                4;


            items.forEach(
                function (item) {

                    pdf.setFont(
                        "helvetica",
                        "bold"
                    );


                    pdf.setFontSize(
                        7
                    );


                    const productLines =
                        pdf.splitTextToSize(
                            item.productName ||
                            "Product",
                            44
                        );


                    pdf.text(
                        productLines,
                        5,
                        y
                    );


                    pdf.text(
                        formatMoneyPlain(
                            item.total
                        ),
                        75,
                        y,
                        {
                            align:
                                "right"
                        }
                    );


                    y +=
                        productLines.length *
                        3.5;


                    pdf.setFont(
                        "helvetica",
                        "normal"
                    );


                    pdf.setFontSize(
                        6.5
                    );


                    pdf.text(
                        formatNumber(
                            item.quantity
                        ) +
                        " " +
                        (
                            item.unit ||
                            ""
                        ) +
                        " x " +
                        formatMoneyPlain(
                            item.sellingPrice
                        ),
                        5,
                        y
                    );


                    y +=
                        5;
                }
            );


            /* TOTAL */

            const totalQuantity =
                items.reduce(
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
                );


            pdf.line(
                5,
                y,
                75,
                y
            );


            y +=
                5;


            drawInfoLine(
                pdf,
                "Products",
                String(
                    items.length
                ),
                y
            );


            y +=
                4;


            drawInfoLine(
                pdf,
                "Total Qty",
                formatNumber(
                    totalQuantity
                ),
                y
            );


            y +=
                6;


            pdf.line(
                5,
                y,
                75,
                y
            );


            y +=
                6;


            pdf.setFont(
                "helvetica",
                "bold"
            );


            pdf.setFontSize(
                11
            );


            pdf.text(
                "TOTAL",
                5,
                y
            );


            pdf.text(
                formatMoneyPlain(
                    getSaleTotal(
                        sale
                    )
                ),
                75,
                y,
                {
                    align:
                        "right"
                }
            );


            y +=
                8;


            pdf.setFont(
                "helvetica",
                "normal"
            );


            pdf.setFontSize(
                6.5
            );


            pdf.text(
                company.receiptFooter ||
                "Thank you for doing business with us.",
                40,
                y,
                {
                    align:
                        "center",
                    maxWidth:
                        68
                }
            );


            const fileName =
                sanitizeFileName(
                    sale.receiptNumber ||
                    "Jufelix-Receipt"
                ) +
                ".pdf";


            const pdfBlob =
                pdf.output(
                    "blob"
                );


            sharePDFFile(
                pdfBlob,
                fileName,
                company,
                sale
            );


        } catch (error) {

            console.error(
                "PDF generation error:",
                error
            );


            alert(
                "The PDF could not be created. The receipt itself is still saved."
            );
        }
    }


    function drawInfoLine(
        pdf,
        label,
        value,
        y
    ) {

        pdf.setFont(
            "helvetica",
            "bold"
        );


        pdf.setFontSize(
            7
        );


        pdf.text(
            label + ":",
            5,
            y
        );


        pdf.setFont(
            "helvetica",
            "normal"
        );


        const text =
            String(
                value ||
                "—"
            );


        pdf.text(
            text,
            75,
            y,
            {
                align:
                    "right",
                maxWidth:
                    50
            }
        );
    }


    function sharePDFFile(
        pdfBlob,
        fileName,
        company,
        sale
    ) {

        let pdfFile = null;


        try {

            pdfFile =
                new File(
                    [
                        pdfBlob
                    ],
                    fileName,
                    {
                        type:
                            "application/pdf"
                    }
                );

        } catch (error) {

            console.warn(
                "File API is unavailable:",
                error
            );
        }


        if (
            pdfFile &&
            navigator.share &&
            navigator.canShare
        ) {

            try {

                if (
                    navigator.canShare({
                        files: [
                            pdfFile
                        ]
                    })
                ) {

                    navigator.share({

                        title:
                            (
                                company.companyName ||
                                "Jufelix Services"
                            ) +
                            " Receipt",

                        text:
                            "Receipt " +
                            (
                                sale.receiptNumber ||
                                ""
                            ),

                        files: [
                            pdfFile
                        ]

                    }).catch(
                        function (error) {

                            if (
                                error &&
                                error.name ===
                                    "AbortError"
                            ) {
                                return;
                            }


                            console.warn(
                                "PDF share failed:",
                                error
                            );


                           showPDFMessage(
    pdfBlob,
    fileName
);
                        }
                    );


                    return;
                }

            } catch (error) {

                console.warn(
                    "PDF share detection failed:",
                    error
                );
            }
        }


        /*
         * IMPORTANT:
         * Do not use pdf.save()
         * or window.open().
         *
         * Those were freezing Acode.
         */

showPDFMessage(
    pdfBlob,
    fileName
);
    }


function showPDFMessage(
    pdfBlob,
    fileName
) {

    console.log(
        "PDF created:",
        fileName,
        pdfBlob
    );

    alert(
        "PDF created successfully.\n\n" +
        fileName +
        "\n\n" +
        "Acode freezes when handling generated PDF downloads. " +
        "For now, use Share Receipt. " +
        "Direct PDF download can be enabled when the ERP runs in Chrome or is hosted."
    );
}


    /* ==========================================
       SHARE TEXT RECEIPT
    ========================================== */

    async function shareReceipt() {

        if (!currentSale) {

            alert(
                "No receipt is available."
            );

            return;
        }


        const company =
            getCompanyData();


        const text =
            buildShareText(
                currentSale,
                company
            );


        if (
            navigator.share
        ) {

            try {

                await navigator.share({

                    title:
                        company.companyName +
                        " Receipt",

                    text:
                        text

                });


                return;

            } catch (error) {

                if (
                    error &&
                    error.name ===
                        "AbortError"
                ) {

                    return;
                }


                console.warn(
                    "Receipt sharing failed:",
                    error
                );
            }
        }


        if (
            navigator.clipboard &&
            navigator.clipboard.writeText
        ) {

            try {

                await navigator.clipboard
                    .writeText(
                        text
                    );


                alert(
                    "Receipt copied to clipboard."
                );


                return;

            } catch (error) {

                console.warn(
                    "Clipboard unavailable:",
                    error
                );
            }
        }


        alert(
            "Sharing is not supported by this preview."
        );
    }


    function buildShareText(
        sale,
        company
    ) {

        const items =
            getSaleItems(
                sale
            );


        const lines = [];


        lines.push(
            company.companyName
        );


        lines.push(
            "SALES RECEIPT"
        );


        lines.push(
            "------------------------"
        );


        lines.push(
            "Receipt: " +
            (
                sale.receiptNumber ||
                sale.id ||
                "—"
            )
        );


        lines.push(
            "Date: " +
            formatDateTime(
                sale.createdAt ||
                sale.saleDate
            )
        );


        lines.push(
            "Branch: " +
            (
                sale.branchName ||
                "Head Office"
            )
        );


        lines.push(
            "Cashier: " +
            (
                sale.cashier ||
                "User"
            )
        );


        lines.push(
            "Customer: " +
            (
                sale.customerName ||
                "Walk-in Customer"
            )
        );


        lines.push(
            "Payment: " +
            (
                sale.paymentMethod ||
                "Cash"
            )
        );


        lines.push(
            "------------------------"
        );


        items.forEach(
            function (item) {

                lines.push(
                    (
                        item.productName ||
                        "Product"
                    ) +
                    " - " +
                    formatNumber(
                        item.quantity
                    ) +
                    " " +
                    (
                        item.unit ||
                        ""
                    ) +
                    " x " +
                    formatMoney(
                        item.sellingPrice
                    ) +
                    " = " +
                    formatMoney(
                        item.total
                    )
                );
            }
        );


        lines.push(
            "------------------------"
        );


        lines.push(
            "TOTAL: " +
            formatMoney(
                getSaleTotal(
                    sale
                )
            )
        );


        lines.push(
            ""
        );


        lines.push(
            company.receiptFooter
        );


        return lines.join(
            "\n"
        );
    }


    /* ==========================================
       NEW SALE
    ========================================== */

    function startNewSale() {

        closeReceipt();


        window.scrollTo({
            top:
                0,
            behavior:
                "smooth"
        });


        const productSelect =
            document.getElementById(
                "saleProduct"
            );


        if (productSelect) {

            window.setTimeout(
                function () {

                    try {

                        productSelect.focus();

                    } catch (error) {

                        // Ignore focus errors.
                    }

                },
                200
            );
        }
    }


    /* ==========================================
       CLOSE RECEIPT
    ========================================== */

    function closeReceipt() {

        const overlay =
            document.getElementById(
                "jufelixReceiptOverlay"
            );


        if (overlay) {

            overlay.remove();
        }


        document.body.style.overflow =
            "";
    }


    /* ==========================================
       COMPANY DATA
    ========================================== */

    function getCompanyData() {

        const settings =
            readObject(
                SETTINGS_KEY
            ) ||
            {};


        const company =
            readObject(
                COMPANY_KEY
            ) ||
            {};


        return {

            companyName:
                company.companyName ||
                company.name ||
                settings.companyName ||
                "Jufelix Services",


            phone:
                company.phone ||
                settings.phone ||
                "",


            email:
                company.email ||
                settings.email ||
                "",


            address:
                company.address ||
                settings.address ||
                "",


            taxId:
                company.taxId ||
                settings.taxId ||
                "",


            receiptFooter:
                settings.receiptFooter ||
                company.receiptFooter ||
                "Thank you for doing business with us.",


            currency:
                settings.currency ||
                company.currency ||
                "GHS",


            logo:
                getStoredLogo(
                    settings,
                    company
                )
        };
    }


    function getStoredLogo(
        settings,
        company
    ) {

        if (
            company &&
            (
                company.logo ||
                company.logoUrl
            )
        ) {

            return (
                company.logo ||
                company.logoUrl
            );
        }


        if (
            settings &&
            settings.logo
        ) {

            return settings.logo;
        }


        try {

            return (
                localStorage.getItem(
                    LOGO_KEY
                ) ||
                ""
            );

        } catch (error) {

            return "";
        }
    }


    /* ==========================================
       SALE ITEMS
    ========================================== */

    function getSaleItems(
        sale
    ) {

        if (
            Array.isArray(
                sale.items
            ) &&
            sale.items.length >
                0
        ) {

            return sale.items.map(
                function (item) {

                    const quantity =
                        toNumber(
                            item.quantity
                        );


                    const sellingPrice =
                        toNumber(
                            item.sellingPrice ??
                            item.unitPrice
                        );


                    return {

                        productName:
                            item.productName ||
                            "Product",

                        quantity:
                            quantity,

                        unit:
                            item.unit ||
                            "",

                        sellingPrice:
                            sellingPrice,

                        total:
                            toNumber(
                                item.total ??
                                item.revenue ??
                                (
                                    quantity *
                                    sellingPrice
                                )
                            )
                    };
                }
            );
        }


        /*
         * Compatibility with older
         * single-product sales.
         */

        const quantity =
            toNumber(
                sale.quantity
            );


        const sellingPrice =
            toNumber(
                sale.sellingPrice ??
                sale.unitPrice
            );


        return [
            {
                productName:
                    sale.productName ||
                    "Product",

                quantity:
                    quantity,

                unit:
                    sale.unit ||
                    "",

                sellingPrice:
                    sellingPrice,

                total:
                    getSaleTotal(
                        sale
                    )
            }
        ];
    }


    function getSaleTotal(
        sale
    ) {

        return toNumber(
            sale.total ??
            sale.totalAmount ??
            sale.revenue ??
            sale.grandTotal
        );
    }


    /* ==========================================
       RECEIPT STYLES
    ========================================== */

    function addReceiptStyles() {

        const existing =
            document.getElementById(
                "jufelixReceiptStyles"
            );


        if (existing) {

            existing.remove();
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "jufelixReceiptStyles";


        style.textContent = `

            .jufelix-receipt-overlay {
                position: fixed;
                inset: 0;
                z-index: 60000;
                padding: 8px;
                overflow-y: auto;
                background: rgba(15,23,42,.76);
            }


            .jufelix-receipt-dialog {
                width: 100%;
                max-width: 420px;
                margin: 8px auto;
                overflow: hidden;
                border-radius: 14px;
                background: #ffffff;
                box-shadow:
                    0 20px 60px
                    rgba(0,0,0,.34);
            }


            .receipt-toolbar {
                min-height: 58px;
                padding: 10px 14px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                background:
                    var(
                        --primary,
                        #0b5ed7
                    );
                color: #ffffff;
            }


            .receipt-toolbar > div {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }


            .receipt-toolbar strong {
                font-size: 15px;
            }


            .receipt-toolbar span {
                font-size: 11px;
                opacity: .75;
            }


            .receipt-close-button {
                width: 38px;
                height: 38px;
                min-width: 38px;
                border: none;
                border-radius: 50%;
                background:
                    rgba(
                        255,
                        255,
                        255,
                        .16
                    );
                color: #ffffff;
                font-size: 25px;
                cursor: pointer;
            }


            .receipt-paper {
                padding: 18px 20px;
                background: #ffffff;
                color: #111111;
                font-family:
                    Arial,
                    Helvetica,
                    sans-serif;
            }


            .receipt-header {
                padding-bottom: 12px;
                text-align: center;
                border-bottom:
                    1px dashed
                    #777777;
            }


            .receipt-company-logo {
                width: 58px;
                height: 58px;
                object-fit: contain;
                margin-bottom: 5px;
            }


            .receipt-logo-fallback {
                width: 50px;
                height: 50px;
                margin:
                    0 auto 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                border:
                    2px solid
                    #222222;
                border-radius: 9px;
                font-size: 23px;
                font-weight: 900;
            }


            .receipt-header h1 {
                margin:
                    0 0 5px;
                font-size: 18px;
                line-height: 1.2;
                overflow-wrap: anywhere;
            }


            .receipt-header p {
                margin: 2px 0;
                font-size: 10.5px;
                line-height: 1.4;
            }


            .receipt-title {
                display: inline-block;
                margin-top: 8px;
                padding: 4px 10px;
                border:
                    1px solid
                    #333333;
                border-radius: 3px;
                font-size: 10px;
                font-weight: 900;
                letter-spacing: 1px;
            }


            .receipt-information {
                padding: 10px 0;
                border-bottom:
                    1px dashed
                    #777777;
            }


            .receipt-info-row {
                margin: 4px 0;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 14px;
                font-size: 10.5px;
            }


            .receipt-info-row > span:first-child {
                flex: 0 0 auto;
                font-weight: 700;
            }


            .receipt-info-row > span:last-child,
            .receipt-info-row > strong:last-child {
                min-width: 0;
                text-align: right;
                overflow-wrap: anywhere;
            }


            .receipt-table {
                width: 100%;
                margin-top: 6px;
                border-collapse: collapse;
                table-layout: fixed;
            }


            .receipt-table th {
                padding: 6px 0;
                border-bottom:
                    1px solid
                    #333333;
                text-align: left;
                font-size: 10px;
            }


            .receipt-table th:first-child {
                width: 68%;
            }


            .receipt-table th:last-child {
                width: 32%;
            }


            .receipt-table td {
                padding: 7px 0;
                border-bottom:
                    1px dotted
                    #bbbbbb;
                vertical-align: top;
                font-size: 10.5px;
            }


            .receipt-table td:first-child {
                padding-right: 8px;
            }


            .receipt-item-detail {
                margin-top: 3px;
                color: #555555;
                font-size: 9.5px;
            }


            .receipt-right {
                text-align:
                    right !important;
                white-space: nowrap;
            }


            .receipt-summary {
                padding: 10px 0;
                border-bottom:
                    1px dashed
                    #777777;
            }


            .receipt-summary-row {
                display: flex;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 5px;
                font-size: 10.5px;
            }


            .receipt-grand-total {
                margin-top: 8px;
                padding-top: 8px;
                display: flex;
                justify-content: space-between;
                gap: 12px;
                border-top:
                    2px solid
                    #111111;
                font-size: 17px;
                font-weight: 900;
            }


            .receipt-footer {
                padding-top: 11px;
                text-align: center;
                font-size: 10.5px;
                line-height: 1.5;
            }


            .receipt-footer strong {
                display: block;
                margin-bottom: 4px;
            }


            .receipt-footer p {
                margin: 4px 0;
                color: #555555;
                font-size: 9.5px;
            }


            .receipt-footer small {
                color: #777777;
                font-size: 8.5px;
            }


            .receipt-actions {
                padding: 12px;
                display: grid;
                grid-template-columns:
                    repeat(
                        2,
                        minmax(
                            0,
                            1fr
                        )
                    );
                gap: 9px;
                background: #f8fafc;
                border-top:
                    1px solid
                    #edf0f4;
            }


            .receipt-action-button {
                min-height: 46px;
                padding: 8px 10px;
                border: none;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 800;
                cursor: pointer;
            }


            .receipt-print-button {
                background:
                    var(
                        --primary,
                        #0b5ed7
                    );
                color: #ffffff;
            }


            .receipt-share-button {
                background: #198754;
                color: #ffffff;
            }


            .receipt-new-sale-button {
                background: #f59e0b;
                color: #ffffff;
            }


            .receipt-done-button {
                background: #e5e7eb;
                color: #1f2937;
            }


            @media screen and
            (max-width: 480px) {

                .jufelix-receipt-overlay {
                    padding: 5px;
                }


                .jufelix-receipt-dialog {
                    margin: 5px auto;
                }


                .receipt-paper {
                    padding: 15px;
                }
            }

        `;


        document.head.appendChild(
            style
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
                SETTINGS_KEY
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


    function formatMoneyPlain(
        value
    ) {

        return (
            "GHS " +
            toNumber(
                value
            ).toFixed(
                2
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

            return String(
                value
            );
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


    function sanitizeFileName(
        value
    ) {

        return String(
            value ||
            "receipt"
        ).replace(
            /[^a-zA-Z0-9-_]/g,
            "_"
        );
    }


    function getCompanyInitial(
        companyName
    ) {

        const text =
            String(
                companyName ||
                "J"
            ).trim();


        return (
            text.charAt(0)
                .toUpperCase() ||
            "J"
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
       STORAGE
    ========================================== */

    function readObject(
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


            if (
                parsed &&
                typeof parsed ===
                    "object" &&
                !Array.isArray(
                    parsed
                )
            ) {

                return parsed;
            }


            return null;

        } catch (error) {

            console.warn(
                "Receipt storage read error:",
                key,
                error
            );


            return null;
        }
    }


    /* ==========================================
       PUBLIC API
    ========================================== */

    window.JufelixReceipt = {

        show:
            showReceipt,

        print:
            showReceipt,

        close:
            closeReceipt,

        savePDF:
            generatePDF,

        share:
            shareReceipt,

        getCurrentSale:
            function () {

                return currentSale;
            }
    };


    console.log(
        "window.JufelixReceipt ready:",
        window.JufelixReceipt
    );

})();