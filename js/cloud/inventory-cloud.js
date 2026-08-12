/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   Inventory Cloud Bridge

   LocalStorage remains the offline copy.
   Firestore becomes the cloud copy.
========================================== */

import {
    collection,
    doc,
    getDocs,
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const PRODUCTS_KEY = "jufelix_products";
const COLLECTION_NAME = "products";
const RELOAD_FLAG = "jufelix_inventory_cloud_reloaded";

let syncing = false;
let started = false;

startWhenFirebaseIsReady();

function startWhenFirebaseIsReady() {
    if (
        window.JufelixFirebase &&
        window.JufelixFirebase.db
    ) {
        startInventoryCloud();
        return;
    }

    document.addEventListener(
        "jufelix:firebase-ready",
        startInventoryCloud,
        { once: true }
    );

    window.setTimeout(function () {
        if (!started) {
            startWhenFirebaseIsReady();
        }
    }, 500);
}

async function startInventoryCloud() {
    if (started) {
        return;
    }

    started = true;

    try {
        await pullOrSeedProducts();
        connectLocalChangeListener();
        showCloudStatus("Inventory cloud sync ready", "success");
    } catch (error) {
        console.error("Inventory cloud startup failed:", error);
        showCloudStatus(
            "Offline mode: " + readableError(error),
            "error"
        );
    }
}

async function pullOrSeedProducts() {
    const localProducts = readLocalProducts();
    const cloudProducts = await readCloudProducts();

    if (cloudProducts.length === 0) {
        if (localProducts.length > 0) {
            await syncProductsToCloud(localProducts);
        }
        return;
    }

    const mergedProducts = mergeCloudWithLocalImages(
        cloudProducts,
        localProducts
    );

    if (!sameProducts(localProducts, mergedProducts)) {
        saveLocalProducts(mergedProducts);

        if (!sessionStorage.getItem(RELOAD_FLAG)) {
            sessionStorage.setItem(RELOAD_FLAG, "true");
            window.location.reload();
            return;
        }
    }

    sessionStorage.removeItem(RELOAD_FLAG);
}

function connectLocalChangeListener() {
    document.addEventListener(
        "jufelix:data-updated",
        function (event) {
            if (
                !event.detail ||
                event.detail.key !== PRODUCTS_KEY ||
                syncing
            ) {
                return;
            }

            const products = Array.isArray(event.detail.value)
                ? event.detail.value
                : readLocalProducts();

            syncProductsToCloud(products).catch(function (error) {
                console.error("Product cloud save failed:", error);
                showCloudStatus(
                    "Product saved offline; cloud sync pending",
                    "error"
                );
            });
        }
    );
}

async function readCloudProducts() {
    const db = window.JufelixFirebase.db;
    const snapshot = await getDocs(
        collection(db, COLLECTION_NAME)
    );

    const products = [];

    snapshot.forEach(function (item) {
        const data = item.data() || {};

        delete data.cloudUpdatedAt;

        products.push({
            ...data,
            id: data.id || item.id
        });
    });

    return products;
}

async function syncProductsToCloud(products) {
    const db = window.JufelixFirebase.db;
    const safeProducts = Array.isArray(products) ? products : [];

    syncing = true;

    try {
        const existingSnapshot = await getDocs(
            collection(db, COLLECTION_NAME)
        );

        const batch = writeBatch(db);
        const localIds = new Set();

        safeProducts.forEach(function (product) {
            const productId = String(
                product.id || createProductId()
            );

            localIds.add(productId);

            batch.set(
                doc(db, COLLECTION_NAME, productId),
                prepareProductForCloud(product, productId),
                { merge: true }
            );
        });

        existingSnapshot.forEach(function (item) {
            if (!localIds.has(item.id)) {
                batch.delete(item.ref);
            }
        });

        await batch.commit();

        showCloudStatus("Inventory synced to cloud", "success");
    } finally {
        syncing = false;
    }
}

function prepareProductForCloud(product, productId) {
    const cloudProduct = {
        ...product,
        id: productId,
        cloudUpdatedAt: serverTimestamp()
    };

    ["image", "imageData", "photo"].forEach(function (field) {
        if (
            typeof cloudProduct[field] === "string" &&
            cloudProduct[field].length > 500000
        ) {
            delete cloudProduct[field];
            cloudProduct.imageStoredLocally = true;
        }
    });

    return removeUndefined(cloudProduct);
}

function mergeCloudWithLocalImages(cloudProducts, localProducts) {
    const localById = {};

    localProducts.forEach(function (product) {
        localById[String(product.id)] = product;
    });

    return cloudProducts.map(function (cloudProduct) {
        const localProduct = localById[String(cloudProduct.id)] || {};
        const merged = { ...cloudProduct };

        ["image", "imageData", "photo"].forEach(function (field) {
            if (!merged[field] && localProduct[field]) {
                merged[field] = localProduct[field];
            }
        });

        return merged;
    });
}

function readLocalProducts() {
    try {
        const value = localStorage.getItem(PRODUCTS_KEY);
        const parsed = value ? JSON.parse(value) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function saveLocalProducts(products) {
    localStorage.setItem(
        PRODUCTS_KEY,
        JSON.stringify(products)
    );
}

function sameProducts(first, second) {
    return stableStringify(first) === stableStringify(second);
}

function stableStringify(value) {
    return JSON.stringify(value, function (key, item) {
        if (key === "cloudUpdatedAt") {
            return undefined;
        }
        return item;
    });
}

function removeUndefined(value) {
    const cleaned = {};

    Object.keys(value).forEach(function (key) {
        if (value[key] !== undefined) {
            cleaned[key] = value[key];
        }
    });

    return cleaned;
}

function createProductId() {
    return "product-" + Date.now() + "-" +
        Math.random().toString(36).slice(2, 8);
}

function readableError(error) {
    return error && error.message
        ? error.message
        : "Unable to reach Firebase";
}

function showCloudStatus(message, type) {
    let toast = document.getElementById("inventoryCloudToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "inventoryCloudToast";
        toast.style.position = "fixed";
        toast.style.right = "16px";
        toast.style.bottom = "16px";
        toast.style.zIndex = "10000";
        toast.style.maxWidth = "310px";
        toast.style.padding = "12px 15px";
        toast.style.borderRadius = "10px";
        toast.style.color = "#ffffff";
        toast.style.fontSize = "13px";
        toast.style.fontWeight = "700";
        toast.style.boxShadow = "0 8px 24px rgba(0,0,0,.22)";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.background = type === "error"
        ? "#dc3545"
        : "#198754";
    toast.style.display = "block";

    window.clearTimeout(showCloudStatus.timer);
    showCloudStatus.timer = window.setTimeout(function () {
        toast.style.display = "none";
    }, 2800);
}
