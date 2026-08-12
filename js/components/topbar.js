/* =========================================================
   JUFELIX ERP v7.0 PROFESSIONAL
   Shared Branded + Theme-Aware Topbar Component

   File:
   js/components/topbar.js
========================================================= */

(function () {
    "use strict";

    document.addEventListener(
        "DOMContentLoaded",
        initializeTopbar
    );

    document.addEventListener(
        "jufelix:settingsChanged",
        function () {
            initializeTopbar();
        }
    );


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initializeTopbar() {

        const topbar =
            document.getElementById(
                "topbar"
            );

        if (!topbar) {

            console.warn(
                "Jufelix Topbar: #topbar was not found."
            );

            return;
        }

        const currentUser =
            getCurrentUser();

        const company =
            getCompanySettings();

        topbar.innerHTML =
            createTopbarMarkup(
                currentUser,
                company
            );

        addTopbarStyles();

        createSidebarOverlay();

        connectTopbarEvents();

        updateTopbarDateTime();

        applyCurrentTheme();

        startClock();
    }


    /* =====================================================
       MARKUP
    ===================================================== */

    function createTopbarMarkup(
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
            "User";

        const role =
            formatRole(
                user.role
            );

        const branchName =
            user.branchName ||
            getActiveBranchName() ||
            "Head Office";


        return `

            <div class="topbar-inner">


                <div class="topbar-left">


                    <button
                        type="button"
                        id="topbarMenuButton"
                        class="topbar-menu-button"
                        aria-label="Open menu"
                    >

                        <span></span>
                        <span></span>
                        <span></span>

                    </button>


                    <div class="topbar-brand-logo">

                        ${createLogoMarkup(
                            companyLogo,
                            companyName
                        )}

                    </div>


                    <div class="topbar-company">

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

                        <span id="topbarDateTime">
                            Loading date...
                        </span>

                    </div>


                </div>



                <div class="topbar-right">


                    <div class="topbar-user-info">

                        <strong>
                            ${escapeHTML(
                                fullName
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                role
                            )}
                            ·
                            ${escapeHTML(
                                branchName
                            )}
                        </span>

                    </div>


                    <button
                        type="button"
                        id="topbarLogoutButton"
                        class="topbar-logout-button"
                    >
                        Logout
                    </button>


                </div>


            </div>

        `;
    }


    /* =====================================================
       LOGO
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
                    class="topbar-logo-fallback"
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

            <span class="topbar-logo-fallback">

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
       EVENTS
    ===================================================== */

    function connectTopbarEvents() {

        const menuButton =
            document.getElementById(
                "topbarMenuButton"
            );

        const logoutButton =
            document.getElementById(
                "topbarLogoutButton"
            );

        const overlay =
            document.getElementById(
                "sidebarOverlay"
            );


        if (menuButton) {

            menuButton.addEventListener(
                "click",
                toggleSidebar
            );
        }


        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                logoutUser
            );
        }


        if (overlay) {

            overlay.onclick =
                closeSidebar;
        }


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
       SIDEBAR CONTROL
    ===================================================== */

    function toggleSidebar() {

        if (
            window.JufelixSidebar &&
            typeof window
                .JufelixSidebar
                .toggle ===
                "function"
        ) {

            window.JufelixSidebar
                .toggle();

            return;
        }


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


        const isOpen =
            sidebar.classList.contains(
                "sidebar-open"
            );


        if (isOpen) {

            closeSidebar();

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

        if (
            window.JufelixSidebar &&
            typeof window
                .JufelixSidebar
                .close ===
                "function"
        ) {

            window.JufelixSidebar
                .close();

            return;
        }


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


    /* =====================================================
       OVERLAY
    ===================================================== */

    function createSidebarOverlay() {

        if (
            document.getElementById(
                "sidebarOverlay"
            )
        ) {

            return;
        }


        const overlay =
            document.createElement(
                "div"
            );


        overlay.id =
            "sidebarOverlay";


        overlay.className =
            "sidebar-overlay";


        document.body.appendChild(
            overlay
        );
    }


    /* =====================================================
       DATE / TIME
    ===================================================== */

    function updateTopbarDateTime() {

        const dateElement =
            document.getElementById(
                "topbarDateTime"
            );


        if (!dateElement) {
            return;
        }


        const currentDate =
            new Date();


        dateElement.textContent =
            currentDate.toLocaleString(
                "en-GH",
                {
                    weekday:
                        "short",

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


    function startClock() {

        if (
            window.JufelixTopbarClock
        ) {

            window.clearInterval(
                window.JufelixTopbarClock
            );
        }


        window.JufelixTopbarClock =
            window.setInterval(
                updateTopbarDateTime,
                60000
            );
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
       ACTIVE BRANCH
    ===================================================== */

    function getActiveBranchName() {

        const branch =
            readStoredObject(
                "jufelix_v7_active_branch"
            );


        if (!branch) {
            return "";
        }


        return (
            branch.branchName ||
            branch.name ||
            ""
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


    function getSavedCompanyLogo() {

        try {

            return (
                localStorage.getItem(
                    "jufelix_v7_company_logo"
                ) ||
                ""
            );

        } catch (error) {

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
       STYLES
    ===================================================== */

    function addTopbarStyles() {

        const existing =
            document.getElementById(
                "jufelixTopbarStyles"
            );


        if (existing) {

            existing.remove();
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "jufelixTopbarStyles";


        style.textContent = `

            .topbar {
                width: 100%;
                background: transparent;
            }


            .topbar-inner {
                min-height: 72px;

                padding:
                    12px 22px;

                display: flex;

                align-items:
                    center;

                justify-content:
                    space-between;

                gap: 20px;

                position: relative;

                z-index: 800;

                background:
                    var(
                        --surface,
                        #ffffff
                    );

                color:
                    var(
                        --text-color,
                        #1f2937
                    );

                border-bottom:
                    1px solid
                    rgba(
                        148,
                        163,
                        184,
                        .25
                    );

                box-shadow:
                    0 2px 10px
                    rgba(
                        0,
                        0,
                        0,
                        .05
                    );
            }


            .topbar-left,
            .topbar-right {
                display: flex;

                align-items:
                    center;
            }


            .topbar-left {
                gap: 12px;

                min-width: 0;
            }


            .topbar-right {
                gap: 16px;

                margin-left: auto;
            }


            .topbar-menu-button {
                width: 44px;
                height: 44px;

                min-width: 44px;

                display: none;

                align-items:
                    center;

                justify-content:
                    center;

                flex-direction:
                    column;

                gap: 5px;

                border: none;

                border-radius: 9px;

                background:
                    var(
                        --primary,
                        #0b5ed7
                    );

                cursor: pointer;
            }


            .topbar-menu-button span {
                width: 22px;

                height: 3px;

                border-radius: 5px;

                background: #ffffff;
            }


            .topbar-brand-logo {
                width: 42px;
                height: 42px;

                min-width: 42px;

                display: flex;

                align-items:
                    center;

                justify-content:
                    center;

                overflow: hidden;

                border-radius: 10px;

                background:
                    var(
                        --primary,
                        #0b5ed7
                    );
            }


            .topbar-brand-logo img {
                width: 100%;
                height: 100%;

                object-fit: contain;

                padding: 3px;

                background: #ffffff;
            }


            .topbar-logo-fallback {
                width: 100%;
                height: 100%;

                display: flex;

                align-items:
                    center;

                justify-content:
                    center;

                color: #ffffff;

                font-size: 21px;

                font-weight: 900;
            }


            .topbar-company {
                display: flex;

                flex-direction:
                    column;

                min-width: 0;
            }


            .topbar-company strong {
                max-width: 350px;

                overflow: hidden;

                text-overflow:
                    ellipsis;

                white-space: nowrap;

                color:
                    var(
                        --text-color,
                        #1f2937
                    );

                font-size: 18px;
            }


            .topbar-company span {
                margin-top: 4px;

                color:
                    var(
                        --muted,
                        #6b7280
                    );

                font-size: 12px;
            }


            .topbar-user-info {
                display: flex;

                flex-direction:
                    column;

                text-align: right;
            }


            .topbar-user-info strong {
                color:
                    var(
                        --text-color,
                        #1f2937
                    );

                font-size: 14px;
            }


            .topbar-user-info span {
                margin-top: 3px;

                color:
                    var(
                        --muted,
                        #6b7280
                    );

                font-size: 12px;
            }


            .topbar-logout-button {
                min-height: 40px;

                padding:
                    0 16px;

                border: none;

                border-radius: 8px;

                background:
                    #dc3545;

                color: #ffffff;

                font-weight: 700;

                cursor: pointer;
            }


            .topbar-logout-button:hover {
                background:
                    #bb2d3b;
            }


            .sidebar-overlay {
                position: fixed;

                inset: 0;

                z-index: 900;

                display: none;

                background:
                    rgba(
                        15,
                        23,
                        42,
                        .48
                    );
            }


            .sidebar-overlay.show {
                display: block;
            }


            body.sidebar-menu-open {
                overflow: hidden;
            }


            @media screen and
            (max-width: 900px) {

                .topbar-menu-button {
                    display: flex;
                }

            }


            @media screen and
            (max-width: 650px) {

                .topbar-inner {
                    min-height:
                        66px;

                    padding:
                        10px 14px;
                }


                .topbar-brand-logo {
                    width: 38px;
                    height: 38px;

                    min-width: 38px;
                }


                .topbar-company strong {
                    max-width:
                        145px;

                    font-size:
                        15px;
                }


                .topbar-user-info {
                    display: none;
                }


                .topbar-logout-button {
                    padding:
                        0 12px;
                }

            }


            @media screen and
            (max-width: 430px) {

                .topbar-company span {
                    display: none;
                }


                .topbar-brand-logo {
                    width: 36px;
                    height: 36px;

                    min-width: 36px;
                }


                .topbar-company strong {
                    max-width:
                        120px;
                }


                .topbar-logout-button {
                    font-size:
                        12px;
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

    window.JufelixTopbar = {

        initialize:
            initializeTopbar,

        refresh:
            initializeTopbar,

        toggleSidebar:
            toggleSidebar,

        closeSidebar:
            closeSidebar
    };

})();