/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   SAFE RESTORE MODULE v100

   File: js/modules/restore.js

   Restores a Jufelix complete JSON backup.
   Existing Firestore documents not present in
   the backup are NOT deleted.
========================================= */

(function () {
    "use strict";

    const FIREBASE_VERSION = "12.2.1";
    const FORMAT = "jufelix-erp-complete-backup";
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    const BATCH_SIZE = 400;

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

    const SESSION_KEYS = new Set([
        "loggedIn",
        "currentUser",
        "jufelix_v7_current_user",
        "jufelixSessionActive"
    ]);

    let selectedBackup = null;
    let selectedFileName = "";
    let firestoreToolsPromise = null;

    function initialize() {
        const input = document.getElementById("restoreBackupFile");
        const button = document.getElementById("restoreBackupButton");

        if (input) {
            input.addEventListener("change", handleFileSelection);
        }

        if (button) {
            button.addEventListener("click", restoreSelectedBackup);
            button.disabled = true;
        }
    }

    async function handleFileSelection(event) {
        selectedBackup = null;
        selectedFileName = "";
        setRestoreButton(false);
        clearPreview();

        const file = event.target.files && event.target.files[0];
        if (!file) return;

        try {
            requireAdministrator();

            if (file.size > MAX_FILE_SIZE) {
                throw new Error("The backup file is larger than 50 MB.");
            }

            if (!file.name.toLowerCase().endsWith(".json")) {
                throw new Error("Select a Jufelix JSON backup file.");
            }

            showStatus("Reading and validating backup...", "working");

            const text = await file.text();
            const backup = JSON.parse(text);
            validateBackup(backup);

            selectedBackup = backup;
            selectedFileName = file.name;
            showPreview(backup, file.name);
            setRestoreButton(true);
            showStatus("Backup validated. Review the totals before restoring.", "success");
        } catch (error) {
            console.error("Backup selection failed:", error);
            showStatus(friendlyError(error), "error");
        }
    }

    function validateBackup(backup) {
        if (!backup || typeof backup !== "object") {
            throw new Error("The selected file does not contain valid backup data.");
        }

        if (backup.format !== FORMAT || Number(backup.formatVersion) !== 1) {
            throw new Error("This is not a supported Jufelix complete backup.");
        }

        if (!backup.firestore || !backup.local || !backup.summary) {
            throw new Error("The backup is incomplete and cannot be restored.");
        }

        const currentProjectId = getFirebaseProjectId();
        const backupProjectId = String(backup.firebaseProjectId || "");

        if (
            currentProjectId &&
            backupProjectId &&
            currentProjectId !== backupProjectId
        ) {
            throw new Error(
                "This backup belongs to Firebase project " +
                backupProjectId +
                ", not " +
                currentProjectId +
                "."
            );
        }

        COLLECTION_NAMES.forEach(function (collectionName) {
            const records = backup.firestore[collectionName];

            if (!Array.isArray(records)) {
                throw new Error("Missing collection: " + collectionName + ".");
            }

            records.forEach(function (record) {
                if (
                    !record ||
                    typeof record !== "object" ||
                    !record.id ||
                    !record.data ||
                    typeof record.data !== "object"
                ) {
                    throw new Error(
                        "Invalid document found in collection " +
                        collectionName +
                        "."
                    );
                }
            });
        });
    }

    async function restoreSelectedBackup() {
        if (!selectedBackup) {
            showStatus("Select and validate a backup file first.", "error");
            return;
        }

        try {
            requireAdministrator();

            const confirmation = window.prompt(
                "This will overwrite matching records with the backup values. " +
                "Newer records that are not in the backup will remain. " +
                "Type RESTORE to continue."
            );

            if (confirmation !== "RESTORE") {
                showStatus("Restore cancelled. No data was changed.", "info");
                return;
            }

            setWorking(true);
            showStatus("Creating a safety backup of the current data...", "working");

            if (
                !window.JufelixBackup ||
                typeof window.JufelixBackup.downloadCompleteBackup !== "function"
            ) {
                throw new Error(
                    "The safety-backup module is not available. Restore was stopped."
                );
            }

            await window.JufelixBackup.downloadCompleteBackup();

            const firebase = await waitForFirebase();

            showStatus("Restoring Firebase records...", "working");
            const restoredFirestoreCount = await restoreFirestore(
                firebase.db,
                selectedBackup.firestore
            );

            showStatus("Restoring data stored on this device...", "working");
            const restoredLocalCount = restoreLocalData(selectedBackup.local);

            const result = {
                fileName: selectedFileName,
                firestoreDocuments: restoredFirestoreCount,
                localStorageKeys: restoredLocalCount,
                restoredAt: new Date().toISOString(),
                mode: "merge-without-deleting"
            };

            document.dispatchEvent(
                new CustomEvent("jufelix:backup-restored", { detail: result })
            );

            showStatus(
                "Restore completed successfully. Firebase documents: " +
                restoredFirestoreCount +
                "; device keys: " +
                restoredLocalCount +
                ". Refreshing Jufelix...",
                "success"
            );

            window.setTimeout(function () {
                window.location.reload();
            }, 2500);
        } catch (error) {
            console.error("Restore failed:", error);
            showStatus(friendlyError(error), "error");
            setWorking(false);
        }
    }

    async function restoreFirestore(db, firestoreData) {
        const tools = await getFirestoreTools();
        const operations = [];

        COLLECTION_NAMES.forEach(function (collectionName) {
            firestoreData[collectionName].forEach(function (record) {
                operations.push({
                    reference: tools.doc(db, collectionName, String(record.id)),
                    data: deserializeFirestoreValue(record.data, tools, db)
                });
            });
        });

        for (let start = 0; start < operations.length; start += BATCH_SIZE) {
            const batch = tools.writeBatch(db);
            const group = operations.slice(start, start + BATCH_SIZE);

            group.forEach(function (operation) {
                batch.set(operation.reference, operation.data, { merge: false });
            });

            await batch.commit();

            showStatus(
                "Restored " +
                Math.min(start + group.length, operations.length) +
                " of " +
                operations.length +
                " Firebase documents...",
                "working"
            );
        }

        return operations.length;
    }

    function deserializeFirestoreValue(value, tools, db) {
        if (value === null || value === undefined) return null;
        if (typeof value !== "object") return value;

        if (value.__jufelixType === "timestamp") {
            return tools.Timestamp.fromDate(new Date(value.iso));
        }

        if (value.__jufelixType === "geopoint") {
            return new tools.GeoPoint(Number(value.latitude), Number(value.longitude));
        }

        if (value.__jufelixType === "document-reference") {
            return tools.doc(db, String(value.path));
        }

        if (value.__jufelixType === "bytes") {
            return tools.Bytes.fromBase64String(String(value.base64 || ""));
        }

        if (Array.isArray(value)) {
            return value.map(function (item) {
                return deserializeFirestoreValue(item, tools, db);
            });
        }

        const output = {};
        Object.keys(value).forEach(function (key) {
            output[key] = deserializeFirestoreValue(value[key], tools, db);
        });
        return output;
    }

    function restoreLocalData(localData) {
        const raw = localData && localData.rawLocalStorage;

        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
            throw new Error("The local-data section of the backup is invalid.");
        }

        let restoredCount = 0;

        Object.keys(raw).forEach(function (key) {
            if (
                SESSION_KEYS.has(key) ||
                key.startsWith("firebase:") ||
                key.startsWith("firebaseLocalStorageDb")
            ) {
                return;
            }

            const value = raw[key];
            if (typeof value === "string") {
                localStorage.setItem(key, value);
                restoredCount++;
            }
        });

        return restoredCount;
    }

    function getFirestoreTools() {
        if (!firestoreToolsPromise) {
            firestoreToolsPromise = import(
                "https://www.gstatic.com/firebasejs/" +
                FIREBASE_VERSION +
                "/firebase-firestore.js"
            );
        }
        return firestoreToolsPromise;
    }

    async function waitForFirebase() {
        if (typeof window.waitForJufelixFirebase === "function") {
            return window.waitForJufelixFirebase({
                requireUser: true,
                timeout: 20000
            });
        }
        throw new Error("Firebase is not ready or the user is not authenticated.");
    }

    function requireAdministrator() {
        const user = getCurrentUser();
        const role = String(user && user.role || "").trim().toLowerCase();

        if (role !== "admin" && role !== "administrator") {
            throw new Error("Only an Administrator can restore a complete backup.");
        }
    }

    function getCurrentUser() {
        if (
            window.JufelixStorage &&
            typeof window.JufelixStorage.getCurrentUser === "function"
        ) {
            return window.JufelixStorage.getCurrentUser();
        }

        for (const key of ["jufelix_v7_current_user", "currentUser"]) {
            try {
                const stored = localStorage.getItem(key);
                if (stored) return JSON.parse(stored);
            } catch (error) {
                /* Continue. */
            }
        }
        return null;
    }

    function getFirebaseProjectId() {
        return String(
            window.JUFELIX_FIREBASE_CONFIG &&
            window.JUFELIX_FIREBASE_CONFIG.projectId ||
            ""
        );
    }

    function showPreview(backup, fileName) {
        const element = document.getElementById("restoreBackupPreview");
        if (!element) return;

        const summary = backup.summary || {};
        const date = backup.createdAt
            ? new Date(backup.createdAt).toLocaleString()
            : "Unknown";

        element.hidden = false;
        element.textContent =
            "File: " + fileName +
            " | Created: " + date +
            " | Firebase documents: " +
            Number(summary.totalFirestoreDocuments || 0) +
            " | Device keys: " +
            Number(summary.localStorageKeyCount || 0);
    }

    function clearPreview() {
        const element = document.getElementById("restoreBackupPreview");
        if (element) {
            element.hidden = true;
            element.textContent = "";
        }
    }

    function setRestoreButton(enabled) {
        const button = document.getElementById("restoreBackupButton");
        if (button) button.disabled = !enabled;
    }

    function setWorking(working) {
        const button = document.getElementById("restoreBackupButton");
        const input = document.getElementById("restoreBackupFile");

        if (button) {
            button.disabled = working || !selectedBackup;
            button.textContent = working
                ? "Restoring..."
                : "♻️ Restore Selected Backup";
        }

        if (input) input.disabled = working;
    }

    function showStatus(message, type) {
        const element = document.getElementById("restoreStatus");
        if (element) {
            element.textContent = message;
            element.dataset.status = type || "info";
        }
    }

    function friendlyError(error) {
        if (error instanceof SyntaxError) {
            return "The selected file is not valid JSON.";
        }

        const code = String(error && error.code || "");
        if (code === "permission-denied") {
            return "Firebase denied the restore. Confirm that you are signed in as Administrator and review the Firestore write rules.";
        }
        if (code === "unavailable") {
            return "Firebase is temporarily unavailable. Check the internet connection and try again.";
        }

        return error && error.message
            ? error.message
            : "The backup could not be restored.";
    }

    window.JufelixRestore = {
        validateBackup: validateBackup,
        restoreSelectedBackup: restoreSelectedBackup,
        getSelectedBackup: function () {
            return selectedBackup;
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }

    console.log("✅ Jufelix Safe Restore Module v100 loaded.");
})();
