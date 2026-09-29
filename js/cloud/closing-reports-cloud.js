/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   DAILY CLOSING REPORTS CLOUD v1

   File: js/cloud/closing-reports-cloud.js
========================================== */

import {
    collection,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    where
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const REPORTS_KEY = "jufelix_v7_closing_reports";
const CURRENT_USER_KEY = "jufelix_v7_current_user";

let database = null;
let unsubscribe = null;
let started = false;

function readObject(key) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || "null");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch (error) {
        return null;
    }
}

function normalizeRole(role) {
    const value = String(role || "").trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
    return value.includes("admin") ? "admin" : value;
}

function getLocalUser() {
    return readObject(CURRENT_USER_KEY) || readObject("currentUser") || {};
}

function cleanValue(value) {
    if (value === undefined) return null;
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(cleanValue);

    const result = {};
    Object.keys(value).forEach(function (key) {
        if (value[key] !== undefined) result[key] = cleanValue(value[key]);
    });
    return result;
}

async function getFirebase() {
    if (typeof window.waitForJufelixFirebase === "function") {
        const firebase = await window.waitForJufelixFirebase({ requireUser: true, timeout: 20000 });
        database = firebase.db;
        return firebase;
    }

    return new Promise(function (resolve, reject) {
        const startedAt = Date.now();
        (function check() {
            const firebase = window.JufelixFirebase;
            if (firebase && firebase.db && firebase.auth && firebase.auth.currentUser) {
                database = firebase.db;
                resolve(firebase);
                return;
            }
            if (Date.now() - startedAt >= 20000) {
                reject(new Error("Firebase user is not authenticated."));
                return;
            }
            window.setTimeout(check, 100);
        })();
    });
}

function saveReportsLocally(reports) {
    const sorted = reports.slice().sort(function (a, b) {
        return String(b.reportDate || b.updatedAt || "").localeCompare(String(a.reportDate || a.updatedAt || ""));
    });

    try {
        localStorage.setItem(REPORTS_KEY, JSON.stringify(sorted.slice(0, 180)));
    } catch (error) {
        console.error("Closing Reports local save failed:", error);
        const summaries = sorted.slice(0, 90).map(function (report) {
            return { ...report, transactions: [], stockSnapshot: [] };
        });
        localStorage.setItem(REPORTS_KEY, JSON.stringify(summaries));
    }
}

function dispatchUpdated(reports) {
    document.dispatchEvent(new CustomEvent("jufelix:closing-reports-updated", {
        detail: { key: REPORTS_KEY, value: reports, source: "closing-reports-cloud" }
    }));
}

async function startRealtimeListener() {
    const firebase = await getFirebase();
    const authUser = firebase.auth.currentUser;
    const localUser = getLocalUser();
    const role = normalizeRole(localUser.role);
    const reportsCollection = collection(firebase.db, "closingReports");

    if (unsubscribe) unsubscribe();

    const reportsQuery = role === "admin"
        ? reportsCollection
        : query(reportsCollection, where("officerUid", "==", authUser.uid));

    unsubscribe = onSnapshot(
        reportsQuery,
        function (snapshot) {
            const reports = snapshot.docs.map(function (snapshotDocument) {
                return { id: snapshotDocument.id, ...snapshotDocument.data() };
            });
            saveReportsLocally(reports);
            dispatchUpdated(reports);
        },
        function (error) {
            console.error("Closing Reports realtime listener failed:", error);
            document.dispatchEvent(new CustomEvent("jufelix:closing-reports-error", { detail: { message: error.message || String(error) } }));
        }
    );
}

async function saveReport(report) {
    if (!report || !report.id) throw new Error("Closing report ID is missing.");

    const firebase = await getFirebase();
    const authUser = firebase.auth.currentUser;
    const localUser = getLocalUser();
    const role = normalizeRole(localUser.role);

    if (!authUser) throw new Error("Sign in again before submitting the closing report.");
    if (role !== "admin" && String(report.officerUid || "") !== String(authUser.uid)) {
        throw new Error("The closing report does not match the signed-in Sales Officer.");
    }

    const payload = {
        ...cleanValue({
        ...report,
        officerUid: report.officerUid || authUser.uid
        }),
        cloudUpdatedAt: serverTimestamp()
    };

    await setDoc(doc(firebase.db, "closingReports", String(report.id)), payload, { merge: true });
    return true;
}

async function start() {
    if (started) return;
    started = true;
    try {
        await startRealtimeListener();
        document.dispatchEvent(new CustomEvent("jufelix:closing-reports-cloud-ready"));
    } catch (error) {
        started = false;
        console.error("Closing Reports Cloud failed to start:", error);
    }
}

window.JufelixClosingReportsCloud = {
    start: start,
    saveReport: saveReport,
    restart: async function () {
        if (unsubscribe) unsubscribe();
        unsubscribe = null;
        started = false;
        await start();
    }
};

window.addEventListener("online", function () {
    if (!started) start();
});

start();
