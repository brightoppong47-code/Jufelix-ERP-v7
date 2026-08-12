/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   Global Theme Loader
   File: js/core/theme.js
========================================== */

(function () {
    "use strict";

    const SETTINGS_KEY = "jufelix_v7_settings";
    const THEME_KEY = "jufelix_v7_theme";

    const THEMES = {

        "jufelix-blue": {
            primary: "#0b5ed7",
            primaryDark: "#084298",
            background: "#f5f7fb",
            surface: "#ffffff",
            text: "#1f2937",
            muted: "#6b7280"
        },

        "royal-purple": {
            primary: "#5b168d",
            primaryDark: "#3e0d65",
            background: "#f8f5fb",
            surface: "#ffffff",
            text: "#21152d",
            muted: "#756b7d"
        },

        "dark": {
            primary: "#2563eb",
            primaryDark: "#1d4ed8",
            background: "#111827",
            surface: "#1f2937",
            text: "#f9fafb",
            muted: "#cbd5e1"
        },

        "classic-light": {
            primary: "#2563eb",
            primaryDark: "#1d4ed8",
            background: "#f8fafc",
            surface: "#ffffff",
            text: "#0f172a",
            muted: "#64748b"
        }
    };

    applySavedTheme();

    document.addEventListener(
        "DOMContentLoaded",
        applySavedTheme
    );

    document.addEventListener(
        "jufelix:settingsChanged",
        function (event) {

            const theme =
                event.detail &&
                event.detail.theme
                    ? event.detail.theme
                    : getSavedTheme();

            applyTheme(theme);
        }
    );


    function applySavedTheme() {

        applyTheme(
            getSavedTheme()
        );
    }


    function getSavedTheme() {

        const directTheme =
            localStorage.getItem(
                THEME_KEY
            );

        if (directTheme) {
            return directTheme;
        }


        try {

            const settings =
                JSON.parse(
                    localStorage.getItem(
                        SETTINGS_KEY
                    ) ||
                    "null"
                );

            if (
                settings &&
                settings.theme
            ) {
                return settings.theme;
            }

        } catch (error) {
            console.warn(
                "Unable to read theme settings.",
                error
            );
        }


        return "jufelix-blue";
    }


    function applyTheme(themeName) {

        const theme =
            THEMES[themeName] ||
            THEMES["jufelix-blue"];

        const root =
            document.documentElement;


        root.style.setProperty(
            "--primary",
            theme.primary
        );

        root.style.setProperty(
            "--primary-color",
            theme.primary
        );

        root.style.setProperty(
            "--primary-dark",
            theme.primaryDark
        );

        root.style.setProperty(
            "--background",
            theme.background
        );

        root.style.setProperty(
            "--background-color",
            theme.background
        );

        root.style.setProperty(
            "--surface",
            theme.surface
        );

        root.style.setProperty(
            "--card-bg",
            theme.surface
        );

        root.style.setProperty(
            "--text",
            theme.text
        );

        root.style.setProperty(
            "--text-color",
            theme.text
        );

        root.style.setProperty(
            "--muted",
            theme.muted
        );


        document.body.style.backgroundColor =
            theme.background;

        document.body.style.color =
            theme.text;


        /*
         * Existing Sidebar
         */

        const sidebar =
            document.getElementById(
                "sidebar"
            );

        if (sidebar) {

            sidebar.style.setProperty(
                "background",
                theme.primary,
                "important"
            );
        }


        /*
         * Existing Topbar
         */

        const topbar =
            document.getElementById(
                "topbar"
            );

        if (topbar) {

            topbar.style.setProperty(
                "background",
                theme.surface,
                "important"
            );

            topbar.style.setProperty(
                "color",
                theme.text,
                "important"
            );
        }


        /*
         * Main content
         */

        document
            .querySelectorAll(
                ".main-content"
            )
            .forEach(
                function (element) {

                    element.style.setProperty(
                        "background",
                        theme.background,
                        "important"
                    );

                    element.style.setProperty(
                        "color",
                        theme.text,
                        "important"
                    );
                }
            );


        /*
         * Cards and panels
         */

        document
            .querySelectorAll(
                ".card, .summary-card, .sales-panel, .stat-box, .dashboard-card"
            )
            .forEach(
                function (element) {

                    element.style.background =
                        theme.surface;

                    element.style.color =
                        theme.text;
                }
            );


        /*
         * Primary buttons
         */

        document
            .querySelectorAll(
                ".btn-primary, .complete-sale-button"
            )
            .forEach(
                function (element) {

                    element.style.setProperty(
                        "background",
                        theme.primary,
                        "important"
                    );
                }
            );


        /*
         * Inputs
         */

        document
            .querySelectorAll(
                ".form-control"
            )
            .forEach(
                function (element) {

                    element.style.background =
                        theme.surface;

                    element.style.color =
                        theme.text;
                }
            );


        document.documentElement.setAttribute(
            "data-theme",
            themeName
        );

        document.body.setAttribute(
            "data-theme",
            themeName
        );


        localStorage.setItem(
            THEME_KEY,
            themeName
        );
    }


    window.JufelixTheme = {
        apply: applyTheme,
        current: getSavedTheme
    };

})();