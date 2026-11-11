import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    collection,
    documentId,
    getDocsFromCache,
    getDocsFromServer,
    getFirestore,
    initializeFirestore,
    limit,
    orderBy,
    persistentLocalCache,
    persistentMultipleTabManager,
    query,
    startAfter,
    where
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


const PAGE_SIZE = 24;
const $ = id => document.getElementById(id);

const money = value =>
    "GHS " +
    Number(value || 0).toLocaleString(
        "en-GH",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );


function safeImage(value) {

    return typeof value === "string" &&
        (
            /^data:image\/(png|jpeg|webp);base64,/i.test(value) ||
            /^https:\/\//i.test(value)
        )
        ? value
        : "";
}


function node(tag, text, className) {

    const element = document.createElement(tag);

    if (text !== undefined) {
        element.textContent = String(text);
    }

    if (className) {
        element.className = className;
    }

    return element;
}


function pauseForPaint() {

    return new Promise(resolve => {

        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(resolve, { timeout: 180 });
            return;
        }

        window.setTimeout(resolve, 40);
    });
}


let products = [];
let cart = new Map();
let loadingComplete = false;


function normalizeProduct(snapshot) {

    const product = {
        ...snapshot.data(),
        id: snapshot.id
    };

    product.sellingPrice = Number(product.sellingPrice);

    return typeof product.name === "string" &&
        product.name.trim() &&
        Number.isFinite(product.sellingPrice) &&
        product.sellingPrice >= 0
        ? product
        : null;
}


function mergeProducts(incoming) {

    const byId = new Map(
        products.map(product => [product.id, product])
    );

    incoming.forEach(product => {
        if (product) {
            byId.set(product.id, product);
        }
    });

    products = [...byId.values()];
}


function rebuildCategories() {

    const select = $("category");
    const selected = select.value;
    const fragment = document.createDocumentFragment();

    const all = node("option", "All Categories");
    all.value = "";
    fragment.append(all);

    [...new Set(products.map(product => product.category).filter(Boolean))]
        .sort((first, second) => first.localeCompare(second))
        .forEach(category => {
            const option = node("option", category);
            option.value = category;
            fragment.append(option);
        });

    select.replaceChildren(fragment);

    if ([...select.options].some(option => option.value === selected)) {
        select.value = selected;
    }
}


function createProductCard(product) {

    const card = node("article", undefined, "card");
    const photo = node("div", undefined, "photo");
    const source = safeImage(product.image || product.imageUrl);

    if (source) {
        const image = node("img");
        image.src = source;
        image.alt = product.name;
        image.loading = "lazy";
        image.decoding = "async";
        image.fetchPriority = "low";
        image.addEventListener(
            "error",
            () => photo.replaceChildren(node("span", "📦")),
            { once: true }
        );
        photo.append(image);
    } else {
        photo.textContent = "📦";
    }

    const body = node("div", undefined, "content");
    body.append(
        node("div", product.category || "Jufelix collection", "category"),
        node("h2", product.name),
        node(
            "span",
            product.available ? "Available to order" : "Ask about availability",
            product.available ? "badge" : "badge unavailable"
        ),
        node("p", product.description || "", "muted"),
        node("div", money(product.sellingPrice), "price")
    );

    const add = node(
        "button",
        product.available ? "Add to order" : "Currently unavailable"
    );
    add.disabled = !product.available;

    add.addEventListener("click", () => {
        cart.set(
            product.id,
            Math.min(99, (cart.get(product.id) || 0) + 1)
        );
        updateCart();
        add.textContent = "Added ✓";
        window.setTimeout(() => {
            add.textContent = "Add to order";
        }, 900);
    });

    body.append(add);
    card.append(photo, body);

    return card;
}


function render() {

    const search = $("search").value.trim().toLowerCase();
    const category = $("category").value;

    const visible = products
        .filter(product =>
            (!category || product.category === category) &&
            [product.name, product.category, product.description]
                .join(" ")
                .toLowerCase()
                .includes(search)
        )
        .sort((first, second) => first.name.localeCompare(second.name));

    const fragment = document.createDocumentFragment();

    visible.forEach(product => {
        fragment.append(createProductCard(product));
    });

    if (!visible.length) {
        fragment.append(
            node(
                "p",
                products.length
                    ? "No products match your search."
                    : "No products published yet. Please check back soon."
            )
        );
    }

    $("products").replaceChildren(fragment);
    $("count").textContent =
        visible.length +
        (loadingComplete ? " products" : " products loaded so far");
}


function updateCart() {

    let amount = 0;
    let quantity = 0;

    cart.forEach((count, id) => {
        const product = products.find(item => item.id === id);
        if (product) {
            quantity += count;
            amount += count * product.sellingPrice;
        }
    });

    $("cartSummary").textContent =
        quantity + " item(s) • " + money(amount);
    $("review").disabled = !quantity;
}


