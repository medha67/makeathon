/* =========================================
   BRIGHTLOOP - MAIN JAVASCRIPT (full file)
   Replaces script.js completely. Do NOT also paste enhance.js.
========================================= */

const $ = (id) => document.getElementById(id);

let currentUser = null;
let currentPage = "dashboard";
let toastTimer;

/* =========================================
   ICONS
========================================= */

const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

const ICON = {
    home: svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
    box: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18"/>'),
    diamond: svg('<path d="M12 3l9 9-9 9-9-9z"/>'),
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'),
    loop: svg('<path d="M20 11a8 8 0 10-2 6"/><path d="M20 4v7h-7"/>'),
    receipt: svg('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),
    rupee: svg('<path d="M7 5h10M7 9h10M7 5c5 0 7 2 7 4s-2 4-7 4l7 6"/>'),
    chart: svg('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'),
    check: svg('<path d="M5 12l5 5 9-10"/>')
};

/* =========================================
   API AND UTILITIES
========================================= */

/* Invoice maths shared by the preview data and the screens */
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function calcInvoice(inv) {
    const items = inv.items && inv.items.length
        ? inv.items
        : [{ description: "Subscription", qty: 1, unit_price: Number(inv.amount || 0) }];

    const subtotal = round2(items.reduce((sum, i) => sum + Number(i.qty) * Number(i.unit_price), 0));
    const discountPct = Number(inv.discount_percent || 0);
    const gstPct = Number(inv.gst_percent || 0);
    const discount = round2(subtotal * discountPct / 100);
    const taxable = round2(subtotal - discount);
    const tax = round2(taxable * gstPct / 100);
    const cgst = round2(tax / 2);
    const sgst = round2(tax - cgst);

    return { items, subtotal, discountPct, discount, taxable, gstPct, tax, cgst, sgst, total: round2(taxable + tax) };
}

/* UI-ONLY MODE: this fake backend lives in the browser.
   Data is saved in localStorage so your changes survive a refresh. */
const DEMO_KEY = "brightloop-demo-db-v2";

const dayOffset = (n = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
};

function seedInvoices() {
    return [
        { id: 1, user_id: 2, issue_date: dayOffset(-22), due_date: dayOffset(-15), status: "paid", discount_percent: 0, gst_percent: 18,
          items: [{ description: "Design Monthly (monthly plan)", qty: 1, unit_price: 999 }] },
        { id: 2, user_id: 2, issue_date: dayOffset(-2), due_date: dayOffset(5), status: "pending", discount_percent: 5, gst_percent: 18,
          items: [{ description: "Design Monthly (monthly plan)", qty: 1, unit_price: 999 },
                  { description: "Priority support add-on", qty: 1, unit_price: 299 }] },
        { id: 3, user_id: 3, issue_date: dayOffset(-62), due_date: dayOffset(-55), status: "paid", discount_percent: 10, gst_percent: 18,
          items: [{ description: "Design Yearly (yearly plan)", qty: 1, unit_price: 9999 }] },
        { id: 4, user_id: 4, issue_date: dayOffset(-5), due_date: dayOffset(2), status: "pending", discount_percent: 0, gst_percent: 18,
          items: [{ description: "Storage Quarterly (quarterly plan)", qty: 1, unit_price: 799 }] }
    ];
}

function seedPayments() {
    const invoices = seedInvoices();
    const total = (id) => calcInvoice(invoices.find(i => i.id === id)).total;
    return [
        { id: 1, invoice_id: 1, amount: total(1), payment_date: dayOffset(-16), status: "paid" },
        { id: 2, invoice_id: 3, amount: total(3), payment_date: dayOffset(-56), status: "paid" }
    ];
}

function seedDb() {
    return {
        nextId: 100,
        users: [
            { id: 1, name: "Admin", email: "admin@brightloop.com", password: "admin123", role: "admin", created_at: dayOffset(-120) },
            { id: 2, name: "Jaseera", email: "customer@brightloop.com", password: "customer123", role: "customer", created_at: dayOffset(-30) },
            { id: 3, name: "Arun Kumar", email: "arun@example.com", password: "demo", role: "customer", created_at: dayOffset(-45) },
            { id: 4, name: "Meera Nair", email: "meera@example.com", password: "demo", role: "customer", created_at: dayOffset(-12) }
        ],
        products: [
            { id: 1, name: "Design Suite", type: "Software", cost_price: 400, sales_price: 999, description: "" },
            { id: 2, name: "Cloud Storage", type: "Service", cost_price: 100, sales_price: 299, description: "" },
            { id: 3, name: "Analytics Pro", type: "Software", cost_price: 600, sales_price: 1499, description: "" }
        ],
        plans: [
            { id: 1, name: "Design Monthly", product_id: 1, price: 999, frequency: "monthly", description: "" },
            { id: 2, name: "Design Yearly", product_id: 1, price: 9999, frequency: "yearly", description: "" },
            { id: 3, name: "Storage Quarterly", product_id: 2, price: 799, frequency: "quarterly", description: "" },
            { id: 4, name: "Analytics Monthly", product_id: 3, price: 1499, frequency: "monthly", description: "" }
        ],
        subscriptions: [
            { id: 1, user_id: 2, plan_id: 1, start_date: dayOffset(-20), end_date: dayOffset(10), status: "active" },
            { id: 2, user_id: 3, plan_id: 2, start_date: dayOffset(-60), end_date: dayOffset(305), status: "active" },
            { id: 3, user_id: 4, plan_id: 3, start_date: dayOffset(-5), end_date: dayOffset(85), status: "pending" },
            { id: 4, user_id: 3, plan_id: 4, start_date: dayOffset(-90), end_date: dayOffset(-60), status: "cancelled" }
        ],
        invoices: seedInvoices(),
        payments: seedPayments()
    };
}

function loadDb() {
    try {
        const saved = localStorage.getItem(DEMO_KEY);
        if (saved) return JSON.parse(saved);
    } catch {}
    return seedDb();
}

function saveDb(db) {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(db)); } catch {}
}

