/* =========================================================
   JUFELIX ERP v7.0 PROFESSIONAL
   Responsive + Branded + Theme-Aware Sidebar

   File:
   js/components/sidebar.js
========================================================= */

(function () {
    "use strict";

    document.addEventListener(
        "DOMContentLoaded",
        initializeSidebar
    );

    document.addEventListener(
        "jufelix:settingsChanged",
        function () {
            initializeSidebar();
        }
    );


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initializeSidebar() {

        document.body.classList.remove(
            "sidebar-menu-open"
        );

        const sidebar =
            document.getElementById(
                "sidebar"
            );

        if (!sidebar) {

            console.warn(
                "Jufelix Sidebar: #sidebar was not found."
            );

            return;
        }

        sidebar.classList.remove(
            "sidebar-open"
        );

        const currentUser =
            getCurrentUser();

        const company =
            getCompanySettings();

        sidebar.innerHTML =
            createSidebarMarkup(
                currentUser,
                company
            );

        addSidebarStyles();

        highlightCurrentPage();

        connectSidebarEvents();

        applyRolePermissions();

        hideEmptySidebarSections();

        window.setTimeout(
            function () {

                closeSidebar();

                applyCurrentTheme();

            },
            0
        );
    }


    /* =====================================================
       SIDEBAR MARKUP
    ===================================================== */

    function createSidebarMarkup(
        user,
        company
    ) {

        const companyName =
            company.companyName ||
            company.name ||
            "Jufelix Services";

        const companyLogo =
    getSavedCompanyLogo() ||
    company.logo ||
    company.logoUrl ||
    "";

        const fullName =
            user.fullName ||
            user.name ||
            user.email ||
            user.username ||
            "System Administrator";

        const userRole =
            formatRole(
                user.role ||
                "admin"
            );

        return `

            <div class="sidebar-header">

                <div class="sidebar-brand">

                    <div class="sidebar-logo">

                        ${createLogoMarkup(
                            companyLogo,
                            companyName
                        )}

                    </div>

                    <div class="sidebar-brand-text">

                        <strong
                            data-company-name
                            title="${escapeHTML(
                                companyName
                            )}"
                        >
                            ${escapeHTML(
                                companyName
                            )}
                        </strong>

                        <span>
                            ERP v7.0 Professional
                        </span>

                    </div>

                </div>


                <button
                    type="button"
                    id="sidebarCloseButton"
                    class="sidebar-close-button"
                    aria-label="Close navigation menu"
                >
                    ×
                </button>

            </div>


            <div class="sidebar-user">

                <div class="sidebar-user-avatar">

                    ${escapeHTML(
                        getInitials(
                            fullName
                        )
                    )}

                </div>

                <div class="sidebar-user-details">

                    <strong
                        title="${escapeHTML(
                            fullName
                        )}"
                    >
                        ${escapeHTML(
                            fullName
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            userRole
                        )}
                    </span>

                </div>

            </div>


            <nav class="sidebar-navigation">


                <p class="sidebar-section-title">
                    MAIN
                </p>


                <a
                    href="dashboard.html"
                    class="sidebar-link"
                    data-page="dashboard.html"
                >

                    <span class="sidebar-link-icon">
                        🏠
                    </span>

                    <span>
                        Dashboard
                    </span>

                </a>


                <a
                    href="sales.html"
                    class="sidebar-link"
                    data-page="sales.html"
                    data-permission="sales"
                >

                    <span class="sidebar-link-icon">
                        🛒
                    </span>

                    <span>
                        Sales / POS
                    </span>

                </a>


                <a
                    href="inventory.html"
                    class="sidebar-link"
                    data-page="inventory.html"
                    data-permission="inventory"
                >

                    <span class="sidebar-link-icon">
                        📦
                    </span>

                    <span>
                        Inventory
                    </span>

                </a>


                <a
                    href="purchases.html"
                    class="sidebar-link"
                    data-page="purchases.html"
                    data-permission="purchases"
                >

                    <span class="sidebar-link-icon">
                        🧾
                    </span>

                    <span>
                        Purchases
                    </span>

                </a>


                <a
                    href="transfers.html"
                    class="sidebar-link"
                    data-page="transfers.html"
                    data-permission="transfers"
                >

                    <span class="sidebar-link-icon">
                        🔄
                    </span>

                    <span>
                        Stock Transfers
                    </span>

                </a>



                <p class="sidebar-section-title">
                    BUSINESS
                </p>


                <a
                    href="customers.html"
                    class="sidebar-link"
                    data-page="customers.html"
                    data-permission="customers"
                >

                    <span class="sidebar-link-icon">
                        👥
                    </span>

                    <span>
                        Customers
                    </span>

                </a>


                <a
                    href="suppliers.html"
                    class="sidebar-link"
                    data-page="suppliers.html"
                    data-permission="suppliers"
                >

                    <span class="sidebar-link-icon">
                        🚚
                    </span>

                    <span>
                        Suppliers
                    </span>

                </a>


                <a
                    href="expenses.html"
                    class="sidebar-link"
                    data-page="expenses.html"
                    data-permission="expenses"
                >

                    <span class="sidebar-link-icon">
                        💸
                    </span>

                    <span>
                        Expenses
                    </span>

                </a>


                <a
                    href="reports.html"
                    class="sidebar-link"
                    data-page="reports.html"
                    data-permission="reports"
                >

                    <span class="sidebar-link-icon">
                        📊
                    </span>

                    <span>
                        Reports
                    </span>

                </a>



                <p class="sidebar-section-title">
                    MANAGEMENT
                </p>


                <a
                    href="branches.html"
                    class="sidebar-link"
                    data-page="branches.html"
                    data-permission="branches"
                >

                    <span class="sidebar-link-icon">
                        🏢
                    </span>

                    <span>
                        Branches
                    </span>

                </a>


                <a
                    href="users.html"
                    class="sidebar-link"
                    data-page="users.html"
                    data-permission="users"
                >

                    <span class="sidebar-link-icon">
                        👤
                    </span>

                    <span>
                        Users
                    </span>

                </a>


                <a
                    href="settings.html"
                    class="sidebar-link"
                    data-page="settings.html"
                    data-permission="settings"
                >

                    <span class="sidebar-link-icon">
                        ⚙️
                    </span>

                    <span>
                        Settings
                    </span>

                </a>

            </nav>



            <div class="sidebar-footer">

                <button
                    type="button"
                    id="sidebarLogoutButton"
                    class="sidebar-logout-button"
                >

                    <span>
                        🚪
                    </span>

                    Logout

                </button>


                <small>
                    Jufelix ERP v7.0
                </small>

            </div>

        `;
    }


    /* =====================================================
       COMPANY LOGO
    ===================================================== */

    function createLogoMarkup(
        logoUrl,
        companyName
    ) {

        if (logoUrl) {

            return `

                <img
                    data-company-logo
                    src="${escapeHTML(
                        logoUrl
                    )}"
                    alt="${escapeHTML(
                        companyName
                    )}"
                    onerror="
                        this.style.display='none';
                        this.nextElementSibling.style.display='flex';
                    "
                >

                <span
                    class="sidebar-logo-fallback"
                    style="display:none;"
                >
                    ${escapeHTML(
                        getCompanyInitial(
                            companyName
                        )
                    )}
                </span>

            `;
        }


        return `

            <span class="sidebar-logo-fallback">

                ${escapeHTML(
                    getCompanyInitial(
                        companyName
                    )
                )}

            </span>

        `;
    }


    function getCompanyInitial(
        companyName
    ) {

        const text =
            String(
                companyName ||
                "Jufelix"
            ).trim();

        return (
            text.charAt(0)
                .toUpperCase() ||
            "J"
        );
    }


    /* =====================================================
       SIDEBAR EVENTS
    ===================================================== */

    function connectSidebarEvents() {

        const closeButton =
            document.getElementById(
                "sidebarCloseButton"
            );

        const logoutButton =
            document.getElementById(
                "sidebarLogoutButton"
            );

        const sidebarLinks =
            document.querySelectorAll(
                ".sidebar-link"
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeSidebar
            );
        }


        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                logoutUser
            );
        }


        sidebarLinks.forEach(
            function (link) {

                link.addEventListener(
                    "click",
                    function () {

                        if (
                            window.innerWidth <=
                            900
                        ) {

                            closeSidebar();
                        }
                    }
                );
            }
        );


        window.addEventListener(
            "resize",
            function () {

                if (
                    window.innerWidth >
                    900
                ) {

                    closeSidebar();
                }
            }
        );
    }


    /* =====================================================
       CURRENT PAGE
    ===================================================== */

    function highlightCurrentPage() {

        let currentPage =
            window.location.pathname
                .split("/")
                .pop()
                .split("?")[0]
                .split("#")[0];


        if (
            !currentPage ||
            currentPage ===
                "index.html"
        ) {

            currentPage =
                "dashboard.html";
        }


        document
            .querySelectorAll(
                ".sidebar-link"
            )
            .forEach(
                function (link) {

                    const page =
                        link.getAttribute(
                            "data-page"
                        );

                    link.classList.remove(
                        "active"
                    );


                    if (
                        page ===
                        currentPage
                    ) {

                        link.classList.add(
                            "active"
                        );
                    }
                }
            );
    }


    /* =====================================================
       PERMISSIONS
    ===================================================== */

    function applyRolePermissions() {

        const links =
            document.querySelectorAll(
                "[data-permission]"
            );


        links.forEach(
            function (link) {

                const permission =
                    link.getAttribute(
                        "data-permission"
                    );


                let allowed =
                    false;


                if (
                    window.JufelixPermissions &&
                    typeof window
                        .JufelixPermissions
                        .hasPermission ===
                        "function"
                ) {

                    allowed =
                        window
                            .JufelixPermissions
                            .hasPermission(
                                permission
                            );

                } else {

                    /*
                     * Safe fallback.
                     */

                    const user =
                        getCurrentUser();

                    allowed =
                        normalizeRole(
                            user.role
                        ) ===
                        "admin";
                }


                link.style.display =
                    allowed
                        ? "flex"
                        : "none";
            }
        );
    }


    function hideEmptySidebarSections() {

        const titles =
            document.querySelectorAll(
                ".sidebar-section-title"
            );


        titles.forEach(
            function (title) {

                let next =
                    title.nextElementSibling;

                let visible =
                    false;


                while (
                    next &&
                    !next.classList.contains(
                        "sidebar-section-title"
                    )
                ) {

                    if (
                        next.classList.contains(
                            "sidebar-link"
                        ) &&
                        next.style.display !==
                            "none"
                    ) {

                        visible =
                            true;

                        break;
                    }


                    next =
                        next.nextElementSibling;
                }


                title.style.display =
                    visible
                        ? "block"
                        : "none";
            }
        );
    }


    /* =====================================================
       OPEN / CLOSE
    ===================================================== */

    function openSidebar() {

        const sidebar =
            document.getElementById(
                "sidebar"
            );

        const overlay =
            document.getElementById(
                "sidebarOverlay"
            );


        if (!sidebar) {
            return;
        }


        sidebar.classList.add(
            "sidebar-open"
        );


        if (overlay) {

            overlay.classList.add(
                "show"
            );
        }


        document.body.classList.add(
            "sidebar-menu-open"
        );
    }


    function closeSidebar() {

        const sidebar =
            document.getElementById(
                "sidebar"
            );

        const overlay =
            document.getElementById(
                "sidebarOverlay"
            );


        if (sidebar) {

            sidebar.classList.remove(
                "sidebar-open"
            );
        }


        if (overlay) {

            overlay.classList.remove(
                "show"
            );
        }


        document.body.classList.remove(
            "sidebar-menu-open"
        );
    }


    function toggleSidebar() {

        const sidebar =
            document.getElementById(
                "sidebar"
            );


        if (!sidebar) {
            return;
        }


        if (
            sidebar.classList.contains(
                "sidebar-open"
            )
        ) {

            closeSidebar();

        } else {

            openSidebar();
        }
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    function logoutUser() {

        const confirmed =
            window.confirm(
                "Are you sure you want to logout?"
            );


        if (!confirmed) {
            return;
        }


        localStorage.removeItem(
            "jufelix_v7_current_user"
        );

        localStorage.removeItem(
            "currentUser"
        );

        localStorage.removeItem(
            "loggedIn"
        );

        localStorage.removeItem(
            "jufelix_v7_active_branch"
        );

        sessionStorage.removeItem(
            "jufelixSessionActive"
        );


        window.location.replace(
            "login.html"
        );
    }


    /* =====================================================
       CURRENT USER
    ===================================================== */

    function getCurrentUser() {

        return (
            readStoredObject(
                "jufelix_v7_current_user"
            ) ||
            readStoredObject(
                "currentUser"
            ) ||
            {}
        );
    }


    /* =====================================================
       COMPANY SETTINGS
    ===================================================== */

    function getCompanySettings() {

        const company =
            readStoredObject(
                "jufelix_v7_company"
            );


        if (company) {
            return company;
        }


        const legacyCompany =
            readStoredObject(
                "companySettings"
            );


        if (legacyCompany) {
            return legacyCompany;
        }


        const settings =
            readStoredObject(
                "jufelix_v7_settings"
            );


        if (settings) {

            return {

                companyName:
                    settings.companyName,

                name:
                    settings.companyName,

                logo:
                    settings.logo,

                logoUrl:
                    settings.logo,

                phone:
                    settings.phone,

                email:
                    settings.email,

                address:
                    settings.address
            };
        }


        return {};
    }
    /* =====================================================
   SAVED COMPANY LOGO
===================================================== */

function getSavedCompanyLogo() {

    try {

        const savedLogo =
            localStorage.getItem(
                "jufelix_v7_company_logo"
            );

        return savedLogo || "";

    } catch (error) {

        console.warn(
            "Unable to read company logo:",
            error
        );

        return "";
    }
}


    /* =====================================================
       THEME
    ===================================================== */

    function applyCurrentTheme() {

        if (
            window.JufelixTheme &&
            typeof window
                .JufelixTheme
                .current ===
                "function" &&
            typeof window
                .JufelixTheme
                .apply ===
                "function"
        ) {

            window.JufelixTheme.apply(
                window.JufelixTheme.current()
            );
        }
    }


    /* =====================================================
       STORAGE
    ===================================================== */

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

            console.warn(
                "Unable to read storage:",
                storageKey,
                error
            );


            return null;
        }
    }


    /* =====================================================
       USER INITIALS
    ===================================================== */

    function getInitials(
        name
    ) {

        const cleanedName =
            String(
                name ||
                "User"
            ).trim();


        if (!cleanedName) {
            return "U";
        }


        const parts =
            cleanedName.split(
                /\s+/
            );


        if (
            parts.length ===
            1
        ) {

            return parts[0]
                .charAt(0)
                .toUpperCase();
        }


        return (
            parts[0].charAt(0) +
            parts[
                parts.length - 1
            ].charAt(0)
        ).toUpperCase();
    }


    /* =====================================================
       ROLE
    ===================================================== */

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


    function formatRole(
        role
    ) {

        const normalized =
            normalizeRole(
                role
            );


        const roles = {

            admin:
                "Administrator",

            manager:
                "Manager",

            "sales-officer":
                "Sales Officer",

            cashier:
                "Cashier",

            "store-keeper":
                "Store Keeper",

            accountant:
                "Accountant"
        };


        return (
            roles[
                normalized
            ] ||
            role ||
            "User"
        );
    }


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

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


    /* =====================================================
       SIDEBAR CSS
    ===================================================== */

    function addSidebarStyles() {

        const oldStyle =
            document.getElementById(
                "jufelixSidebarStyles"
            );


        if (oldStyle) {

            oldStyle.remove();
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "jufelixSidebarStyles";


        style.textContent = `

            #sidebar.sidebar {
                position: fixed;
                top: 0;
                left: 0;

                width: 270px;
                height: 100vh;

                display: flex;
                flex-direction: column;

                overflow-y: auto;

                z-index: 2000;

                background:
                    var(
                        --primary,
                        #0b5ed7
                    );

                color: #ffffff;

                transition:
                    transform .25s ease;

                box-shadow:
                    4px 0 18px
                    rgba(0,0,0,.14);
            }


            .sidebar-header {
                min-height: 80px;

                padding: 16px;

                display: flex;

                align-items: center;

                justify-content:
                    space-between;

                gap: 10px;

                border-bottom:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        .15
                    );
            }


            .sidebar-brand {
                min-width: 0;

                display: flex;

                align-items: center;

                gap: 11px;
            }


            .sidebar-logo {
                width: 48px;
                height: 48px;

                min-width: 48px;

                display: flex;

                align-items: center;

                justify-content:
                    center;

                overflow: hidden;

                border-radius: 11px;

                background: #ffffff;
            }


            .sidebar-logo img {
                width: 100%;
                height: 100%;

                object-fit: contain;

                padding: 4px;
            }


            .sidebar-logo-fallback {
                width: 100%;
                height: 100%;

                display: flex;

                align-items: center;

                justify-content:
                    center;

                color:
                    var(
                        --primary,
                        #0b5ed7
                    );

                font-size: 26px;

                font-weight: 900;
            }


            .sidebar-brand-text {
                min-width: 0;

                display: flex;

                flex-direction:
                    column;
            }


            .sidebar-brand-text strong {
                max-width: 160px;

                overflow: hidden;

                text-overflow:
                    ellipsis;

                white-space: nowrap;

                color: #ffffff;

                font-size: 16px;
            }


            .sidebar-brand-text span {
                margin-top: 3px;

                color:
                    rgba(
                        255,
                        255,
                        255,
                        .72
                    );

                font-size: 11px;
            }


            .sidebar-close-button {
                display: none;

                width: 38px;
                height: 38px;

                min-width: 38px;

                border: none;

                border-radius: 8px;

                background:
                    rgba(
                        255,
                        255,
                        255,
                        .15
                    );

                color: #ffffff;

                font-size: 27px;

                cursor: pointer;
            }


            .sidebar-user {
                margin: 15px;

                padding: 13px;

                display: flex;

                align-items: center;

                gap: 11px;

                border-radius: 11px;

                background:
                    rgba(
                        255,
                        255,
                        255,
                        .12
                    );
            }


            .sidebar-user-avatar {
                width: 42px;
                height: 42px;

                min-width: 42px;

                display: flex;

                align-items: center;

                justify-content:
                    center;

                border-radius: 50%;

                background: #ffffff;

                color:
                    var(
                        --primary,
                        #0b5ed7
                    );

                font-weight: 800;
            }


            .sidebar-user-details {
                min-width: 0;

                display: flex;

                flex-direction:
                    column;
            }


            .sidebar-user-details strong {
                overflow: hidden;

                text-overflow:
                    ellipsis;

                white-space: nowrap;

                color: #ffffff;

                font-size: 14px;
            }


            .sidebar-user-details span {
                margin-top: 3px;

                color:
                    rgba(
                        255,
                        255,
                        255,
                        .75
                    );

                font-size: 12px;
            }


            .sidebar-navigation {
                flex: 1;

                padding:
                    5px 12px 20px;
            }


            .sidebar-section-title {
                margin:
                    17px 12px 8px;

                color:
                    rgba(
                        255,
                        255,
                        255,
                        .55
                    );

                font-size: 10px;

                font-weight: 800;

                letter-spacing:
                    1.2px;
            }


            .sidebar-link {
                min-height: 46px;

                margin-bottom: 4px;

                padding:
                    11px 13px;

                border-radius: 9px;

                display: flex;

                align-items: center;

                gap: 12px;

                color:
                    rgba(
                        255,
                        255,
                        255,
                        .9
                    );

                text-decoration: none;

                font-size: 14px;

                font-weight: 600;

                transition:
                    background .2s ease,
                    color .2s ease;
            }


            .sidebar-link:hover {
                background:
                    rgba(
                        255,
                        255,
                        255,
                        .14
                    );

                color: #ffffff;
            }


            .sidebar-link.active {
                background: #ffffff;

                color:
                    var(
                        --primary,
                        #0b5ed7
                    );
            }


            .sidebar-link-icon {
                width: 23px;

                text-align: center;

                font-size: 18px;
            }


            .sidebar-footer {
                padding: 15px;

                border-top:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        .15
                    );
            }


            .sidebar-logout-button {
                width: 100%;

                min-height: 44px;

                border: none;

                border-radius: 9px;

                background:
                    rgba(
                        255,
                        255,
                        255,
                        .13
                    );

                color: #ffffff;

                font-weight: 700;

                cursor: pointer;
            }


            .sidebar-logout-button:hover {
                background:
                    #dc3545;
            }


            .sidebar-footer small {
                display: block;

                margin-top: 10px;

                text-align: center;

                color:
                    rgba(
                        255,
                        255,
                        255,
                        .55
                    );
            }


            .main-content {
                min-height: 100vh;

                margin-left:
                    270px;
            }


            @media screen and
            (max-width: 900px) {

                #sidebar.sidebar {
                    position:
                        fixed !important;

                    top:
                        0 !important;

                    left:
                        0 !important;

                    width:
                        280px !important;

                    max-width:
                        86vw !important;

                    height:
                        100vh !important;

                    margin:
                        0 !important;

                    background:
                        var(
                            --primary,
                            #0b5ed7
                        ) !important;

                    color:
                        #ffffff !important;

                    z-index:
                        2000 !important;

                    overflow-y:
                        auto !important;

                    transform:
                        translateX(
                            -105%
                        ) !important;

                    visibility:
                        hidden !important;

                    pointer-events:
                        none !important;

                    transition:
                        transform .25s ease,
                        visibility .25s ease !important;

                    box-shadow:
                        5px 0 22px
                        rgba(
                            0,
                            0,
                            0,
                            .25
                        ) !important;
                }


                #sidebar.sidebar.sidebar-open {
                    transform:
                        translateX(
                            0
                        ) !important;

                    visibility:
                        visible !important;

                    pointer-events:
                        auto !important;
                }


                .sidebar-close-button {
                    display:
                        block !important;
                }


                .main-content {
                    width:
                        100% !important;

                    max-width:
                        100% !important;

                    margin-left:
                        0 !important;
                }
            }

        `;


        document.head.appendChild(
            style
        );
    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.JufelixSidebar = {

        initialize:
            initializeSidebar,

        refresh:
            initializeSidebar,

        open:
            openSidebar,

        close:
            closeSidebar,

        toggle:
            toggleSidebar
    };

})();