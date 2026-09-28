/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   DAILY CLOSING REPORTS MODULE v1

   File: js/modules/closing-reports.js
========================================== */

(function () {
    "use strict";

    const REPORTS_KEY = "jufelix_v7_closing_reports";
    const SALES_KEY = "jufelix_v7_sales";
    const PRODUCTS_KEY = "jufelix_products";
    const BRANCHES_KEY = "jufelix_v7_branches";
    const ACTIVE_BRANCH_KEY = "jufelix_v7_active_branch";
    const CURRENT_USER_KEY = "jufelix_v7_current_user";
    const DEFAULT_BRANCH_ID = "head-office";

    let currentUser = null;
    let reports = [];
    let sales = [];
    let products = [];
    let branches = [];
    let submitting = false;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }

    function initialize() {
        currentUser = readObject(CURRENT_USER_KEY) || readObject("currentUser");

        if (!currentUser) {
            window.location.replace("login.html");
            return;
        }

        refreshData();
        configurePageForRole();
        populateFilters();
        connectEvents();
        renderAll();

        document.addEventListener("jufelix:closing-reports-updated", function () {
            reports = readArray(REPORTS_KEY);
            populateFilters();
            renderAll();
        });

        document.addEventListener("jufelix:data-updated", function (event) {
            const key = event && event.detail ? event.detail.key : "";
            if ([REPORTS_KEY, SALES_KEY, PRODUCTS_KEY, BRANCHES_KEY, ACTIVE_BRANCH_KEY].includes(key)) {
                refreshData();
                populateFilters();
                renderAll();
            }
        });

        window.addEventListener("storage", function (event) {
            if ([REPORTS_KEY, SALES_KEY, PRODUCTS_KEY, BRANCHES_KEY, ACTIVE_BRANCH_KEY].includes(event.key)) {
                refreshData();
                populateFilters();
                renderAll();
            }
        });
    }

    function refreshData() {
        reports = readArray(REPORTS_KEY);
        sales = readArray(SALES_KEY);
        products = readArray(PRODUCTS_KEY);
        branches = ensureHeadOffice(readArray(BRANCHES_KEY));
    }

    function configurePageForRole() {
        const admin = isAdmin();
        document.body.classList.toggle("is-admin", admin);

        const officerPanel = document.getElementById("officerClosingPanel");
        if (officerPanel && admin) officerPanel.style.display = "none";

        setText(
            "pageDescription",
            admin
                ? "Review submitted sales-officer closings and stock values for every branch."
                : "Review today's transactions and submit the closing report for your assigned branch."
        );

        setText("historyHeading", admin ? "All Submitted Closings" : "My Closing History");
    }

    function connectEvents() {
        const submitButton = document.getElementById("submitClosingButton");
        if (submitButton) submitButton.addEventListener("click", submitClosingReport);

        ["closingDateFilter", "closingBranchFilter", "closingOfficerFilter"].forEach(function (id) {
            const element = document.getElementById(id);
            if (element) element.addEventListener("change", renderReports);
        });
    }

    function renderAll() {
        const branchId = getCurrentBranchId();
        setText("activeBranchBadge", getBranchName(branchId));

        if (!isAdmin()) renderOfficerClosing();
        if (isAdmin()) renderBranchStockOverview();
        renderReports();
    }

    function renderOfficerClosing() {
        const date = getLocalDateKey(new Date());
        const branchId = getCurrentBranchId();
        const dailySales = getOfficerSales(date, branchId);
        const salesSummary = summarizeSales(dailySales);
        const stockSummary = buildStockSnapshot(branchId);
        const existing = findCurrentClosing(date, branchId);

        setText("closingHeading", `Today's Closing — ${formatDate(date)}`);
        setText("closingStatus", existing ? "Submitted" : "Not submitted");
        setText("todayTransactions", salesSummary.transactionCount);
        setText("todayItemsSold", formatNumber(salesSummary.totalItemsSold));
        setText("todaySalesValue", formatMoney(salesSummary.totalSalesValue));
        setText("todayGrossProfit", formatMoney(salesSummary.grossProfit));
        setText("todayCash", formatMoney(salesSummary.paymentTotals.cash));
        setText("todayMobileMoney", formatMoney(salesSummary.paymentTotals.mobileMoney));
        setText("todayBank", formatMoney(salesSummary.paymentTotals.bank));
        setText("todayCredit", formatMoney(salesSummary.paymentTotals.credit));
        setText("branchProductCount", stockSummary.productCount);
        setText("branchStockQuantity", formatNumber(stockSummary.totalQuantity));
        setText("branchStockCostValue", formatMoney(stockSummary.costValue));
        setText("branchStockSellingValue", formatMoney(stockSummary.sellingValue));

        const notes = document.getElementById("closingNotes");
        if (notes && document.activeElement !== notes) notes.value = existing ? existing.notes || "" : "";

        const button = document.getElementById("submitClosingButton");
        if (button && !submitting) button.textContent = existing ? "Update Today's Closing" : "Submit Daily Closing";
    }

    async function submitClosingReport() {
        if (submitting) return;

        if (isAdmin()) {
            showNotice("Administrator accounts review closings; a Sales Officer must submit the report.", "error");
            return;
        }

        if (!navigator.onLine) {
            showNotice("Connect to the internet before submitting the daily closing report.", "error");
            return;
        }

        const date = getLocalDateKey(new Date());
        const branchId = getCurrentBranchId();
        const dailySales = getOfficerSales(date, branchId);
        const salesSummary = summarizeSales(dailySales);
        const stockSummary = buildStockSnapshot(branchId);
        const identity = getUserIdentity();
        const existing = findCurrentClosing(date, branchId);
        const now = new Date().toISOString();
        const reportId = existing && existing.id
            ? existing.id
            : createReportId(date, branchId, identity.uid || identity.email || identity.name);

        const report = {
            id: reportId,
            reportDate: date,
            branchId: String(branchId),
            branchName: getBranchName(branchId),
            officerUid: identity.uid,
            officerId: identity.id,
            officerName: identity.name,
            officerEmail: identity.email,
            transactionCount: salesSummary.transactionCount,
            totalItemsSold: salesSummary.totalItemsSold,
            totalSalesValue: salesSummary.totalSalesValue,
            totalCOGS: salesSummary.totalCOGS,
            grossProfit: salesSummary.grossProfit,
            paymentTotals: salesSummary.paymentTotals,
            transactions: salesSummary.transactions,
            stockProductCount: stockSummary.productCount,
            stockTotalQuantity: stockSummary.totalQuantity,
            stockCostValue: stockSummary.costValue,
            stockSellingValue: stockSummary.sellingValue,
            stockSnapshot: stockSummary.items,
            notes: getValue("closingNotes"),
            status: "submitted",
            submittedAt: existing && existing.submittedAt ? existing.submittedAt : now,
            updatedAt: now
        };

        submitting = true;
        setSubmitState(true);

        try {
            const cloud = await waitForClosingCloud(15000);
            await cloud.saveReport(report);
            upsertLocalReport(report);
            showNotice(existing ? "Today's closing report was updated successfully." : "Daily closing report submitted successfully.", "success");
            renderAll();
        } catch (error) {
            console.error("Closing report submission failed:", error);
            showNotice(error && error.message ? error.message : "Unable to submit the closing report.", "error");
        } finally {
            submitting = false;
            setSubmitState(false);
        }
    }

    function getOfficerSales(date, branchId) {
        const identity = getUserIdentity();
        const normalizedName = normalize(identity.name);
        const normalizedEmail = normalize(identity.email);

        return sales.filter(function (sale) {
            if (!sale || normalizeDate(sale.saleDate || sale.createdAt) !== date) return false;
            if (String(sale.branchId || DEFAULT_BRANCH_ID) !== String(branchId)) return false;

            const recordedUid = String(sale.cashierUid || sale.cashierId || sale.officerUid || sale.createdByUid || "");
            const recordedEmail = normalize(sale.cashierEmail || sale.officerEmail || sale.createdByEmail);
            const recordedName = normalize(sale.cashier || sale.officerName || sale.createdBy);

            if (identity.uid && recordedUid) return recordedUid === String(identity.uid);
            if (normalizedEmail && recordedEmail) return recordedEmail === normalizedEmail;
            return Boolean(normalizedName && recordedName === normalizedName);
        });
    }

    function summarizeSales(records) {
        const summary = {
            transactionCount: records.length,
            totalItemsSold: 0,
            totalSalesValue: 0,
            totalCOGS: 0,
            grossProfit: 0,
            paymentTotals: { cash: 0, mobileMoney: 0, bank: 0, credit: 0, other: 0 },
            transactions: []
        };

        records.forEach(function (sale) {
            const value = toNumber(sale.totalAmount ?? sale.total ?? sale.revenue);
            const cost = toNumber(sale.cogs ?? sale.costTotal);
            const quantity = toNumber(sale.totalQuantity || sumItemQuantity(sale.items));
            const paymentKey = normalizePaymentMethod(sale.paymentMethod);

            summary.totalItemsSold += quantity;
            summary.totalSalesValue += value;
            summary.totalCOGS += cost;
            summary.paymentTotals[paymentKey] += value;
            summary.transactions.push({
                id: sale.id || "",
                receiptNumber: sale.receiptNumber || sale.reference || "",
                createdAt: sale.createdAt || sale.saleDate || "",
                customerName: sale.customerName || "Walk-in Customer",
                paymentMethod: sale.paymentMethod || "Unknown",
                itemCount: toNumber(sale.itemCount || (Array.isArray(sale.items) ? sale.items.length : 0)),
                quantity: quantity,
                amount: value,
                cogs: cost,
                grossProfit: toNumber(sale.grossProfit || (value - cost))
            });
        });

        summary.grossProfit = summary.totalSalesValue - summary.totalCOGS;
        summary.transactions.sort(function (a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); });
        return summary;
    }

    function buildStockSnapshot(branchId) {
        const items = products.map(function (product) {
            const quantity = getProductBranchStock(product, branchId);
            const costPrice = toNumber(product.costPrice);
            const sellingPrice = toNumber(product.sellingPrice);

            return {
                productId: product.id || "",
                productName: product.name || "Unnamed Product",
                sku: product.sku || "",
                category: product.category || "",
                unit: product.unit || "",
                quantity: quantity,
                costPrice: costPrice,
                sellingPrice: sellingPrice,
                costValue: quantity * costPrice,
                sellingValue: quantity * sellingPrice
            };
        });

        return {
            productCount: items.length,
            totalQuantity: items.reduce(function (total, item) { return total + item.quantity; }, 0),
            costValue: items.reduce(function (total, item) { return total + item.costValue; }, 0),
            sellingValue: items.reduce(function (total, item) { return total + item.sellingValue; }, 0),
            items: items
        };
    }

    function renderBranchStockOverview() {
        const body = document.getElementById("branchStockOverviewBody");
        if (!body) return;

        body.innerHTML = branches.map(function (branch) {
            const branchId = getBranchId(branch);
            const stock = buildStockSnapshot(branchId);
            return `<tr><td><strong>${escapeHTML(getBranchName(branchId))}</strong></td><td>${stock.productCount}</td><td>${formatNumber(stock.totalQuantity)}</td><td>${formatMoney(stock.costValue)}</td><td>${formatMoney(stock.sellingValue)}</td></tr>`;
        }).join("");

        if (!body.innerHTML) body.innerHTML = '<tr><td colspan="5" class="empty-cell">No branches available.</td></tr>';
    }

    function renderReports() {
        const body = document.getElementById("closingReportsBody");
        if (!body) return;

        const dateFilter = getValue("closingDateFilter");
        const branchFilter = getValue("closingBranchFilter");
        const officerFilter = getValue("closingOfficerFilter");
        const identity = getUserIdentity();

        const visible = reports.filter(function (report) {
            if (!isAdmin()) {
                const ownUid = identity.uid && String(report.officerUid || "") === String(identity.uid);
                const ownEmail = identity.email && normalize(report.officerEmail) === normalize(identity.email);
                const ownName = normalize(report.officerName) === normalize(identity.name);
                if (!(ownUid || ownEmail || ownName)) return false;
            }
            if (dateFilter && report.reportDate !== dateFilter) return false;
            if (branchFilter && String(report.branchId) !== branchFilter) return false;
            if (officerFilter && getReportOfficerKey(report) !== officerFilter) return false;
            return true;
        }).sort(function (a, b) {
            return String(b.reportDate || b.updatedAt || "").localeCompare(String(a.reportDate || a.updatedAt || ""));
        });

        if (!visible.length) {
            body.innerHTML = '<tr><td colspan="9" class="empty-cell">No closing reports found.</td></tr>';
            closeDetails();
            return;
        }

        body.innerHTML = visible.map(function (report) {
            return `<tr>
                <td>${escapeHTML(formatDate(report.reportDate))}</td>
                <td>${escapeHTML(report.branchName || getBranchName(report.branchId))}</td>
                <td><strong>${escapeHTML(report.officerName || report.officerEmail || "Sales Officer")}</strong><br><small>${escapeHTML(report.officerEmail || "")}</small></td>
                <td>${formatNumber(report.transactionCount)}</td>
                <td>${formatNumber(report.totalItemsSold)}</td>
                <td>${formatMoney(report.totalSalesValue)}</td>
                <td>${formatNumber(report.stockTotalQuantity)}</td>
                <td>${formatMoney(report.stockCostValue)}</td>
                <td><button type="button" class="details-button" data-report-id="${escapeHTML(report.id)}">View</button></td>
            </tr>`;
        }).join("");

        body.querySelectorAll("[data-report-id]").forEach(function (button) {
            button.addEventListener("click", function () { showReportDetails(button.dataset.reportId); });
        });
    }

    function showReportDetails(reportId) {
        const report = reports.find(function (item) { return String(item.id) === String(reportId); });
        const panel = document.getElementById("closingDetailsPanel");
        if (!report || !panel) return;

        const payment = report.paymentTotals || {};
        const transactions = Array.isArray(report.transactions) ? report.transactions : [];
        const stock = Array.isArray(report.stockSnapshot) ? report.stockSnapshot : [];

        panel.innerHTML = `
            <div class="panel" style="box-shadow:none;margin-bottom:0;">
                <div class="panel-header"><h2>${escapeHTML(report.branchName || "Branch")} — ${escapeHTML(formatDate(report.reportDate))}</h2><button type="button" class="details-button" id="closeDetailsButton">Close</button></div>
                <p><strong>Sales Officer:</strong> ${escapeHTML(report.officerName || report.officerEmail || "—")}</p>
                <p><strong>Notes:</strong> ${escapeHTML(report.notes || "No closing notes")}</p>
                <div class="summary-grid" style="margin-top:14px;">
                    <div class="summary-card"><span>Transactions</span><strong>${formatNumber(report.transactionCount)}</strong></div>
                    <div class="summary-card"><span>Total Sales</span><strong>${formatMoney(report.totalSalesValue)}</strong></div>
                    <div class="summary-card"><span>Cash</span><strong>${formatMoney(payment.cash)}</strong></div>
                    <div class="summary-card"><span>Mobile Money</span><strong>${formatMoney(payment.mobileMoney)}</strong></div>
                    <div class="summary-card"><span>Bank / Card</span><strong>${formatMoney(payment.bank)}</strong></div>
                    <div class="summary-card"><span>Credit</span><strong>${formatMoney(payment.credit)}</strong></div>
                    <div class="summary-card"><span>Stock Quantity</span><strong>${formatNumber(report.stockTotalQuantity)}</strong></div>
                    <div class="summary-card"><span>Stock Cost Value</span><strong>${formatMoney(report.stockCostValue)}</strong></div>
                </div>
                <h3 class="subheading">Transactions</h3>
                <div class="table-wrap"><table><thead><tr><th>Time</th><th>Receipt</th><th>Customer</th><th>Payment</th><th>Quantity</th><th>Value</th></tr></thead><tbody>
                    ${transactions.length ? transactions.map(function (item) { return `<tr><td>${escapeHTML(formatTime(item.createdAt))}</td><td>${escapeHTML(item.receiptNumber || "—")}</td><td>${escapeHTML(item.customerName || "Walk-in")}</td><td>${escapeHTML(item.paymentMethod || "—")}</td><td>${formatNumber(item.quantity)}</td><td>${formatMoney(item.amount)}</td></tr>`; }).join("") : '<tr><td colspan="6" class="empty-cell">No transactions recorded.</td></tr>'}
                </tbody></table></div>
                <h3 class="subheading">Closing Stock Snapshot</h3>
                <div class="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Quantity</th><th>Cost Price</th><th>Cost Value</th><th>Selling Value</th></tr></thead><tbody>
                    ${stock.length ? stock.map(function (item) { return `<tr><td>${escapeHTML(item.productName)}</td><td>${escapeHTML(item.sku || "—")}</td><td>${formatNumber(item.quantity)} ${escapeHTML(item.unit || "")}</td><td>${formatMoney(item.costPrice)}</td><td>${formatMoney(item.costValue)}</td><td>${formatMoney(item.sellingValue)}</td></tr>`; }).join("") : '<tr><td colspan="6" class="empty-cell">No stock snapshot recorded.</td></tr>'}
                </tbody></table></div>
            </div>`;

        panel.classList.add("open");
        const closeButton = document.getElementById("closeDetailsButton");
        if (closeButton) closeButton.addEventListener("click", closeDetails);
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function closeDetails() {
        const panel = document.getElementById("closingDetailsPanel");
        if (panel) {
            panel.classList.remove("open");
            panel.innerHTML = "";
        }
    }

    function populateFilters() {
        if (!isAdmin()) return;
        populateSelect("closingBranchFilter", branches.map(function (branch) { return { value: getBranchId(branch), label: getBranchName(getBranchId(branch)) }; }), "All Branches");

        const officers = [];
        const seen = new Set();
        reports.forEach(function (report) {
            const value = getReportOfficerKey(report);
            if (!value || seen.has(value)) return;
            seen.add(value);
            officers.push({ value: value, label: report.officerName || report.officerEmail || "Sales Officer" });
        });
        populateSelect("closingOfficerFilter", officers, "All Officers");
    }

    function populateSelect(id, options, firstLabel) {
        const select = document.getElementById(id);
        if (!select) return;
        const selected = select.value;
        select.innerHTML = `<option value="">${escapeHTML(firstLabel)}</option>` + options.map(function (option) { return `<option value="${escapeHTML(option.value)}">${escapeHTML(option.label)}</option>`; }).join("");
        if (options.some(function (option) { return option.value === selected; })) select.value = selected;
    }

    function findCurrentClosing(date, branchId) {
        const identity = getUserIdentity();
        return reports.find(function (report) {
            if (report.reportDate !== date || String(report.branchId) !== String(branchId)) return false;
            if (identity.uid && report.officerUid) return String(report.officerUid) === String(identity.uid);
            if (identity.email && report.officerEmail) return normalize(report.officerEmail) === normalize(identity.email);
            return normalize(report.officerName) === normalize(identity.name);
        }) || null;
    }

    function upsertLocalReport(report) {
        const current = readArray(REPORTS_KEY);
        const index = current.findIndex(function (item) { return String(item.id) === String(report.id); });
        if (index >= 0) current[index] = report; else current.push(report);
        localStorage.setItem(REPORTS_KEY, JSON.stringify(current));
        reports = current;
    }

    function waitForClosingCloud(timeout) {
        return new Promise(function (resolve, reject) {
            const started = Date.now();
            (function check() {
                if (window.JufelixClosingReportsCloud && typeof window.JufelixClosingReportsCloud.saveReport === "function") {
                    resolve(window.JufelixClosingReportsCloud);
                    return;
                }
                if (Date.now() - started >= timeout) {
                    reject(new Error("Closing Reports Cloud did not become ready."));
                    return;
                }
                window.setTimeout(check, 100);
            })();
        });
    }

    function getProductBranchStock(product, branchId) {
        const stock = product && product.branchStock && typeof product.branchStock === "object" ? product.branchStock : {};
        if (Object.prototype.hasOwnProperty.call(stock, String(branchId))) return toNumber(stock[String(branchId)]);

        const branch = branches.find(function (item) { return branchMatches(item, branchId); });
        if (branch) {
            const candidates = [branch.id, branch.branchId, branch.code, branch.branchName, branch.name].filter(Boolean).map(String);
            const key = Object.keys(stock).find(function (actual) { return candidates.some(function (candidate) { return normalize(candidate) === normalize(actual); }); });
            if (key !== undefined) return toNumber(stock[key]);
        }

        return String(branchId) === DEFAULT_BRANCH_ID ? toNumber(product.quantity) : 0;
    }

    function getCurrentBranchId() {
        if (!isAdmin()) {
            return String(currentUser.branchId || currentUser.branch || currentUser.branchCode || DEFAULT_BRANCH_ID);
        }

        const active = readObject(ACTIVE_BRANCH_KEY);
        return String((active && (active.id || active.branchId || active.code)) || currentUser.branchId || DEFAULT_BRANCH_ID);
    }

    function getBranchName(branchId) {
        const branch = branches.find(function (item) { return branchMatches(item, branchId); });
        if (branch) return branch.branchName || branch.name || branch.code || "Branch";
        return String(branchId) === DEFAULT_BRANCH_ID ? "Head Office" : "Branch";
    }

    function branchMatches(branch, value) {
        const target = normalize(value);
        return [branch.id, branch.branchId, branch.code, branch.branchName, branch.name].some(function (candidate) { return normalize(candidate) === target; });
    }

    function getBranchId(branch) {
        return String(branch.id || branch.branchId || branch.code || DEFAULT_BRANCH_ID);
    }

    function ensureHeadOffice(list) {
        const result = Array.isArray(list) ? list.slice() : [];
        if (!result.some(function (branch) { return branchMatches(branch, DEFAULT_BRANCH_ID); })) {
            result.unshift({ id: DEFAULT_BRANCH_ID, branchId: DEFAULT_BRANCH_ID, branchName: "Head Office", name: "Head Office" });
        }
        return result;
    }

    function getUserIdentity() {
        return {
            uid: String(currentUser.uid || currentUser.firebaseUid || ""),
            id: String(currentUser.id || currentUser.userId || ""),
            name: currentUser.fullName || currentUser.name || currentUser.username || currentUser.email || "Sales Officer",
            email: String(currentUser.email || "")
        };
    }

    function isAdmin() {
        const role = normalizeRole(currentUser.role);
        return role === "admin";
    }

    function normalizeRole(role) {
        const value = normalize(role).replace(/_/g, "-").replace(/\s+/g, "-");
        return ["administrator", "system-administrator"].includes(value) ? "admin" : value;
    }

    function normalizePaymentMethod(method) {
        const value = normalize(method).replace(/[-_]/g, " ");
        if (value.includes("cash")) return "cash";
        if (value.includes("momo") || value.includes("mobile")) return "mobileMoney";
        if (value.includes("bank") || value.includes("card") || value.includes("transfer")) return "bank";
        if (value.includes("credit")) return "credit";
        return "other";
    }

    function sumItemQuantity(items) {
        return Array.isArray(items) ? items.reduce(function (total, item) { return total + toNumber(item.quantity); }, 0) : 0;
    }

    function getReportOfficerKey(report) {
        return String(report.officerUid || report.officerEmail || report.officerId || report.officerName || "");
    }

    function createReportId(date, branchId, officer) {
        return [date, branchId, officer].map(function (value) { return String(value || "unknown").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-"); }).join("__");
    }

    function setSubmitState(saving) {
        const button = document.getElementById("submitClosingButton");
        if (!button) return;
        button.disabled = saving;
        button.textContent = saving ? "Submitting..." : "Submit Daily Closing";
    }

    function showNotice(message, type) {
        const notice = document.getElementById("closingNotice");
        if (!notice) return;
        notice.className = `notice ${type}`;
        notice.textContent = message;
        window.setTimeout(function () { notice.className = "notice"; notice.textContent = ""; }, 7000);
    }

    function readArray(key) {
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function readObject(key) {
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || "null");
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function getValue(id) {
        const element = document.getElementById(id);
        return element ? String(element.value || "").trim() : "";
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function toNumber(value) {
        const number = Number(typeof value === "string" ? value.replace(/,/g, "").trim() : value);
        return Number.isFinite(number) ? number : 0;
    }

    function normalize(value) {
        return String(value || "").trim().toLowerCase();
    }

    function normalizeDate(value) {
        if (!value) return "";
        const text = String(value);
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "" : getLocalDateKey(date);
    }

    function getLocalDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function formatDate(value) {
        if (!value) return "—";
        const date = new Date(`${value}T00:00:00`);
        return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("en-GH", { year: "numeric", month: "short", day: "numeric" }).format(date);
    }

    function formatTime(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-GH", { hour: "2-digit", minute: "2-digit" }).format(date);
    }

    function formatMoney(value) {
        return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 2 }).format(toNumber(value));
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("en-GH", { maximumFractionDigits: 2 }).format(toNumber(value));
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    window.JufelixClosingReports = {
        refresh: function () { refreshData(); populateFilters(); renderAll(); }
    };
})();