async function api(url, options = {}) {
    await new Promise(resolve => setTimeout(resolve, 250));

    const db = loadDb();
    const method = (options.method || "GET").toUpperCase();
    const body = options.body || {};
    const fail = (message) => { throw new Error(message); };

    const me = db.users.find(u => u.id === Number(sessionStorage.getItem("demo-user")));
    const admin = me?.role === "admin";
    const route = url.match(/^\/([a-z-]+)(?:\/(\d+))?(?:\/(pay))?$/);
    if (!route) fail("Unknown request.");
    const [, name, rawId, action] = route;
    const id = Number(rawId);

    const planOf = (planId) => db.plans.find(p => p.id === planId);
    const userOf = (userId) => db.users.find(u => u.id === userId);
    const addDays = (freq) => ({ monthly: 30, quarterly: 90, yearly: 365 }[freq] || 30);

    if (name === "login" && method === "POST") {
        const user = db.users.find(u => u.email.toLowerCase() === String(body.email).toLowerCase());
        if (!user || user.password !== body.password) fail("Incorrect email or password.");
        sessionStorage.setItem("demo-user", user.id);
        return { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    }

    if (name === "register" && method === "POST") {
        if (db.users.some(u => u.email.toLowerCase() === String(body.email).toLowerCase())) {
            fail("An account with this email already exists.");
        }
        db.users.push({ id: db.nextId++, name: body.name, email: body.email, password: body.password, role: "customer", created_at: dayOffset(0) });
        saveDb(db);
        return { ok: true };
    }

    if (name === "logout") { sessionStorage.removeItem("demo-user"); return { ok: true }; }

    if (!me) fail("Please sign in.");
    if (name === "me") return { user: { id: me.id, name: me.name, email: me.email, role: me.role } };

    const mine = (list) => admin ? list : list.filter(x => x.user_id === me.id);

    switch (name) {
        case "stats":
            return {
                total_revenue: db.payments.reduce((sum, p) => sum + p.amount, 0),
                active_subscriptions: db.subscriptions.filter(s => s.status === "active").length,
                total_customers: db.users.filter(u => u.role === "customer").length,
                total_products: db.products.length
            };

        case "customer-stats": {
            const subs = mine(db.subscriptions);
            const invs = mine(db.invoices);
            return {
                total_subscriptions: subs.length,
                active_subscriptions: subs.filter(s => s.status === "active").length,
                total_paid: invs.filter(i => i.status === "paid").reduce((sum, i) => sum + calcInvoice(i).total, 0),
                pending_invoices: invs.filter(i => i.status !== "paid").length
            };
        }

        case "products":
            if (method === "POST") { db.products.push({ id: db.nextId++, ...body }); saveDb(db); return { ok: true }; }
            if (method === "DELETE") {
                db.products = db.products.filter(p => p.id !== id);
                db.plans = db.plans.filter(p => p.product_id !== id);
                saveDb(db);
                return { ok: true };
            }
            return db.products;

        case "plans":
            if (method === "POST") { db.plans.push({ id: db.nextId++, ...body }); saveDb(db); return { ok: true }; }
            if (method === "DELETE") { db.plans = db.plans.filter(p => p.id !== id); saveDb(db); return { ok: true }; }
            return db.plans.map(p => ({ ...p, product_name: db.products.find(x => x.id === p.product_id)?.name }));

        case "customers":
            return db.users.filter(u => u.role === "customer");

        case "subscriptions":
            if (method === "POST") {
                const plan = planOf(body.plan_id);
                if (!plan) fail("Plan not found.");
                const subId = db.nextId++;
                db.subscriptions.push({ id: subId, user_id: me.id, plan_id: plan.id, start_date: dayOffset(0), end_date: dayOffset(addDays(plan.frequency)), status: "active" });
                db.invoices.push({ id: db.nextId++, user_id: me.id, issue_date: dayOffset(0), due_date: dayOffset(7), status: "pending", discount_percent: 0, gst_percent: 18, items: [{ description: plan.name + " (" + plan.frequency + " plan)", qty: 1, unit_price: plan.price }] });
                saveDb(db);
                return { ok: true };
            }
            return mine(db.subscriptions).map(s => ({
                ...s, plan_name: planOf(s.plan_id)?.name, customer_name: userOf(s.user_id)?.name
            })).reverse();

        case "invoices": {
            const invoiceView = (i) => ({
                ...i,
                invoice_number: "INV-" + String(i.id).padStart(4, "0"),
                customer_name: userOf(i.user_id)?.name,
                customer_email: userOf(i.user_id)?.email,
                amount: calcInvoice(i).total
            });
            const find = () => {
                const invoice = db.invoices.find(i => i.id === id);
                if (!invoice || (!admin && invoice.user_id !== me.id)) fail("Invoice not found.");
                return invoice;
            };

            if (action === "pay") {
                const invoice = find();
                if (invoice.status === "paid") fail("This invoice is already paid.");
                invoice.status = "paid";
                db.payments.push({ id: db.nextId++, invoice_id: invoice.id, amount: calcInvoice(invoice).total, payment_date: dayOffset(0), status: "paid" });
                saveDb(db);
                return { ok: true };
            }

            if (method === "POST") {
                if (!admin) fail("Only admins can create invoices.");
                db.invoices.push({
                    id: db.nextId++, user_id: Number(body.user_id), issue_date: dayOffset(0), due_date: dayOffset(14),
                    status: "pending", discount_percent: Number(body.discount_percent || 0), gst_percent: Number(body.gst_percent || 0),
                    items: [{ description: body.description, qty: Number(body.quantity), unit_price: Number(body.unit_price) }]
                });
                saveDb(db);
                return { ok: true };
            }

            if (rawId) {
                const invoice = find();
                if (method === "PATCH") {
                    if (!admin) fail("Only admins can edit invoices.");
                    if (invoice.status === "paid") fail("Paid invoices can't be edited.");
                    invoice.discount_percent = Math.min(100, Math.max(0, Number(body.discount_percent || 0)));
                    invoice.gst_percent = Math.min(100, Math.max(0, Number(body.gst_percent || 0)));
                    saveDb(db);
                    return { ok: true };
                }
                return invoiceView(invoice);
            }

            return mine(db.invoices).map(invoiceView).reverse();
        }

        case "payments":
            return db.payments.map(p => ({
                ...p, invoice_number: "INV-" + String(p.invoice_id).padStart(4, "0")
            })).reverse();
    }

    fail("Unknown request.");
}

function money(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function money2(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (isNaN(date)) return safe(value);

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function toast(message, type = "success") {
    const element = $("toast");
    element.textContent = message;
    element.classList.toggle("error", type === "error");
    element.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        element.classList.remove("show");
    }, 2800);
}

function showError(error) {
    console.error(error);
    toast(error.message || "Something went wrong. Please try again.", "error");
}

function isAdmin() {
    return currentUser?.role === "admin";
}

function getArray(data, key) {
    if (Array.isArray(data)) return data;
    return data?.[key] || [];
}

function getValue(object, ...keys) {
    for (const key of keys) {
        if (object?.[key] !== undefined && object[key] !== null) {
            return object[key];
        }
    }
    return 0;
}

/* =========================================
   AUTHENTICATION
========================================= */

let authRole = "customer";

const DEMO_LOGIN = {
    admin: { email: "admin@brightloop.com", password: "admin123" },
    customer: { email: "customer@brightloop.com", password: "customer123" }
};

const ROLE_TEXT = {
    customer: {
        title: "Customer sign in",
        description: "View your plans, invoices and payments."
    },
    admin: {
        title: "Admin sign in",
        description: "Manage products, plans, customers and billing."
    }
};

function setRole(role) {
    authRole = role;

    document.querySelectorAll(".role-tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.role === role);
    });
    document.querySelectorAll(".role-card").forEach(card => {
        card.classList.toggle("active", card.dataset.role === role);
    });

    /* Only customers can create their own account */
    $("auth-switch").classList.toggle("hidden", role === "admin");
    showLogin();

    /* Preview mode: fill in the demo login for this role */
    $("login-email").value = DEMO_LOGIN[role].email;
    $("login-password").value = DEMO_LOGIN[role].password;
}

