/* Jufelix ERP v7.0 - Sales cloud bridge */
import { collection, doc, onSnapshot, serverTimestamp, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const PRODUCTS_KEY = "jufelix_products";
const SALES_KEY = "jufelix_v7_sales";

function waitForDb(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    (function check() {
      if (window.JufelixFirebase && window.JufelixFirebase.db) return resolve(window.JufelixFirebase.db);
      if (Date.now() - started > timeout) return reject(new Error("Firebase was not ready."));
      setTimeout(check, 100);
    })();
  });
}

function clean(value) {
  if (value === undefined) return null;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(clean);
  const result = {};
  Object.keys(value).forEach(key => { if (value[key] !== undefined) result[key] = clean(value[key]); });
  return result;
}

async function saveSale(sale) {
  const db = await waitForDb();
  await setDoc(doc(db, "sales", String(sale.id)), { ...clean(sale), cloudUpdatedAt: serverTimestamp() }, { merge: true });
}

async function saveProduct(product) {
  const db = await waitForDb();
  await setDoc(doc(db, "products", String(product.id)), { ...clean(product), cloudUpdatedAt: serverTimestamp() }, { merge: true });
}

async function syncLocal(products, sales) {
  const db = await waitForDb();
  const batch = writeBatch(db);
  (products || []).forEach(product => batch.set(doc(db, "products", String(product.id)), { ...clean(product), cloudUpdatedAt: serverTimestamp() }, { merge: true }));
  (sales || []).forEach(sale => batch.set(doc(db, "sales", String(sale.id)), { ...clean(sale), cloudUpdatedAt: serverTimestamp() }, { merge: true }));
  await batch.commit();
}

function listen(onChange) {
  let stopProducts = null;
  let stopSales = null;
  waitForDb().then(db => {
    stopProducts = onSnapshot(collection(db, "products"), snapshot => {
      const rows = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(rows));
      if (onChange) onChange("products", rows);
    });
    stopSales = onSnapshot(collection(db, "sales"), snapshot => {
      const rows = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      localStorage.setItem(SALES_KEY, JSON.stringify(rows));
      if (onChange) onChange("sales", rows);
    });
  }).catch(error => console.warn("Sales cloud listener unavailable:", error.message));
  return () => {
    if (stopProducts) stopProducts();
    if (stopSales) stopSales();
  };
}

window.JufelixSalesCloud = { saveSale, saveProduct, syncLocal, listen };
document.dispatchEvent(new CustomEvent("jufelix:sales-cloud-ready"));
