/* =========================================
   JUFELIX ERP v7.0
   MAIN APPLICATION STARTUP
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const startupMessage =
        document.getElementById("startupMessage");

    const startupStatus =
        document.getElementById("startupStatus");

    const startupError =
        document.getElementById("startupError");

    const continueButton =
        document.getElementById("continueButton");

    const currentYear =
        document.getElementById("currentYear");

    /*
     * Display the current year.
     */
    if (currentYear) {
        currentYear.textContent =
            new Date().getFullYear();
    }

    /*
     * Small delay used for displaying
     * each startup check clearly.
     */
    function delay(milliseconds) {
        return new Promise((resolve) => {
            setTimeout(resolve, milliseconds);
        });
    }

    /*
     * Mark one system check as complete.
     */
    function completeCheck(elementId) {
        const checkElement =
            document.getElementById(elementId);

        if (!checkElement) {
            return;
        }

        checkElement.classList.add("complete");

        const icon =
            checkElement.querySelector(".check-icon");

        if (icon) {
            icon.textContent = "✓";
        }
    }

    /*
     * Display a startup error.
     */
    function showError(message) {
        if (startupStatus) {
            startupStatus.classList.add("hidden");
        }

        if (startupError) {
            startupError.classList.remove("hidden");
            startupError.textContent = message;
        }
    }

    /*
     * Run all foundation checks.
     */
    async function startApplication() {
        try {
            if (!startupMessage) {
                throw new Error(
                    "Startup message element was not found."
                );
            }

            startupMessage.textContent =
                "Checking application interface...";

            await delay(350);

            completeCheck("htmlCheck");

            startupMessage.textContent =
                "Checking storage service...";

            await delay(350);

            if (
                !window.JufelixStorage ||
                !window.JufelixStorage.isAvailable()
            ) {
                throw new Error(
                    "The storage service is not available."
                );
            }

            completeCheck("storageCheck");

            startupMessage.textContent =
                "Loading application configuration...";

            await delay(350);

            if (
                !window.JUFELIX_CONFIG ||
                !window.JUFELIX_CONFIG.appName
            ) {
                throw new Error(
                    "Application configuration could not be loaded."
                );
            }

            completeCheck("configCheck");

            startupMessage.textContent =
                "Preparing database service...";

            await delay(350);

            if (
                !window.JufelixDatabase ||
                !window.JufelixDatabase.isReady()
            ) {
                throw new Error(
                    "The database service is not ready."
                );
            }

            completeCheck("databaseCheck");

            /*
             * Save startup information.
             */
            const existingFirstStart =
                window.JufelixStorage.get(
                    "first_started_at",
                    null
                );

            const systemInformation = {
                appName:
                    window.JUFELIX_CONFIG.appName,

                version:
                    window.JUFELIX_CONFIG.version,

                databaseMode:
                    window.JufelixDatabase.getMode(),

                storageMode:
                    window.JufelixStorage.getMode(),

                firstStartedAt:
                    existingFirstStart ||
                    new Date().toISOString(),

                lastStartedAt:
                    new Date().toISOString()
            };

            if (!existingFirstStart) {
                window.JufelixStorage.set(
                    "first_started_at",
                    systemInformation.firstStartedAt
                );
            }

            window.JufelixStorage.set(
                "system_information",
                systemInformation
            );

            if (startupStatus) {
                startupStatus.classList.add("success");
            }

            startupMessage.textContent =
                "Jufelix ERP foundation is working correctly.";

            if (continueButton) {
                continueButton.classList.remove("hidden");
            }

            console.log(
                "Jufelix ERP started successfully.",
                systemInformation
            );
        } catch (error) {
            console.error(
                "Jufelix ERP startup failed:",
                error
            );

            showError(
                `Startup error: ${error.message}`
            );
        }
    }

    /*
     * Open the login page.
     */
    if (continueButton) {
        continueButton.addEventListener(
            "click",
            () => {
window.location.href = "./login.html";
            }
        );
    }

    startApplication();
});