function showLogin() {
    $("login-form").classList.remove("hidden");
    $("register-form").classList.add("hidden");

    $("auth-title").textContent = ROLE_TEXT[authRole].title;
    $("auth-eyebrow").textContent = "Welcome back";
    $("auth-description").textContent = ROLE_TEXT[authRole].description;

    $("auth-switch-text").textContent = "Don't have an account?";
    $("auth-switch-button").textContent = "Create account";
    $("auth-error").textContent = "";
}

function showRegister() {
    $("login-form").classList.add("hidden");
    $("register-form").classList.remove("hidden");

    $("auth-title").textContent = "Create your customer account";
    $("auth-eyebrow").textContent = "Get started";
    $("auth-description").textContent =
        "Join Brightloop and manage your subscriptions.";

    $("auth-switch-text").textContent = "Already have an account?";
    $("auth-switch-button").textContent = "Sign in";
    $("auth-error").textContent = "";
}

document.querySelectorAll(".role-tab").forEach(tab => {
    tab.addEventListener("click", () => setRole(tab.dataset.role));
});

$("auth-switch-button").addEventListener("click", () => {
    if ($("login-form").classList.contains("hidden")) {
        showLogin();
    } else {
        showRegister();
    }
});

$("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const result = await api("/login", {
            method: "POST",
            body: {
                email: $("login-email").value.trim(),
                password: $("login-password").value
            }
        });

        const user = result.user || result;
        const isAdminAccount = user.role === "admin";

        /* Wrong tab for this account: sign out again and explain */
        if ((authRole === "admin") !== isAdminAccount) {
            try { await api("/logout", { method: "POST" }); } catch {}
            $("auth-error").textContent = isAdminAccount
                ? "This is an admin account. Choose the Admin tab to sign in."
                : "This is a customer account. Choose the Customer tab to sign in.";
            return;
        }

        currentUser = user;
        await startApp();
    } catch (error) {
        $("auth-error").textContent = error.message;
    }
});

$("register-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        await api("/register", {
            method: "POST",
            body: {
                name: $("register-name").value.trim(),
                email: $("register-email").value.trim(),
                password: $("register-password").value
            }
        });

        toast("Account created! Please sign in.");
        showLogin();
    } catch (error) {
        $("auth-error").textContent = error.message;
    }
});

$("logout-button").addEventListener("click", async () => {
    try {
        await api("/logout", { method: "POST" });
    } catch (error) {
        console.error(error);
    }

    currentUser = null;
    currentPage = "dashboard";
    $("app").classList.add("hidden");
    $("auth-page").classList.remove("hidden");
    setRole("customer");
});

/* Preview mode: jump between the admin and customer workspaces */
$("switch-view-button").addEventListener("click", async () => {
    const target = isAdmin() ? "customer" : "admin";

    try {
        await api("/logout", { method: "POST" });
        const result = await api("/login", { method: "POST", body: DEMO_LOGIN[target] });
        currentUser = result.user || result;
        currentPage = "dashboard";
        authRole = target;
        await startApp();
    } catch (error) {
        showError(error);
    }
});

/* =========================================
   START APPLICATION
========================================= */

async function startApp() {
    $("auth-page").classList.add("hidden");
    $("app").classList.remove("hidden");

    const name = currentUser.name || currentUser.email || "User";
    const initial = name.charAt(0).toUpperCase();

    $("logged-user").textContent = name;
    $("user-role").textContent = isAdmin() ? "Administrator" : "Customer";
    $("user-avatar").textContent = initial;
    $("switch-view-button").textContent =
        isAdmin() ? "Switch to customer view" : "Switch to admin view";

    $("current-date").textContent =
        new Date().toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
        });

    buildNavigation();
    await navigate("dashboard");
}

/* =========================================
   NAVIGATION
========================================= */

const adminPages = [
    { id: "dashboard", name: "Overview", icon: ICON.home },
    { id: "products", name: "Products", icon: ICON.box },
    { id: "plans", name: "Plans", icon: ICON.diamond },
    { id: "customers", name: "Customers", icon: ICON.user },
    { id: "subscriptions", name: "Subscriptions", icon: ICON.loop },
    { id: "invoices", name: "Invoices", icon: ICON.receipt },
    { id: "payments", name: "Payments", icon: ICON.rupee },
    { id: "reports", name: "Reports", icon: ICON.chart }
];

const customerPages = [
    { id: "dashboard", name: "Overview", icon: ICON.home },
    { id: "browse", name: "Explore Plans", icon: ICON.diamond },
    { id: "subscriptions", name: "My Subscriptions", icon: ICON.loop },
    { id: "invoices", name: "My Invoices", icon: ICON.receipt }
];