function review() {

    $("orderRows").replaceChildren();

    cart.forEach((count, id) => {
        const product = products.find(item => item.id === id);
        if (!product) {
            return;
        }

        const row = node("div", undefined, "row");
        const info = node("div");
        info.append(
            node("strong", product.name),
            node("div", money(product.sellingPrice) + " each", "muted")
        );

        const quantity = node("input");
        quantity.type = "number";
        quantity.min = "1";
        quantity.max = "99";
        quantity.value = count;
        quantity.setAttribute("aria-label", "Quantity for " + product.name);
        quantity.addEventListener("change", () => {
            const value = Math.min(
                99,
                Math.max(1, Math.trunc(Number(quantity.value) || 1))
            );
            cart.set(id, value);
            quantity.value = value;
            updateCart();
        });

        const remove = node("button", "Remove", "secondary");
        remove.addEventListener("click", () => {
            cart.delete(id);
            updateCart();
            review();
        });

        row.append(info, quantity, remove);
        $("orderRows").append(row);
    });

    $("send").disabled = !cart.size;
}


$("search").addEventListener("input", render);
$("category").addEventListener("change", render);
$("review").addEventListener("click", () => {
    review();
    $("orderDialog").showModal();
});
$("close").addEventListener("click", () => $("orderDialog").close());

$("send").addEventListener("click", () => {
    if (!cart.size) {
        return;
    }

    let total = 0;
    const lines = ["Hello Jufelix Services, I would like to order:"];

    cart.forEach((quantity, id) => {
        const product = products.find(item => item.id === id);
        if (product) {
            const amount = quantity * product.sellingPrice;
            total += amount;
            lines.push(
                quantity + " x " + product.name + " — " + money(amount)
            );
        }
    });

    lines.push("", "Estimated product total: " + money(total));

    if ($("customerName").value.trim()) {
        lines.push("Name: " + $("customerName").value.trim());
    }

    if ($("location").value.trim()) {
        lines.push(
            "Delivery area / pickup request: " + $("location").value.trim()
        );
    }

    lines.push(
        "Please confirm availability, final prices, delivery fee and payment instructions."
    );

    const url =
        "https://wa.me/233244252983?text=" +
        encodeURIComponent(lines.join("\n"));

    if (url.length > 7000) {
        $("orderMessage").textContent =
            "Order is too long for one WhatsApp message. Please reduce the items and send in parts.";
        return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
});


function catalogueQuery(cursor) {

    const constraints = [
        where("published", "==", true),
        orderBy(documentId()),
        limit(PAGE_SIZE)
    ];

    if (cursor) {
        constraints.splice(2, 0, startAfter(cursor));
    }

    return query(
        collection(database, "publicCatalogue"),
        ...constraints
    );
}


async function loadRemainingProducts(cursor) {

    let lastDocument = cursor;

    while (lastDocument) {
        await pauseForPaint();

        const snapshot = await getDocsFromServer(
            catalogueQuery(lastDocument)
        );

        if (snapshot.empty) {
            break;
        }

        mergeProducts(snapshot.docs.map(normalizeProduct));
        rebuildCategories();
        $("count").textContent = products.length + " products loaded so far";
        $("status").textContent =
            "Products are ready to browse. Loading the rest of the catalogue...";

        lastDocument =
            snapshot.size === PAGE_SIZE
                ? snapshot.docs[snapshot.docs.length - 1]
                : null;
    }

    loadingComplete = true;
    rebuildCategories();
    render();
    $("status").textContent =
        "Catalogue loaded. Prices and availability are confirmed when we accept your WhatsApp order.";
}


const app = initializeApp(window.JUFELIX_FIREBASE_CONFIG);

let database;

try {
    database = initializeFirestore(
        app,
        {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        }
    );
} catch (error) {
    database = getFirestore(app);
}


try {
    const firstQuery = catalogueQuery();

    try {
        const cached = await getDocsFromCache(firstQuery);

        if (!cached.empty) {
            mergeProducts(cached.docs.map(normalizeProduct));
            rebuildCategories();
            render();
            $("status").textContent =
                "Showing saved products while checking for updates...";
        }
    } catch (error) {
        // A first-time visitor has no local catalogue cache yet.
    }

    const firstPage = await getDocsFromServer(firstQuery);

    mergeProducts(firstPage.docs.map(normalizeProduct));
    rebuildCategories();
    render();

    const moreProducts = firstPage.size === PAGE_SIZE;

    if (!moreProducts) {
        loadingComplete = true;
        render();
        $("status").textContent =
            "Catalogue loaded. Prices and availability are confirmed when we accept your WhatsApp order.";
    } else {
        $("status").textContent =
            "Products are ready to browse. Loading the rest of the catalogue...";

        loadRemainingProducts(
            firstPage.docs[firstPage.docs.length - 1]
        ).catch(error => {
            loadingComplete = true;
            render();
            $("status").textContent =
                products.length +
                " products loaded. Some additional products may be temporarily unavailable.";
            console.warn("Background catalogue loading stopped:", error);
        });
    }
} catch (error) {
    if (products.length) {
        loadingComplete = true;
        render();
        $("status").textContent =
            "Showing saved catalogue products. Connect to the internet for the latest updates.";
    } else {
        $("products").replaceChildren();
        $("status").classList.add("error");
        $("status").textContent =
            "Unable to load the catalogue. Please check your connection or contact us on WhatsApp. " +
            (error.code || "");
    }
}
