/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   COMPLETE BACKUP MODULE v100

   File:
   js/modules/backup.js

   + Firestore JSON export
   + Local ERP data export
   + Administrator-only operation
   + No database writes or deletions
========================================= */


(function () {

    "use strict";


    const FIREBASE_VERSION =
        "12.2.1";


    const COLLECTION_NAMES = [
        "branches",
        "customers",
        "expenses",
        "products",
        "purchases",
        "sales",
        "suppliers",
        "system",
        "transfers",
        "users",
        "userSettings"
    ];


    const AUTH_STORAGE_PREFIXES = [
        "firebase:",
        "firebaseLocalStorageDb"
    ];


    let firestoreToolsPromise =
        null;


    /* ==========================================
       DOWNLOAD COMPLETE BACKUP
    ========================================== */

    async function downloadCompleteBackup() {

        requireAdministrator();


        const startedAt =
            new Date();


        showStatus(
            "Preparing complete backup...",
            "working"
        );


        try {

            const firebase =
                await waitForFirebase();


            const firestoreData =
                await exportFirestore(
                    firebase.db
                );


            const localData =
                exportLocalData();


            const backup = {

                format:
                    "jufelix-erp-complete-backup",

                formatVersion:
                    1,

                application:
                    "Jufelix ERP v7.0 Professional",

                applicationVersion:
                    "7.0",

                createdAt:
                    startedAt.toISOString(),

                createdBy:
                    getBackupUser(),

                firebaseProjectId:
                    getFirebaseProjectId(),

                scope: {

                    firestore:
                        "top-level collections",

                    localStorage:
                        "Jufelix application data",

                    authenticationTokensIncluded:
                        false
                },

                summary:
                    createSummary(
                        firestoreData,
                        localData
                    ),

                firestore:
                    firestoreData,

                local:
                    localData
            };


            validateBackup(
                backup
            );


            const fileName =
                createFileName(
                    startedAt
                );


            downloadJson(
                backup,
                fileName
            );


            showStatus(
                "Backup downloaded successfully: " +
                fileName,
                "success"
            );


            document.dispatchEvent(
                new CustomEvent(
                    "jufelix:backup-created",
                    {
                        detail: {
                            fileName:
                                fileName,

                            summary:
                                backup.summary
                        }
                    }
                )
            );


            return backup;


        } catch (error) {

            console.error(
                "Complete backup failed:",
                error
            );


            showStatus(
                getFriendlyError(
                    error
                ),
                "error"
            );


            throw error;
        }
    }


    /* ==========================================
       FIRESTORE EXPORT
    ========================================== */

    async function exportFirestore(
        db
    ) {

        const tools =
            await getFirestoreTools();


        const result = {};


        for (
            const collectionName of
            COLLECTION_NAMES
        ) {

            showStatus(
                "Backing up " +
                collectionName +
                "...",
                "working"
            );


            const snapshot =
                await tools.getDocs(
                    tools.collection(
                        db,
                        collectionName
                    )
                );


            result[
                collectionName
            ] =
                snapshot.docs.map(
                    function (documentSnapshot) {

                        return {
                            id:
                                documentSnapshot.id,

                            data:
                                serializeFirestoreValue(
                                    documentSnapshot.data()
                                )
                        };
                    }
                );
        }


        return result;
    }


    function getFirestoreTools() {

        if (!firestoreToolsPromise) {

            firestoreToolsPromise =
                import(
                    "https://www.gstatic.com/firebasejs/" +
                    FIREBASE_VERSION +
                    "/firebase-firestore.js"
                );
        }


        return firestoreToolsPromise;
    }


    function serializeFirestoreValue(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return value === undefined
                ? null
                : value;
        }


        if (
            typeof value !==
            "object"
        ) {

            return value;
        }


        if (
            typeof value.toDate ===
            "function"
        ) {

            return {
                __jufelixType:
                    "timestamp",

                iso:
                    value.toDate()
                        .toISOString(),

                seconds:
                    value.seconds,

                nanoseconds:
                    value.nanoseconds
            };
        }


        if (
            typeof value.latitude ===
                "number" &&
            typeof value.longitude ===
                "number"
        ) {

            return {
                __jufelixType:
                    "geopoint",

                latitude:
                    value.latitude,

                longitude:
                    value.longitude
            };
        }


        if (
            typeof value.path ===
                "string" &&
            value.firestore
        ) {

            return {
                __jufelixType:
                    "document-reference",

                path:
                    value.path
            };
        }


        if (
            typeof value.toBase64 ===
            "function"
        ) {

            return {
                __jufelixType:
                    "bytes",

                base64:
                    value.toBase64()
            };
        }


        if (
            Array.isArray(
                value
            )
        ) {

            return value.map(
                serializeFirestoreValue
            );
        }


        const output = {};


        Object.keys(
            value
        ).forEach(
            function (key) {

                output[key] =
                    serializeFirestoreValue(
                        value[key]
                    );
            }
        );


        return output;
    }


    /* ==========================================
       LOCAL DATA EXPORT
    ========================================== */

    function exportLocalData() {

        const storageExport =
            window.JufelixStorage &&
            typeof window
                .JufelixStorage
                .exportAllData ===
                "function"

                ? window
                    .JufelixStorage
                    .exportAllData()

                : null;


        const rawLocalStorage = {};


        for (
            let index = 0;
            index < localStorage.length;
            index++
        ) {

            const key =
                localStorage.key(
                    index
                );


            if (
                !key ||
                isAuthenticationStorageKey(
                    key
                )
            ) {

                continue;
            }


            rawLocalStorage[key] =
                localStorage.getItem(
                    key
                );
        }


        return {
            storageService:
                storageExport,

            rawLocalStorage:
                rawLocalStorage
        };
    }


    function isAuthenticationStorageKey(
        key
    ) {

        const normalized =
            String(
                key ||
                ""
            );


        return AUTH_STORAGE_PREFIXES.some(
            function (prefix) {

                return normalized.startsWith(
                    prefix
                );
            }
        );
    }


    /* ==========================================
       VALIDATION AND SUMMARY
    ========================================== */

    function createSummary(
        firestoreData,
        localData
    ) {

        const collectionCounts = {};


        let totalFirestoreDocuments =
            0;


        COLLECTION_NAMES.forEach(
            function (collectionName) {

                const count =
                    Array.isArray(
                        firestoreData[
                            collectionName
                        ]
                    )
                        ? firestoreData[
                            collectionName
                        ].length
                        : 0;


                collectionCounts[
                    collectionName
                ] = count;


                totalFirestoreDocuments +=
                    count;
            }
        );


        return {
            firestoreCollectionCount:
                COLLECTION_NAMES.length,

            totalFirestoreDocuments:
                totalFirestoreDocuments,

            collectionCounts:
                collectionCounts,

            localStorageKeyCount:
                Object.keys(
                    localData.rawLocalStorage ||
                    {}
                ).length
        };
    }


    function validateBackup(
        backup
    ) {

        if (
            !backup ||
            backup.format !==
                "jufelix-erp-complete-backup" ||
            !backup.firestore ||
            !backup.local
        ) {

            throw new Error(
                "The generated backup is incomplete."
            );
        }


        COLLECTION_NAMES.forEach(
            function (collectionName) {

                if (
                    !Array.isArray(
                        backup.firestore[
                            collectionName
                        ]
                    )
                ) {

                    throw new Error(
                        "Backup validation failed for " +
                        collectionName +
                        "."
                    );
                }
            }
        );
    }


    /* ==========================================
       AUTHORIZATION
    ========================================== */

    function requireAdministrator() {

        const user =
            getCurrentUser();


        const role =
            String(
                user &&
                user.role ||
                ""
            )
                .trim()
                .toLowerCase();


        if (
            role !== "admin" &&
            role !== "administrator"
        ) {

            throw new Error(
                "Only an Administrator can create a complete backup."
            );
        }
    }


    function getCurrentUser() {

        if (
            window.JufelixStorage &&
            typeof window
                .JufelixStorage
                .getCurrentUser ===
                "function"
        ) {

            return window
                .JufelixStorage
                .getCurrentUser();
        }


        const keys = [
            "jufelix_v7_current_user",
            "currentUser"
        ];


        for (
            const key of
            keys
        ) {

            try {

                const stored =
                    localStorage.getItem(
                        key
                    );


                if (stored) {

                    return JSON.parse(
                        stored
                    );
                }


            } catch (error) {

                /* Continue to the next key. */
            }
        }


        return null;
    }


    function getBackupUser() {

        const user =
            getCurrentUser() ||
            {};


        return {
            id:
                user.id ||
                user.uid ||
                "",

            name:
                user.fullName ||
                user.name ||
                user.username ||
                "Administrator",

            role:
                user.role ||
                "Administrator",

            branchId:
                user.branchId ||
                "head-office"
        };
    }


    /* ==========================================
       FIREBASE WAIT
    ========================================== */

    async function waitForFirebase() {

        if (
            typeof window
                .waitForJufelixFirebase ===
                "function"
        ) {

            return window
                .waitForJufelixFirebase({
                    requireUser:
                        true,

                    timeout:
                        20000
                });
        }


        const startedAt =
            Date.now();


        while (
            Date.now() -
            startedAt <
            20000
        ) {

            const firebase =
                window.JufelixFirebase;


            if (
                firebase &&
                firebase.db &&
                firebase.auth &&
                (
                    firebase.user ||
                    firebase.auth.currentUser
                )
            ) {

                return firebase;
            }


            await new Promise(
                function (resolve) {

                    window.setTimeout(
                        resolve,
                        100
                    );
                }
            );
        }


        throw new Error(
            "Firebase is not ready or the Administrator is not signed in."
        );
    }


    function getFirebaseProjectId() {

        return String(
            window.JUFELIX_FIREBASE_CONFIG &&
            window
                .JUFELIX_FIREBASE_CONFIG
                .projectId ||
            ""
        );
    }


    /* ==========================================
       FILE DOWNLOAD
    ========================================== */

    function downloadJson(
        data,
        fileName
    ) {

        const json =
            JSON.stringify(
                data,
                null,
                2
            );


        const blob =
            new Blob(
                [json],
                {
                    type:
                        "application/json;charset=utf-8"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;


        link.download =
            fileName;


        link.style.display =
            "none";


        document.body.appendChild(
            link
        );


        link.click();


        window.setTimeout(
            function () {

                URL.revokeObjectURL(
                    url
                );


                link.remove();

            },
            1000
        );
    }


    function createFileName(
        date
    ) {

        const value =
            date.toISOString()
                .replace(
                    /[:.]/g,
                    "-"
                );


        return (
            "jufelix-erp-complete-backup-" +
            value +
            ".json"
        );
    }


    /* ==========================================
       STATUS
    ========================================== */

    function showStatus(
        message,
        type
    ) {

        const statusElement =
            document.getElementById(
                "backupStatus"
            );


        if (statusElement) {

            statusElement.textContent =
                message;


            statusElement.dataset.status =
                type ||
                "info";
        }


        document.dispatchEvent(
            new CustomEvent(
                "jufelix:backup-status",
                {
                    detail: {
                        message:
                            message,

                        type:
                            type ||
                            "info"
                    }
                }
            )
        );
    }


    function getFriendlyError(
        error
    ) {

        const code =
            String(
                error &&
                error.code ||
                ""
            );


        if (
            code ===
            "permission-denied"
        ) {

            return "Firebase denied the backup. Sign in as Administrator and check your Firestore read rules.";
        }


        if (
            code ===
            "unavailable"
        ) {

            return "Firebase is temporarily unavailable. Check the internet connection and try again.";
        }


        return error &&
            error.message
                ? error.message
                : "The backup could not be created.";
    }


    /* ==========================================
       PUBLIC API
    ========================================== */

    window.JufelixBackup = {
        collections:
            COLLECTION_NAMES.slice(),

        downloadCompleteBackup:
            downloadCompleteBackup
    };


    console.log(
        "✅ Jufelix Complete Backup Module v100 loaded."
    );


})();