function buildNavigation() {
    const pages = isAdmin() ? adminPages : customerPages;

    $("navigation").innerHTML = pages.map(page => `
        <button class="nav-item ${page.id === currentPage ? "active" : ""}"
                data-page="${page.id}">
            <span class="nav-icon">${page.icon}</span>
            <span>${page.name}</span>
        </button>
    `).join("");

    document.querySelectorAll(".nav-item").forEach(button => {
        button.addEventListener("click", () => {
            navigate(button.dataset.page);
        });
    });
}

async function navigate(page) {
    const pages = isAdmin() ? adminPages : customerPages;

    if (!pages.some(item => item.id === page)) return;

    currentPage = page;
    buildNavigation();

    const selected = pages.find(item => item.id === page);

    $("breadcrumb").textContent = "Workspace / " + selected.name;
    $("page-heading").textContent = selected.name;
    $("page-content").innerHTML =
        `<div class="loading-state"><div class="skeleton"><i></i><i></i><i></i></div></div>`;

    try {
        switch (page) {
            case "dashboard":
                await renderDashboard();
                break;
            case "products":
                await renderProducts();
                break;
            case "plans":
                await renderPlans();
                break;
            case "customers":
                await renderCustomers();
                break;
            case "subscriptions":
                await renderSubscriptions();
                break;
            case "browse":
                await renderBrowsePlans();
                break;
            case "invoices":
                await renderInvoices();
                break;
            case "payments":
                await renderPayments();
                break;
            case "reports":
                await renderReports();
                break;
        }
    } catch (error) {
        console.error(error);
        $("page-content").innerHTML = `
            <div class="empty-state">
                <h3>Unable to load this page</h3>
                <p>${safe(error.message)}</p>
                <button class="action-button" onclick="navigate('${page}')">
                    Try again
                </button>
            </div>`;
    }
}

/* =========================================
   DASHBOARD
========================================= */

function statusChart(subscriptions) {
    const counts = { active: 0, pending: 0, cancelled: 0 };

    subscriptions.forEach(item => {
        const key = String(item.status || "pending").toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
    });

    const max = Math.max(1, ...Object.values(counts));

    return `
        <div class="status-chart">
            ${Object.entries(counts).map(([key, count]) => `
                <div class="status-row">
                    <span style="text-transform:capitalize">${safe(key)}</span>
                    <div class="track">
                        <div class="fill ${safe(key)}" style="width:${(count / max) * 100}%"></div>
                    </div>
                    <b>${count}</b>
                </div>
            `).join("")}
        </div>`;
}

async function renderDashboard() {
    if (isAdmin()) {
        const [statsData, subscriptionData] = await Promise.all([
            api("/stats"),
            api("/subscriptions")
        ]);

        const stats = statsData.stats || statsData;
        const subscriptions = getArray(subscriptionData, "subscriptions");

        const revenue = getValue(stats,
            "total_revenue", "revenue", "total_sales");

        const active = getValue(stats,
            "active_subscriptions", "active");

        const customers = getValue(stats,
            "total_customers", "customers");

        const products = getValue(stats,
            "total_products", "products");

        $("page-content").innerHTML = `
            <div class="welcome-banner">
                <div>
                    <h2>Welcome back, ${safe(currentUser.name || "Admin")}</h2>
                    <p>Here's what's happening with your business today.</p>
                </div>
                <div class="banner-tag">Admin workspace</div>
            </div>

            <div class="stats-grid">
                ${statCard("rupee", "Total revenue", money(revenue))}
                ${statCard("loop", "Active subscriptions", active)}
                ${statCard("user", "Total customers", customers)}
                ${statCard("box", "Total products", products)}
            </div>

            <div class="dashboard-grid">
                <div class="panel">
                    <div class="panel-heading">
                        <div>
                            <h3>Subscriptions by status</h3>
                            <p>How many customers are in each stage</p>
                        </div>
                    </div>
                    ${statusChart(subscriptions)}
                </div>

                <div class="panel">
                    <div class="panel-heading">
                        <div>
                            <h3>Quick actions</h3>
                            <p>Manage your workspace</p>
                        </div>
                    </div>
                    <div class="activity-list">
                        ${quickAction("box", "Add a product", "Create a new product", "products")}
                        ${quickAction("diamond", "Create a plan", "Set up subscription pricing", "plans")}
                        ${quickAction("user", "View customers", "Manage customer accounts", "customers")}
                    </div>
                </div>
            </div>

            <div class="panel">
                <div class="panel-heading">
                    <div>
                        <h3>Recent subscriptions</h3>
                        <p>Your latest subscription activity</p>
                    </div>
                    <button class="panel-link" onclick="navigate('subscriptions')">
                        View all →
                    </button>
                </div>
                ${subscriptionTable(subscriptions.slice(0, 5))}
            </div>
        `;
    } else {
        const [statsData, subscriptionData] = await Promise.all([
            api("/customer-stats"),
            api("/subscriptions")
        ]);

        const stats = statsData.stats || statsData;
        const subscriptions = getArray(subscriptionData, "subscriptions");

        $("page-content").innerHTML = `
            <div class="welcome-banner">
                <div>
                    <h2>Hey, ${safe(currentUser.name || "there")}!</h2>
                    <p>Your subscriptions, all in one place.</p>
                </div>
                <div class="banner-tag">Customer workspace</div>
            </div>

            <div class="stats-grid">
                ${statCard("loop", "My subscriptions",
                    getValue(stats, "total_subscriptions", "subscriptions"))}
                ${statCard("check", "Active plans",
                    getValue(stats, "active_subscriptions", "active"))}
                ${statCard("rupee", "Total paid",
                    money(getValue(stats, "total_paid", "paid")))}
                ${statCard("receipt", "Pending invoices",
                    getValue(stats, "pending_invoices", "pending"))}
            </div>

            <div class="panel">
                <div class="panel-heading">
                    <div>
                        <h3>My recent subscriptions</h3>
                        <p>Stay up to date with your plans</p>
                    </div>
                    <button class="panel-link" onclick="navigate('browse')">
                        Explore plans →
                    </button>
                </div>
                ${subscriptionTable(subscriptions.slice(0, 5))}
            </div>
        `;
    }
}

