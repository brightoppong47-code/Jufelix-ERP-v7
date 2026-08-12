/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   PWA INSTALL MANAGER

   File:
   js/core/pwa-install.js
========================================== */

(function () {

    "use strict";


    let deferredPrompt =
        null;


    let installButton =
        null;


    document.addEventListener(
        "DOMContentLoaded",
        initializePwaInstall
    );


    function initializePwaInstall() {

        installButton =
            document.getElementById(
                "installAppButton"
            );


        if (installButton) {

            installButton.style.display =
                "none";


            installButton.addEventListener(
                "click",
                installApplication
            );

        }


        window.addEventListener(
            "beforeinstallprompt",
            function (event) {

                event.preventDefault();


                deferredPrompt =
                    event;


                if (installButton) {

                    installButton.style.display =
                        "inline-flex";

                }

            }
        );


        window.addEventListener(
            "appinstalled",
            function () {

                deferredPrompt =
                    null;


                if (installButton) {

                    installButton.style.display =
                        "none";

                }


                console.log(
                    "Jufelix ERP installed successfully."
                );

            }
        );


        if (
            isRunningStandalone()
        ) {

            if (installButton) {

                installButton.style.display =
                    "none";

            }


            document.documentElement
                .classList.add(
                    "jufelix-installed-app"
                );

        }

    }


    async function installApplication() {

        if (!deferredPrompt) {

            alert(
                "Install is not available yet. Open Jufelix ERP in Chrome and try again."
            );

            return;

        }


        try {

            deferredPrompt.prompt();


            const choice =
                await deferredPrompt
                    .userChoice;


            console.log(
                "Install choice:",
                choice.outcome
            );


        } catch (error) {

            console.error(
                "PWA install error:",
                error
            );

        } finally {

            deferredPrompt =
                null;


            if (installButton) {

                installButton.style.display =
                    "none";

            }

        }

    }


    function isRunningStandalone() {

        return (
            window.matchMedia &&
            window
                .matchMedia(
                    "(display-mode: standalone)"
                )
                .matches
        ) ||
        window.navigator
            .standalone ===
            true;

    }


    window.JufelixPWA = {

        isInstalled:
            isRunningStandalone,

        install:
            installApplication

    };

})();