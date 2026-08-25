/* =========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   MAIN APPLICATION STARTUP

   Production Build: 1204

   File:
   js/app.js

   + Foundation checks
   + Build information
   + Session-aware routing
   + Offline remembered-session support
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        "use strict";


        /* =====================================
           STORAGE KEYS
        ====================================== */

        const CURRENT_USER_KEY =
            "jufelix_v7_current_user";

        const OFFLINE_ACCESS_KEY =
            "jufelix_v7_offline_access";


        /* =====================================
           ELEMENTS
        ====================================== */

        const startupMessage =
            document.getElementById(
                "startupMessage"
            );


        const startupStatus =
            document.getElementById(
                "startupStatus"
            );


        const startupError =
            document.getElementById(
                "startupError"
            );


        const continueButton =
            document.getElementById(
                "continueButton"
            );


        const currentYear =
            document.getElementById(
                "currentYear"
            );


        /* =====================================
           CURRENT YEAR
        ====================================== */

        if (
            currentYear
        ) {

            currentYear.textContent =
                new Date()
                    .getFullYear();
        }


        /* =====================================
           DELAY
        ====================================== */

        function delay(
            milliseconds
        ) {

            return new Promise(
                function (
                    resolve
                ) {

                    window.setTimeout(
                        resolve,
                        milliseconds
                    );
                }
            );
        }


        /* =====================================
           COMPLETE CHECK
        ====================================== */

        function completeCheck(
            elementId
        ) {

            const checkElement =
                document.getElementById(
                    elementId
                );


            if (
                !checkElement
            ) {

                return;
            }


            checkElement.classList.add(
                "complete"
            );


            const icon =
                checkElement.querySelector(
                    ".check-icon"
                );


            if (
                icon
            ) {

                icon.textContent =
                    "✓";
            }
        }


        /* =====================================
           SHOW ERROR
        ====================================== */

        function showError(
            message
        ) {

            if (
                startupStatus
            ) {

                startupStatus.classList.add(
                    "hidden"
                );
            }


            if (
                startupError
            ) {

                startupError.classList.remove(
                    "hidden"
                );


                startupError.textContent =
                    message;
            }
        }


        /* =====================================
           READ STORED OBJECT
        ====================================== */

        function readStoredObject(
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


            } catch (
                error
            ) {

                console.warn(
                    "Startup storage read failed:",
                    key,
                    error
                );


                return null;
            }
        }


        /* =====================================
           VALID ERP SESSION
        ====================================== */

        function hasValidErpSession() {

            const currentUser =
                readStoredObject(
                    CURRENT_USER_KEY
                ) ||
                readStoredObject(
                    "currentUser"
                );


            if (
                !currentUser
            ) {

                return false;
            }


            if (
                !currentUser.uid &&
                !currentUser.id
            ) {

                return false;
            }


            const status =
                String(
                    currentUser.status ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            if (
                status !==
                "active"
            ) {

                return false;
            }


            if (
                localStorage.getItem(
                    "loggedIn"
                ) !==
                "true"
            ) {

                return false;
            }


            /*
             * ONLINE:
             *
             * A valid local ERP session may
             * continue to the dashboard.
             *
             * Firebase/auth-guard will perform
             * further checks inside the app.
             */

            if (
                navigator.onLine
            ) {

                return true;
            }


            /*
             * OFFLINE:
             *
             * Require explicit remembered
             * offline access from login.js.
             */

            return (
                localStorage.getItem(
                    OFFLINE_ACCESS_KEY
                ) ===
                "true" &&
                currentUser
                    .firebaseAuthenticated ===
                true
            );
        }


        /* =====================================
           ROUTE USER
        ====================================== */

        function routeToApplication() {

            if (
                hasValidErpSession()
            ) {

                console.log(
                    "✅ Existing ERP session detected. Opening dashboard."
                );


                window.location.replace(
                    "./dashboard.html"
                );


                return;
            }


            console.log(
                "No reusable ERP session. Opening login."
            );


            window.location.replace(
                "./login.html"
            );
        }


        /* =====================================
           START APPLICATION
        ====================================== */

        async function startApplication() {

            try {

                if (
                    !startupMessage
                ) {

                    throw new Error(
                        "Startup message element was not found."
                    );
                }


                /* =================================
                   INTERFACE
                ================================== */

                startupMessage.textContent =
                    "Checking application interface...";


                await delay(
                    250
                );


                completeCheck(
                    "htmlCheck"
                );


                /* =================================
                   STORAGE
                ================================== */

                startupMessage.textContent =
                    "Checking storage service...";


                await delay(
                    250
                );


                if (
                    !window.JufelixStorage ||
                    typeof window
                        .JufelixStorage
                        .isAvailable !==
                        "function" ||
                    !window
                        .JufelixStorage
                        .isAvailable()
                ) {

                    throw new Error(
                        "The storage service is not available."
                    );
                }


                completeCheck(
                    "storageCheck"
                );


                /* =================================
                   CONFIGURATION
                ================================== */

                startupMessage.textContent =
                    "Loading application configuration...";


                await delay(
                    250
                );


                if (
                    !window.JUFELIX_CONFIG ||
                    !window.JUFELIX_CONFIG
                        .appName
                ) {

                    throw new Error(
                        "Application configuration could not be loaded."
                    );
                }


                completeCheck(
                    "configCheck"
                );


                /* =================================
                   DATABASE
                ================================== */

                startupMessage.textContent =
                    "Preparing database service...";


                await delay(
                    250
                );


                if (
                    !window.JufelixDatabase ||
                    typeof window
                        .JufelixDatabase
                        .isReady !==
                        "function" ||
                    !window
                        .JufelixDatabase
                        .isReady()
                ) {

                    throw new Error(
                        "The database service is not ready."
                    );
                }


                completeCheck(
                    "databaseCheck"
                );


                /* =================================
                   SYSTEM INFORMATION
                ================================== */

                const existingFirstStart =
                    window
                        .JufelixStorage
                        .get(
                            "first_started_at",
                            null
                        );


                const config =
                    window.JUFELIX_CONFIG;


                const systemInformation = {

                    appName:
                        config.appName,

                    fullName:
                        config.fullName ||
                        config.appName,

                    version:
                        config.version ||
                        "7.0.0",

                    build:
                        config.build ||
                        "1204",

                    environment:
                        config.environment ||
                        "production",

                    databaseMode:
                        window
                            .JufelixDatabase
                            .getMode(),

                    storageMode:
                        window
                            .JufelixStorage
                            .getMode(),

                    firebaseEnabled:
                        Boolean(
                            config.features &&
                            config.features
                                .firebase
                        ),

                    offlineMode:
                        Boolean(
                            config.features &&
                            config.features
                                .offlineMode
                        ),

                    pwa:
                        Boolean(
                            config.features &&
                            config.features
                                .pwa
                        ),

                    online:
                        navigator.onLine,

                    firstStartedAt:
                        existingFirstStart ||
                        new Date()
                            .toISOString(),

                    lastStartedAt:
                        new Date()
                            .toISOString()
                };


                if (
                    !existingFirstStart
                ) {

                    window
                        .JufelixStorage
                        .set(
                            "first_started_at",
                            systemInformation
                                .firstStartedAt
                        );
                }


                window
                    .JufelixStorage
                    .set(
                        "system_information",
                        systemInformation
                    );


                /* =================================
                   SUCCESS
                ================================== */

                if (
                    startupStatus
                ) {

                    startupStatus
                        .classList
                        .add(
                            "success"
                        );
                }


                if (
                    hasValidErpSession()
                ) {

                    startupMessage.textContent =
                        navigator.onLine

                            ? "Jufelix ERP is ready. Existing session found."

                            : "Jufelix ERP is ready in offline mode.";


                    if (
                        continueButton
                    ) {

                        continueButton.textContent =
                            "Continue to Dashboard";
                    }


                } else {

                    startupMessage.textContent =
                        navigator.onLine

                            ? "Jufelix ERP foundation is working correctly."

                            : "Jufelix ERP is offline. Sign-in may require a previously remembered session.";


                    if (
                        continueButton
                    ) {

                        continueButton.textContent =
                            "Continue to Jufelix ERP";
                    }
                }


                if (
                    continueButton
                ) {

                    continueButton
                        .classList
                        .remove(
                            "hidden"
                        );
                }


                console.log(
                    "✅ Jufelix ERP started successfully.",
                    systemInformation
                );


            } catch (
                error
            ) {

                console.error(
                    "❌ Jufelix ERP startup failed:",
                    error
                );


                showError(
                    "Startup error: " +
                    (
                        error &&
                        error.message
                            ? error.message
                            : "Unknown startup error."
                    )
                );
            }
        }


        /* =====================================
           CONTINUE BUTTON
        ====================================== */

        if (
            continueButton
        ) {

            continueButton.addEventListener(
                "click",
                routeToApplication
            );
        }


        /* =====================================
           CONNECTION STATUS
        ====================================== */

        window.addEventListener(
            "online",
            function () {

                console.log(
                    "Jufelix ERP is online."
                );
            }
        );


        window.addEventListener(
            "offline",
            function () {

                console.log(
                    "Jufelix ERP is offline."
                );
            }
        );


        /* =====================================
           START
        ====================================== */

        startApplication();

    }
);