function statCard(icon, label, value) {
    return `
        <div class="stat-card">
            <div class="stat-top">
                <div class="stat-icon">${ICON[icon] || ""}</div>
            </div>
            <div class="stat-label">${safe(label)}</div>
            <div class="stat-value">${safe(value)}</div>
        </div>`;
}

function quickAction(icon, title, description, page) {
    return `
        <div class="activity-item" style="cursor:pointer"
             onclick="navigate('${page}')">
            <div class="activity-icon">${ICON[icon] || ""}</div>
            <div class="activity-text">
                <strong>${title}</strong>
                <small>${description}</small>
            </div>
            <span>→</span>
        </div>`;
}

/* =========================================
   TABLE HELPERS
========================================= */

function statusBadge(status) {
    const value = String(status || "pending").toLowerCase();
    const safeClass = ["active", "paid", "pending", "cancelled", "overdue"]
        .includes(value) ? value : "pending";

    return `<span class="status ${safeClass}">${safe(value)}</span>`;
}

function subscriptionTable(subscriptions) {
    if (!subscriptions.length) {
        return `<div class="empty-state">
            <h3>No subscriptions yet</h3>
            <p>Your subscriptions will appear here.</p>
        </div>`;
    }

    return `
        <div class="table-scroll">
            <table>
                <thead>
                    <tr>
                        <th>Plan</th>
                        ${isAdmin() ? "<th>Customer</th>" : ""}
                        <th>Start date</th>
                        <th>End date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${subscriptions.map(item => `
                        <tr>
                            <td><strong>${safe(getValue(item, "plan_name", "name") || "Subscription")}</strong></td>
                            ${isAdmin() ? `<td>${safe(item.customer_name || item.customer_email || "—")}</td>` : ""}
                            <td>${formatDate(item.start_date)}</td>
                            <td>${formatDate(item.end_date)}</td>
                            <td>${statusBadge(item.status)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>`;
}

function renderTable(title, headers, rows, emptyText) {
    if (!rows.length) {
        return `<div class="empty-state">
            <h3>No ${safe(title.toLowerCase())} yet</h3>
            <p>${safe(emptyText || "Records will appear here when available.")}</p>
        </div>`;
    }

    return `
        <div class="table-scroll">
            <table>
                <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
                <tbody>${rows.join("")}</tbody>
            </table>
        </div>`;
}

/* =========================================
   PRODUCTS
========================================= */

async function renderProducts() {
    const data = await api("/products");
    const products = getArray(data, "products");

    $("page-content").innerHTML = `
        <div class="table-panel">
            <div class="table-toolbar">
                <h3>Product catalogue</h3>
                <div class="toolbar-actions">
                    <input class="search-input" id="product-search"
                           placeholder="Search products...">
                    <button class="action-button" id="add-product-button">+ Add product</button>
                </div>
            </div>
            <div id="product-table">
                ${renderProductTable(products)}
            </div>
        </div>
    `;

    $("add-product-button").addEventListener("click", showProductModal);

    $("product-search").addEventListener("input", event => {
        const query = event.target.value.toLowerCase();

        $("product-table").innerHTML = renderProductTable(
            products.filter(product =>
                `${product.name} ${product.type}`.toLowerCase().includes(query)
            )
        );
    });
}

function renderProductTable(products) {
    return renderTable("Products",
        ["Product", "Type", "Cost price", "Sales price", "Action"],
        products.map(product => `
            <tr>
                <td><strong>${safe(product.name)}</strong></td>
                <td>${safe(product.type || "—")}</td>
                <td>${money(product.cost_price)}</td>
                <td>${money(product.sales_price)}</td>
                <td>
                    <button class="row-action danger-action"
                        onclick="deleteProduct(${Number(product.id)})">
                        Delete
                    </button>
                </td>
            </tr>
        `),
        "Add your first product to start building plans."
    );
}

function showProductModal() {
    openModal(`
        <h2>Add new product</h2>
        <form id="product-form">
            <label>Product name</label>
            <input name="name" placeholder="Enter product name" required>

            <label>Product type</label>
            <input name="type" placeholder="e.g. Software, Service" required>

            <label>Cost price (₹)</label>
            <input name="cost_price" type="number" min="0" step="0.01" required>

            <label>Sales price (₹)</label>
            <input name="sales_price" type="number" min="0" step="0.01" required>

            <label>Description</label>
            <textarea name="description" rows="3" placeholder="Describe your product"></textarea>

            <div class="modal-actions">
                <button type="button" class="secondary-button" onclick="closeModal()">Cancel</button>
                <button class="action-button" type="submit">Save product</button>
            </div>
        </form>
    `);

    $("product-form").addEventListener("submit", async event => {
        event.preventDefault();

        const form = new FormData(event.target);

        try {
            await api("/products", {
                method: "POST",
                body: {
                    name: form.get("name"),
                    type: form.get("type"),
                    cost_price: Number(form.get("cost_price")),
                    sales_price: Number(form.get("sales_price")),
                    description: form.get("description")
                }
            });

            closeModal();
            toast("Product added.");
            navigate("products");
        } catch (error) {
            showError(error);
        }
    });
}

async function deleteProduct(id) {
    if (!await confirmDialog("Delete this product?",
        "This can't be undone.", "Delete product", true)) return;

    try {
        await api("/products/" + id, { method: "DELETE" });
        toast("Product deleted.");
        navigate("products");
    } catch (error) {
        showError(error);
    }
}

/* =========================================
   PLANS
========================================= */

async function renderPlans() {
    const [planData, productData] = await Promise.all([
        api("/plans"),
        api("/products")
    ]);

    const plans = getArray(planData, "plans");
    const products = getArray(productData, "products");

    $("page-content").innerHTML = `
        <div class="table-panel">
            <div class="table-toolbar">
                <h3>Subscription plans</h3>
                <button class="action-button" id="add-plan-button">+ Create plan</button>
            </div>
            ${renderPlanTable(plans)}
        </div>
    `;

    $("add-plan-button").addEventListener("click", () => {
        showPlanModal(products);
    });
}

function renderPlanTable(plans) {
    return renderTable("Plans",
        ["Plan", "Product", "Price", "Billing cycle", "Action"],
        plans.map(plan => `
            <tr>
                <td><strong>${safe(plan.name)}</strong></td>
                <td>${safe(plan.product_name || "—")}</td>
                <td>${money(plan.price)}</td>
                <td style="text-transform:capitalize">${safe(plan.frequency || "—")}</td>
                <td>
                    <button class="row-action danger-action"
                        onclick="deletePlan(${Number(plan.id)})">
                        Delete
                    </button>
                </td>
            </tr>
        `),
        "Create a plan so customers can subscribe."
    );
}

function showPlanModal(products) {
    if (!products.length) {
        toast("Add a product first, then create a plan.", "error");
        return;
    }

    openModal(`
        <h2>Create subscription plan</h2>
        <form id="plan-form">
            <label>Plan name</label>
            <input name="name" placeholder="e.g. Premium Monthly" required>

            <label>Select product</label>
            <select name="product_id" required>
                <option value="">Choose product</option>
                ${products.map(product => `
                    <option value="${Number(product.id)}">${safe(product.name)}</option>
                `).join("")}
            </select>

            <label>Subscription price (₹)</label>
            <input name="price" type="number" min="0" step="0.01" required>

            <label>Billing frequency</label>
            <select name="frequency" required>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
            </select>

            <label>Description</label>
            <textarea name="description" rows="3" placeholder="Describe this plan"></textarea>

            <div class="modal-actions">
                <button type="button" class="secondary-button" onclick="closeModal()">Cancel</button>
                <button class="action-button" type="submit">Create plan</button>
            </div>
        </form>
    `);

    $("plan-form").addEventListener("submit", async event => {
        event.preventDefault();

        const form = new FormData(event.target);

        try {
            await api("/plans", {
                method: "POST",
                body: {
                    name: form.get("name"),
                    product_id: Number(form.get("product_id")),
                    price: Number(form.get("price")),
                    frequency: form.get("frequency"),
                    description: form.get("description")
                }
            });

            closeModal();
            toast("Plan created.");
            navigate("plans");
        } catch (error) {
            showError(error);
        }
    });
}

async function deletePlan(id) {
    if (!await confirmDialog("Delete this plan?",
        "Customers will no longer be able to subscribe to it.", "Delete plan", true)) return;

    try {
        await api("/plans/" + id, { method: "DELETE" });
        toast("Plan deleted.");
        navigate("plans");
    } catch (error) {
        showError(error);
    }
}

/* =========================================
   CUSTOMERS
========================================= */

async function renderCustomers() {
    const data = await api("/customers");
    const customers = getArray(data, "customers");

    $("page-content").innerHTML = `
        <div class="table-panel">
            <div class="table-toolbar">
                <h3>Customer directory</h3>
                <input class="search-input" id="customer-search"
                       placeholder="Search customers...">
            </div>
            <div id="customer-table">
                ${renderCustomerTable(customers)}
            </div>
        </div>
    `;

    $("customer-search").addEventListener("input", event => {
        const query = event.target.value.toLowerCase();

        $("customer-table").innerHTML = renderCustomerTable(
            customers.filter(customer =>
                `${customer.name} ${customer.email}`.toLowerCase().includes(query)
            )
        );
    });
}

function renderCustomerTable(customers) {
    return renderTable("Customers",
        ["Customer", "Email", "Joined"],
        customers.map(customer => `
            <tr>
                <td><strong>${safe(customer.name)}</strong></td>
                <td>${safe(customer.email)}</td>
                <td>${formatDate(customer.created_at)}</td>
            </tr>
        `),
        "Customers appear here after they create an account."
    );
}

/* =========================================
   SUBSCRIPTIONS
========================================= */

async function renderSubscriptions() {
    const data = await api("/subscriptions");
    const subscriptions = getArray(data, "subscriptions");

    $("page-content").innerHTML = `
        <div class="table-panel">
            <div class="table-toolbar">
                <h3>${isAdmin() ? "All subscriptions" : "My subscriptions"}</h3>
                ${isAdmin() ? "" : `<button class="action-button" onclick="navigate('browse')">+ Explore plans</button>`}
            </div>
            ${subscriptionTable(subscriptions)}
        </div>
    `;
}

/* =========================================
   CUSTOMER PLAN BROWSER
========================================= */

async function renderBrowsePlans() {
    const data = await api("/plans");
    const plans = getArray(data, "plans");

    $("page-content").innerHTML = `
        <div class="welcome-banner">
            <div>
                <h2>Find your perfect plan</h2>
                <p>Explore our plans and choose what works for you.</p>
            </div>
            <div class="banner-tag">Your next step starts here</div>
        </div>

        ${plans.length ? `
            <div class="cards-grid">
                ${plans.map(plan => `
                    <div class="product-card">
                        <div class="product-card-icon">${ICON.diamond.replace("<svg", '<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"')}</div>
                        <h3>${safe(plan.name)}</h3>
                        <p>${safe(plan.product_name || plan.description || "Subscription plan")}</p>
                        <div class="product-price">
                            ${money(plan.price)}
                            <small>/ ${safe(plan.frequency || "billing cycle")}</small>
                        </div>
                        <button class="action-button" data-name="${safe(plan.name)}"
                            onclick="subscribeToPlan(${Number(plan.id)}, this.dataset.name)">
                            Subscribe now
                        </button>
                    </div>
                `).join("")}
            </div>
        ` : `
            <div class="empty-state">
                <h3>No plans available yet</h3>
                <p>Check back later for new subscription plans.</p>
            </div>
        `}
    `;
}

async function subscribeToPlan(planId, planName) {
    if (!await confirmDialog(`Subscribe to ${planName}?`,
        "An invoice will be created for you automatically.", "Subscribe")) {
        return;
    }

    try {
        await api("/subscriptions", {
            method: "POST",
            body: { plan_id: planId }
        });

        toast("Subscribed. Your invoice is ready.");
        navigate("subscriptions");
    } catch (error) {
        showError(error);
    }
}

/* =========================================
   INVOICES
========================================= */

async function renderInvoices() {
    const data = await api("/invoices");
    const invoices = getArray(data, "invoices");

    $("page-content").innerHTML = `
        <div class="table-panel">
            <div class="table-toolbar">
                <h3>${isAdmin() ? "Invoice management" : "My invoices"}</h3>
                <div class="toolbar-actions">
                    <input class="search-input" id="invoice-search"
                           placeholder="Search invoices...">
                    ${isAdmin() ? `<button class="action-button" id="add-invoice-button">+ Create invoice</button>` : ""}
                </div>
            </div>
            <div id="invoice-table">
                ${renderInvoiceTable(invoices)}
            </div>
        </div>
    `;

    if (isAdmin()) {
        $("add-invoice-button").addEventListener("click", showInvoiceModal);
    }

    $("invoice-search").addEventListener("input", event => {
        const query = event.target.value.toLowerCase();

        $("invoice-table").innerHTML = renderInvoiceTable(
            invoices.filter(invoice =>
                `${invoice.invoice_number || invoice.id} ${invoice.status} ${invoice.customer_name || ""}`
                    .toLowerCase().includes(query)
            )
        );
    });
}

function renderInvoiceTable(invoices) {
    return renderTable("Invoices",
        ["Invoice", ...(isAdmin() ? ["Customer"] : []),
            "Total", "Due date", "Status", "Action"],
        invoices.map(invoice => `
            <tr>
                <td><strong>${safe(invoice.invoice_number || ("INV-" + invoice.id))}</strong></td>
                ${isAdmin() ? `<td>${safe(invoice.customer_name || "—")}</td>` : ""}
                <td>${money2(invoice.amount)}</td>
                <td>${formatDate(invoice.due_date)}</td>
                <td>${statusBadge(invoice.status)}</td>
                <td>
                    <button class="row-action"
                        onclick="viewInvoice(${Number(invoice.id)})">View details</button>
                    ${String(invoice.status).toLowerCase() !== "paid" && !isAdmin()
                        ? `<button class="row-action"
                            onclick="payInvoice(${Number(invoice.id)})">Pay now</button>`
                        : ""}
                </td>
            </tr>
        `),
        "Invoices are created when a customer subscribes to a plan."
    );
}

/* ---------- Invoice details (customer sees their own, admin sees all) ---------- */

function totalRow(label, value, extra = "") {
    return `<div class="total-row ${extra}"><span>${label}</span><strong>${value}</strong></div>`;
}

async function viewInvoice(id) {
    try {
        const invoice = await api("/invoices/" + id);
        const c = calcInvoice(invoice);
        const paid = String(invoice.status).toLowerCase() === "paid";
        const half = c.gstPct / 2;

        openModal(`
            <div class="invoice-doc">
                <div class="invoice-head">
                    <div>
                        <div class="invoice-brand">brightloop</div>
                        <h2>${safe(invoice.invoice_number || "INV-" + invoice.id)}</h2>
                    </div>
                    ${statusBadge(invoice.status)}
                </div>

                <div class="invoice-meta">
                    <div><small>Billed to</small><strong>${safe(invoice.customer_name || "—")}</strong><span>${safe(invoice.customer_email || "")}</span></div>
                    <div><small>Issued</small><strong>${formatDate(invoice.issue_date)}</strong></div>
                    <div><small>Due</small><strong>${formatDate(invoice.due_date)}</strong></div>
                </div>

                <div class="table-scroll invoice-scroll">
                    <table class="invoice-items">
                        <thead>
                            <tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr>
                        </thead>
                        <tbody>
                            ${c.items.map(item => `
                                <tr>
                                    <td>${safe(item.description)}</td>
                                    <td class="num">${safe(item.qty)}</td>
                                    <td class="num">${money2(item.unit_price)}</td>
                                    <td class="num">${money2(Number(item.qty) * Number(item.unit_price))}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>

                <div class="invoice-totals">
                    ${totalRow("Subtotal", money2(c.subtotal))}
                    ${totalRow(`Discount (${c.discountPct}%)`, "− " + money2(c.discount), "discount")}
                    ${totalRow("Taxable amount", money2(c.taxable))}
                    ${totalRow(`CGST (${half}%)`, money2(c.cgst))}
                    ${totalRow(`SGST (${half}%)`, money2(c.sgst))}
                    ${totalRow("Total tax (GST " + c.gstPct + "%)", money2(c.tax), "muted")}
                    ${totalRow(paid ? "Total paid" : "Total due", money2(c.total), "grand")}
                </div>

                ${isAdmin() && !paid ? `
                    <div class="invoice-edit no-print">
                        <label>Discount %
                            <input id="inv-discount" type="number" min="0" max="100" step="0.5" value="${c.discountPct}">
                        </label>
                        <label>GST %
                            <input id="inv-gst" type="number" min="0" max="100" step="0.5" value="${c.gstPct}">
                        </label>
                        <button type="button" class="secondary-button" onclick="saveInvoiceTerms(${Number(invoice.id)})">Save changes</button>
                    </div>` : ""}

                <div class="modal-actions no-print">
                    <button type="button" class="secondary-button" onclick="window.print()">Print / save as PDF</button>
                    <button type="button" class="secondary-button" onclick="closeModal()">Close</button>
                    ${!paid && !isAdmin() ? `<button type="button" class="action-button" onclick="payInvoice(${Number(invoice.id)})">Pay now</button>` : ""}
                    ${!paid && isAdmin() ? `<button type="button" class="action-button" onclick="markInvoicePaid(${Number(invoice.id)})">Mark as paid</button>` : ""}
                </div>
            </div>
        `, true);
    } catch (error) {
        showError(error);
    }
}

async function saveInvoiceTerms(id) {
    try {
        await api("/invoices/" + id, {
            method: "PATCH",
            body: {
                discount_percent: Number($("inv-discount").value),
                gst_percent: Number($("inv-gst").value)
            }
        });
        toast("Invoice updated.");
        await navigate("invoices");
        await viewInvoice(id);
    } catch (error) {
        showError(error);
    }
}

async function markInvoicePaid(id) {
    if (!await confirmDialog("Mark this invoice as paid?",
        "A payment for the full invoice total will be recorded.", "Mark as paid")) return;

    try {
        await api(`/invoices/${id}/pay`, { method: "POST" });
        toast("Invoice marked as paid.");
        navigate("invoices");
    } catch (error) {
        showError(error);
    }
}

async function showInvoiceModal() {
    try {
        const customers = getArray(await api("/customers"), "customers");

        openModal(`
            <h2>Create invoice</h2>
            <form id="invoice-form">
                <label>Customer</label>
                <select name="user_id" required>
                    <option value="">Choose customer</option>
                    ${customers.map(c => `<option value="${Number(c.id)}">${safe(c.name)} (${safe(c.email)})</option>`).join("")}
                </select>

                <label>Item description</label>
                <input name="description" placeholder="e.g. Design Monthly plan" required>

                <label>Quantity</label>
                <input name="quantity" type="number" min="1" step="1" value="1" required>

                <label>Unit price (₹)</label>
                <input name="unit_price" type="number" min="0" step="0.01" required>

                <label>Discount (%)</label>
                <input name="discount_percent" type="number" min="0" max="100" step="0.5" value="0">

                <label>GST (%)</label>
                <input name="gst_percent" type="number" min="0" max="100" step="0.5" value="18">

                <div class="modal-actions">
                    <button type="button" class="secondary-button" onclick="closeModal()">Cancel</button>
                    <button class="action-button" type="submit">Create invoice</button>
                </div>
            </form>
        `);

        $("invoice-form").addEventListener("submit", async event => {
            event.preventDefault();
            const form = new FormData(event.target);

            try {
                await api("/invoices", {
                    method: "POST",
                    body: Object.fromEntries(form.entries())
                });
                closeModal();
                toast("Invoice created.");
                navigate("invoices");
            } catch (error) {
                showError(error);
            }
        });
    } catch (error) {
        showError(error);
    }
}

async function payInvoice(id) {
    if (!await confirmDialog("Pay this invoice?",
        "This uses the demo payment system, so no real money is charged.", "Pay now")) {
        return;
    }

    try {
        await api(`/invoices/${id}/pay`, { method: "POST" });
        toast("Payment successful.");
        navigate("invoices");
    } catch (error) {
        showError(error);
    }
}

/* =========================================
   PAYMENTS
========================================= */

async function renderPayments() {
    const data = await api("/payments");
    const payments = getArray(data, "payments");

    $("page-content").innerHTML = `
        <div class="table-panel">
            <div class="table-toolbar">
                <h3>Payment history</h3>
            </div>
            ${renderTable("Payments",
                ["Payment ID", "Invoice", "Amount", "Date", "Status"],
                payments.map(payment => `
                    <tr>
                        <td>#${safe(payment.id)}</td>
                        <td>${safe(payment.invoice_number || payment.invoice_id || "—")}</td>
                        <td>${money(payment.amount)}</td>
                        <td>${formatDate(payment.payment_date || payment.created_at)}</td>
                        <td>${statusBadge(payment.status || "paid")}</td>
                    </tr>
                `),
                "Payments appear here once invoices are paid."
            )}
        </div>
    `;
}

/* =========================================
   REPORTS
========================================= */

async function renderReports() {
    const data = await api("/stats");
    const stats = data.stats || data;

    $("page-content").innerHTML = `
        <div class="welcome-banner">
            <div>
                <h2>Business insights</h2>
                <p>A quick look at your subscription business performance.</p>
            </div>
            <div class="banner-tag">Admin reports</div>
        </div>

        <div class="stats-grid">
            ${statCard("rupee", "Total revenue",
                money(getValue(stats, "total_revenue", "revenue")))}
            ${statCard("loop", "Active subscriptions",
                getValue(stats, "active_subscriptions", "active"))}
            ${statCard("user", "Customers",
                getValue(stats, "total_customers", "customers"))}
            ${statCard("box", "Products",
                getValue(stats, "total_products", "products"))}
        </div>

        <div class="panel">
            <div class="panel-heading">
                <div>
                    <h3>Business summary</h3>
                    <p>Current figures from your Brightloop database</p>
                </div>
            </div>
            <div class="activity-list">
                ${reportRow("Total revenue", money(getValue(stats, "total_revenue", "revenue")))}
                ${reportRow("Active subscriptions", getValue(stats, "active_subscriptions", "active"))}
                ${reportRow("Total customers", getValue(stats, "total_customers", "customers"))}
                ${reportRow("Total products", getValue(stats, "total_products", "products"))}
            </div>
        </div>
    `;
}

function reportRow(label, value) {
    return `
        <div class="activity-item">
            <div class="activity-text"><strong>${safe(label)}</strong></div>
            <strong>${safe(value)}</strong>
        </div>`;
}

/* =========================================
   MODAL HELPERS
========================================= */

let confirmResolver = null;

function openModal(content, wide = false) {
    $("modal-content").innerHTML = content;
    document.querySelector(".modal-box").classList.toggle("wide", wide);
    $("modal").classList.remove("hidden");
}

function closeModal() {
    $("modal").classList.add("hidden");
    document.querySelector(".modal-box").classList.remove("wide");
    $("modal-content").innerHTML = "";

    if (confirmResolver) {
        confirmResolver(false);
        confirmResolver = null;
    }
}

/* Styled replacement for the browser's confirm() pop-up */
function confirmDialog(title, text, confirmLabel = "Confirm", danger = false) {
    return new Promise(resolve => {
        openModal(`
            <h2>${safe(title)}</h2>
            <p style="color:var(--muted);line-height:1.6">${safe(text)}</p>
            <div class="modal-actions">
                <button type="button" class="secondary-button" id="confirm-no">Cancel</button>
                <button type="button" class="action-button" id="confirm-yes"
                    ${danger ? 'style="background:var(--red)"' : ""}>${safe(confirmLabel)}</button>
            </div>
        `);

        confirmResolver = resolve;

        $("confirm-no").addEventListener("click", closeModal);
        $("confirm-yes").addEventListener("click", () => {
            confirmResolver = null;
            closeModal();
            resolve(true);
        });
        $("confirm-yes").focus();
    });
}

$("modal-backdrop").addEventListener("click", closeModal);

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
});

/* Stop double-clicks from submitting a form twice */
document.addEventListener("submit", (event) => {
    const button = event.target.querySelector("button[type=submit], button:not([type])");
    if (!button) return;
    button.disabled = true;
    setTimeout(() => { button.disabled = false; }, 1500);
}, true);

/* =========================================
   SESSION CHECK
========================================= */

async function checkSession() {
    try {
        const data = await api("/me");
        currentUser = data.user || data;

        if (currentUser && currentUser.email) {
            await startApp();
        } else {
            $("auth-page").classList.remove("hidden");
            $("app").classList.add("hidden");
        }
    } catch (error) {
        currentUser = null;
        $("auth-page").classList.remove("hidden");
        $("app").classList.add("hidden");
        setRole(authRole);
    }
}

/* =========================================
   INITIALIZE
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    checkSession();
});