
// ========================================
// BRIGHTLOOP SUBSCRIPTION MANAGEMENT SYSTEM
// Front-end demonstration only
// ========================================

const USERS_KEY = "brightloop_demo_users";
const DATA_KEY = "brightloop_v2";

let selectedLoginRole = "Admin";
let currentUser = null;
let currentRole = null;
let currentPage = "dashboard";

// ========================================
// INITIAL DATA
// ========================================

function getUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY));
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function createDemoAccounts() {
  const users = getUsers();
  const demoAdmin = users.find(user =>
    user.id === "admin-1" ||
    (typeof user.email === "string" &&
      user.email.toLowerCase() === "brightloop@gmail.com" &&
      user.role === "Admin")
  );
  const adminAccount = {
    id: "admin-1",
    name: "Brightloop Admin",
    email: "brightloop@gmail.com",
    password: "brightloop",
    role: "Admin"
  };

  if (demoAdmin) {
    Object.assign(demoAdmin, adminAccount);
  } else {
    users.push(adminAccount);
  }

  saveUsers(users);
}

function getData() {
  try {
    const data = JSON.parse(localStorage.getItem(DATA_KEY));

    return data || {
      products: [],
      plans: [],
      customers: [],
      subscriptions: [],
      invoices: [],
      payments: []
    };
  } catch {
    return {
      products: [],
      plans: [],
      customers: [],
      subscriptions: [],
      invoices: [],
      payments: []
    };
  }
}

function saveData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

function initializeApp() {
  createDemoAccounts();
  bindEvents();
  selectLoginRole("Admin", document.getElementById("admin-option"));
}

// ========================================
// EVENT LISTENERS
// ========================================

function bindEvents() {
  document.getElementById("login-form")
    .addEventListener("submit", handleLogin);

  document.getElementById("register-form")
    .addEventListener("submit", handleRegistration);

  document.getElementById("logout-btn")
    .addEventListener("click", logout);

  document.getElementById("modal-close")
    .addEventListener("click", closeModal);
}

// ========================================
// LOGIN ROLE SELECTION
// ========================================

function selectLoginRole(role, button) {
  selectedLoginRole = role;

  document.querySelectorAll(".login-option").forEach(option => {
    option.classList.remove("active");
  });

  if (button) {
    button.classList.add("active");
  }

  const registerLink = document.getElementById(
    "customer-register-link"
  );

  registerLink.hidden = role !== "Customer";

  document.getElementById("login-error").textContent = "";
}

// ========================================
// LOGIN / REGISTER PANELS
// ========================================

function showAuthPanel(panel) {
  document.getElementById("login-panel").hidden =
    panel !== "login";

  document.getElementById("register-panel").hidden =
    panel !== "register";

  document.getElementById("login-error").textContent = "";
  document.getElementById("register-error").textContent = "";

  if (panel === "register") {
    selectedLoginRole = "Customer";

    document.getElementById("admin-option")
      .classList.remove("active");

    document.getElementById("customer-option")
      .classList.add("active");
  }
}

// ========================================
// LOGIN
// ========================================

function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("login-email")
    .value.trim().toLowerCase();

  const password = document.getElementById("login-password")
    .value;

  const error = document.getElementById("login-error");

  const users = getUsers();

  const user = users.find(account =>
    account.email.toLowerCase() === email &&
    account.password === password &&
    account.role === selectedLoginRole
  );

  if (!user) {
    error.textContent =
      "Invalid email, password or account type.";
    return;
  }

  currentUser = user;
  currentRole = user.role;

  document.getElementById("login-form").reset();

  showApplication();
}

// ========================================
// CUSTOMER REGISTRATION
// ========================================

function handleRegistration(event) {
  event.preventDefault();

  const name = document.getElementById("register-name")
    .value.trim();

  const email = document.getElementById("register-email")
    .value.trim().toLowerCase();

  const password = document.getElementById("register-password")
    .value;

  const confirmPassword = document.getElementById("register-confirm")
    .value;

  const error = document.getElementById("register-error");

  error.textContent = "";

  if (!name || !email || !password || !confirmPassword) {
    error.textContent = "Please fill in all fields.";
    return;
  }

  if (password.length <= 8) {
    error.textContent =
      "Password must contain more than 8 characters.";
    return;
  }

  if (!/[A-Z]/.test(password)) {
    error.textContent =
      "Password must contain an uppercase letter.";
    return;
  }

  if (!/[a-z]/.test(password)) {
    error.textContent =
      "Password must contain a lowercase letter.";
    return;
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    error.textContent =
      "Password must contain a special character.";
    return;
  }

  if (password !== confirmPassword) {
    error.textContent = "Passwords do not match.";
    return;
  }

  const users = getUsers();

  if (users.some(user => user.email.toLowerCase() === email)) {
    error.textContent =
      "An account with this email already exists.";
    return;
  }

  const newUser = {
    id: "customer-" + Date.now(),
    name,
    email,
    password,
    role: "Customer"
  };

  users.push(newUser);
  saveUsers(users);

  const data = getData();

  data.customers.push({
    id: newUser.id,
    name,
    email,
    createdAt: new Date().toISOString()
  });

  saveData(data);

  document.getElementById("register-form").reset();

  showAuthPanel("login");
  selectLoginRole(
    "Customer",
    document.getElementById("customer-option")
  );

  document.getElementById("login-email").value = email;

  showToast("Registration successful. Please log in.");
}

// ========================================
// SHOW APPLICATION
// ========================================

function showApplication() {
  document.getElementById("auth-page").hidden = true;
  document.getElementById("main-app").hidden = false;

  document.getElementById("logged-in-user").innerHTML = `
    <strong>${escapeHTML(currentUser.name)}</strong><br>
    ${escapeHTML(currentUser.email)}<br>
    <small>${escapeHTML(currentRole)}</small>
  `;

  buildNavigation();
  showPage("dashboard");
}

// ========================================
// NAVIGATION
// ========================================

function buildNavigation() {
  const navigation = document.getElementById("navigation");

  const adminItems = [
    ["dashboard", "📊", "Dashboard"],
    ["products", "📦", "Products"],
    ["plans", "📋", "Plans"],
    ["customers", "👥", "Customers"],
    ["subscriptions", "🔄", "Subscriptions"],
    ["invoices", "🧾", "Invoices"],
    ["payments", "💳", "Payments"]
  ];

  const customerItems = [
    ["dashboard", "📊", "Dashboard"],
    ["subscriptions", "🔄", "My Subscriptions"],
    ["invoices", "🧾", "My Invoices"]
  ];

  const items = currentRole === "Admin"
    ? adminItems
    : customerItems;

  navigation.innerHTML = items.map(item => `
    <button class="nav-item"
      data-page="${item[0]}"
      onclick="showPage('${item[0]}')">
      <span>${item[1]}</span>
      ${item[2]}
    </button>
  `).join("");
}

function showPage(page) {
  const allowedPages = currentRole === "Admin"
    ? [
        "dashboard",
        "products",
        "plans",
        "customers",
        "subscriptions",
        "invoices",
        "payments"
      ]
    : [
        "dashboard",
        "subscriptions",
        "invoices"
      ];

  if (!allowedPages.includes(page)) {
    showToast("You do not have permission to open this page.");
    return;
  }

  currentPage = page;

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  const titles = {
    dashboard: "Dashboard",
    products: "Products",
    plans: "Plans",
    customers: "Customers",
    subscriptions: currentRole === "Admin"
      ? "Subscriptions"
      : "My Subscriptions",
    invoices: currentRole === "Admin"
      ? "Invoices"
      : "My Invoices",
    payments: "Payments"
  };

  document.getElementById("page-heading").textContent =
    titles[page] || "Dashboard";

  const pages = {
    dashboard: dashboardPage,
    products: productsPage,
    plans: plansPage,
    customers: customersPage,
    subscriptions: subscriptionsPage,
    invoices: invoicesPage,
    payments: paymentsPage
  };

  pages[page]();
}

// ========================================
// DASHBOARD
// ========================================

function dashboardPage() {
  const data = getData();

  const subscriptions = currentRole === "Admin"
    ? data.subscriptions
    : data.subscriptions.filter(item =>
        item.customerId === currentUser.id
      );

  const invoices = currentRole === "Admin"
    ? data.invoices
    : data.invoices.filter(item =>
        item.customerId === currentUser.id
      );

  const payments = currentRole === "Admin"
    ? data.payments
    : data.payments.filter(item =>
        item.customerId === currentUser.id
      );

  const activeSubscriptions = subscriptions.filter(
    item => item.status === "Active"
  ).length;

  const paidAmount = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  document.getElementById("page-content").innerHTML = `
    <div class="dashboard-grid">

      <div class="stat-card">
        <div class="stat-icon">🔄</div>
        <p>Active Subscriptions</p>
        <h3>${activeSubscriptions}</h3>
      </div>

      <div class="stat-card">
        <div class="stat-icon">🧾</div>
        <p>Total Invoices</p>
        <h3>${invoices.length}</h3>
      </div>

      <div class="stat-card">
        <div class="stat-icon">💳</div>
        <p>${currentRole === "Admin" ? "Payments Received" : "My Payments"}</p>
        <h3>${formatCurrency(paidAmount)}</h3>
      </div>

      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <p>${currentRole === "Admin" ? "Total Products" : "My Subscriptions"}</p>
        <h3>${currentRole === "Admin" ? data.products.length : subscriptions.length}</h3>
      </div>

    </div>

    <div class="content-card">
      <h3>Welcome, ${escapeHTML(currentUser.name)}</h3>
      <p>
        You are logged in as ${escapeHTML(currentRole)}.
        ${
          currentRole === "Admin"
            ? "You can manage products, plans, customers, subscriptions, invoices and payments."
            : "You can view your own subscriptions and invoices."
        }
      </p>
    </div>
  `;
}

// ========================================
// PRODUCTS
// ========================================

function productsPage() {
  const data = getData();

  document.getElementById("page-content").innerHTML = `
    <div class="content-card">

      <div class="section-header">
        <h3>Product Management</h3>
        <button class="btn btn-primary" onclick="openProductForm()">
          + Add Product
        </button>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Type</th>
              <th>Cost Price</th>
              <th>Sales Price</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              data.products.map(product => `
                <tr>
                  <td>${escapeHTML(product.name)}</td>
                  <td>${escapeHTML(product.type)}</td>
                  <td>${formatCurrency(product.cost)}</td>
                  <td>${formatCurrency(product.price)}</td>
                  <td>
                    <button class="btn btn-danger"
                      onclick="deleteProduct('${product.id}')">
                      Delete
                    </button>
                  </td>
                </tr>
              `).join("") || `
                <tr><td colspan="5">No products available.</td></tr>
              `
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openProductForm() {
  openModal("Add Product", `
    <form id="product-form" class="form-grid">

      <div class="form-group">
        <label>Product Name</label>
        <input name="name" required>
      </div>

      <div class="form-group">
        <label>Product Type</label>
        <select name="type" required>
          <option value="">Select type</option>
          <option value="Software">Software</option>
          <option value="Service">Service</option>
          <option value="Digital Product">Digital Product</option>
        </select>
      </div>

      <div class="form-group">
        <label>Cost Price</label>
        <input name="cost" type="number" min="0" step="0.01" required>
      </div>

      <div class="form-group">
        <label>Sales Price</label>
        <input name="price" type="number" min="0" step="0.01" required>
      </div>

      <div class="form-group full-width">
        <label>Description</label>
        <textarea name="description"></textarea>
      </div>

      <div class="form-group full-width">
        <button class="btn btn-primary" type="submit">
          Save Product
        </button>
      </div>

    </form>
  `);

  document.getElementById("product-form")
    .addEventListener("submit", event => {
      event.preventDefault();

      const form = new FormData(event.target);
      const data = getData();

      data.products.push({
        id: "product-" + Date.now(),
        name: form.get("name").trim(),
        type: form.get("type"),
        cost: Number(form.get("cost")),
        price: Number(form.get("price")),
        description: form.get("description").trim()
      });

      saveData(data);
      closeModal();
      productsPage();
      showToast("Product added successfully.");
    });
}

function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;

  const data = getData();

  data.products = data.products.filter(
    product => product.id !== id
  );

  saveData(data);
  productsPage();
  showToast("Product deleted.");
}

// ========================================
// PLANS
// ========================================

function plansPage() {
  const data = getData();

  document.getElementById("page-content").innerHTML = `
    <div class="content-card">

      <div class="section-header">
        <h3>Subscription Plans</h3>
        <button class="btn btn-primary" onclick="openPlanForm()">
          + Add Plan
        </button>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Plan Name</th>
              <th>Product</th>
              <th>Price</th>
              <th>Billing Frequency</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              data.plans.map(plan => `
                <tr>
                  <td>${escapeHTML(plan.name)}</td>
                  <td>${escapeHTML(plan.productName)}</td>
                  <td>${formatCurrency(plan.price)}</td>
                  <td>${escapeHTML(plan.frequency)}</td>
                  <td>
                    <button class="btn btn-danger"
                      onclick="deletePlan('${plan.id}')">
                      Delete
                    </button>
                  </td>
                </tr>
              `).join("") || `
                <tr><td colspan="5">No plans available.</td></tr>
              `
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openPlanForm() {
  const data = getData();

  if (!data.products.length) {
    showToast("Please create a product first.");
    return;
  }

  openModal("Create Subscription Plan", `
    <form id="plan-form" class="form-grid">

      <div class="form-group">
        <label>Plan Name</label>
        <input name="name" required>
      </div>

      <div class="form-group">
        <label>Product</label>
        <select name="productId" required>
          <option value="">Select Product</option>
          ${data.products.map(product => `
            <option value="${product.id}">
              ${escapeHTML(product.name)}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="form-group">
        <label>Price</label>
        <input name="price" type="number" min="0" step="0.01" required>
      </div>

      <div class="form-group">
        <label>Billing Frequency</label>
        <select name="frequency" required>
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
          <option value="Yearly">Yearly</option>
        </select>
      </div>

      <div class="form-group full-width">
        <button type="submit" class="btn btn-primary">
          Save Plan
        </button>
      </div>

    </form>
  `);

  document.getElementById("plan-form")
    .addEventListener("submit", event => {
      event.preventDefault();

      const form = new FormData(event.target);
      const product = data.products.find(
        item => item.id === form.get("productId")
      );

      if (!product) {
        showToast("Please select a valid product.");
        return;
      }

      data.plans.push({
        id: "plan-" + Date.now(),
        name: form.get("name").trim(),
        productId: product.id,
        productName: product.name,
        price: Number(form.get("price")),
        frequency: form.get("frequency")
      });

      saveData(data);
      closeModal();
      plansPage();
      showToast("Plan created successfully.");
    });
}

function deletePlan(id) {
  if (!confirm("Delete this plan?")) return;

  const data = getData();

  data.plans = data.plans.filter(plan => plan.id !== id);

  saveData(data);
  plansPage();
  showToast("Plan deleted.");
}

// ========================================
// CUSTOMERS
// ========================================

function customersPage() {
  if (currentRole !== "Admin") {
    showToast("Access denied.");
    return;
  }

  const data = getData();

  document.getElementById("page-content").innerHTML = `
    <div class="content-card">

      <div class="section-header">
        <h3>Customer Management</h3>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Email Address</th>
              <th>Registration Date</th>
            </tr>
          </thead>

          <tbody>
            ${
              data.customers.map(customer => `
                <tr>
                  <td>${escapeHTML(customer.name)}</td>
                  <td>${escapeHTML(customer.email)}</td>
                  <td>${formatDate(customer.createdAt)}</td>
                </tr>
              `).join("") || `
                <tr><td colspan="3">No customers registered.</td></tr>
              `
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ========================================
// SUBSCRIPTIONS
// ========================================

function subscriptionsPage() {
  const data = getData();

  const subscriptions = currentRole === "Admin"
    ? data.subscriptions
    : data.subscriptions.filter(item =>
        item.customerId === currentUser.id
      );

  document.getElementById("page-content").innerHTML = `
    <div class="content-card">

      <div class="section-header">
        <h3>${currentRole === "Admin" ? "All Subscriptions" : "My Subscriptions"}</h3>

        ${
          currentRole === "Admin"
            ? `<button class="btn btn-primary"
                onclick="openSubscriptionForm()">
                + Create Subscription
              </button>`
            : ""
        }
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Frequency</th>
              <th>Status</th>
              ${currentRole === "Admin" ? "<th>Actions</th>" : ""}
            </tr>
          </thead>

          <tbody>
            ${
              subscriptions.map(subscription => `
                <tr>
                  <td>${escapeHTML(subscription.customerName)}</td>
                  <td>${escapeHTML(subscription.planName)}</td>
                  <td>${formatCurrency(subscription.amount)}</td>
                  <td>${escapeHTML(subscription.frequency)}</td>
                  <td>
                    <span class="status ${statusClass(subscription.status)}">
                      ${escapeHTML(subscription.status)}
                    </span>
                  </td>

                  ${
                    currentRole === "Admin"
                      ? `<td>
                          <button class="btn btn-danger"
                            onclick="closeSubscription('${subscription.id}')">
                            Close
                          </button>
                        </td>`
                      : ""
                  }
                </tr>
              `).join("") || `
                <tr>
                  <td colspan="${currentRole === "Admin" ? 6 : 5}">
                    No subscriptions available.
                  </td>
                </tr>
              `
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openSubscriptionForm() {
  const data = getData();

  if (!data.plans.length || !data.customers.length) {
    showToast("You need at least one customer and one plan.");
    return;
  }

  openModal("Create Subscription", `
    <form id="subscription-form" class="form-grid">

      <div class="form-group full-width">
        <label>Customer</label>
        <select name="customerId" required>
          <option value="">Select Customer</option>
          ${data.customers.map(customer => `
            <option value="${customer.id}">
              ${escapeHTML(customer.name)} (${escapeHTML(customer.email)})
            </option>
          `).join("")}
        </select>
      </div>

      <div class="form-group full-width">
        <label>Subscription Plan</label>
        <select name="planId" required>
          <option value="">Select Plan</option>
          ${data.plans.map(plan => `
            <option value="${plan.id}">
              ${escapeHTML(plan.name)} - ${formatCurrency(plan.price)}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="form-group full-width">
        <button type="submit" class="btn btn-primary">
          Create Subscription
        </button>
      </div>

    </form>
  `);

  document.getElementById("subscription-form")
    .addEventListener("submit", event => {
      event.preventDefault();

      const form = new FormData(event.target);
      const customer = data.customers.find(
        item => item.id === form.get("customerId")
      );

      const plan = data.plans.find(
        item => item.id === form.get("planId")
      );

      if (!customer || !plan) {
        showToast("Select a valid customer and plan.");
        return;
      }

      const id = "subscription-" + Date.now();

      data.subscriptions.push({
        id,
        customerId: customer.id,
        customerName: customer.name,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        frequency: plan.frequency,
        status: "Active",
        createdAt: new Date().toISOString()
      });

      data.invoices.push({
        id: "invoice-" + Date.now(),
        subscriptionId: id,
        customerId: customer.id,
        customerName: customer.name,
        amount: plan.price,
        status: "Draft",
        createdAt: new Date().toISOString()
      });

      saveData(data);
      closeModal();
      subscriptionsPage();
      showToast("Subscription and draft invoice created.");
    });
}

function closeSubscription(id) {
  if (!confirm("Close this subscription?")) return;

  const data = getData();

  const subscription = data.subscriptions.find(
    item => item.id === id
  );

  if (!subscription) return;

  subscription.status = "Closed";

  saveData(data);
  subscriptionsPage();
  showToast("Subscription closed.");
}

// ========================================
// INVOICES
// ========================================

function invoicesPage() {
  const data = getData();

  const invoices = currentRole === "Admin"
    ? data.invoices
    : data.invoices.filter(invoice =>
        invoice.customerId === currentUser.id
      );

  document.getElementById("page-content").innerHTML = `
    <div class="content-card">

      <div class="section-header">
        <h3>${currentRole === "Admin" ? "All Invoices" : "My Invoices"}</h3>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              ${currentRole === "Admin" ? "<th>Actions</th>" : ""}
            </tr>
          </thead>

          <tbody>
            ${
              invoices.map(invoice => `
                <tr>
                  <td>${escapeHTML(invoice.id)}</td>
                  <td>${escapeHTML(invoice.customerName)}</td>
                  <td>${formatCurrency(invoice.amount)}</td>
                  <td>${formatDate(invoice.createdAt)}</td>
                  <td>
                    <span class="status ${statusClass(invoice.status)}">
                      ${escapeHTML(invoice.status)}
                    </span>
                  </td>

                  ${
                    currentRole === "Admin"
                      ? `<td>
                          ${
                            invoice.status !== "Paid"
                              ? `<button class="btn btn-success"
                                  onclick="markInvoicePaid('${invoice.id}')">
                                  Mark Paid
                                </button>`
                              : "Completed"
                          }
                        </td>`
                      : ""
                  }
                </tr>
              `).join("") || `
                <tr>
                  <td colspan="${currentRole === "Admin" ? 6 : 5}">
                    No invoices available.
                  </td>
                </tr>
              `
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function markInvoicePaid(id) {
  const data = getData();

  const invoice = data.invoices.find(
    item => item.id === id
  );

  if (!invoice || invoice.status === "Paid") return;

  invoice.status = "Paid";

  data.payments.push({
    id: "payment-" + Date.now(),
    invoiceId: invoice.id,
    customerId: invoice.customerId,
    amount: invoice.amount,
    date: new Date().toISOString(),
    status: "Paid"
  });

  saveData(data);
  invoicesPage();
  showToast("Invoice marked as paid.");
}

// ========================================
// PAYMENTS
// ========================================

function paymentsPage() {
  if (currentRole !== "Admin") {
    showToast("Access denied.");
    return;
  }

  const data = getData();

  document.getElementById("page-content").innerHTML = `
    <div class="content-card">

      <div class="section-header">
        <h3>Payment Records</h3>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Invoice ID</th>
              <th>Amount</th>
              <th>Payment Date</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            ${
              data.payments.map(payment => `
                <tr>
                  <td>${escapeHTML(payment.id)}</td>
                  <td>${escapeHTML(payment.invoiceId)}</td>
                  <td>${formatCurrency(payment.amount)}</td>
                  <td>${formatDate(payment.date)}</td>
                  <td>
                    <span class="status status-paid">
                      ${escapeHTML(payment.status)}
                    </span>
                  </td>
                </tr>
              `).join("") || `
                <tr><td colspan="5">No payments recorded.</td></tr>
              `
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ========================================
// MODAL FUNCTIONS
// ========================================

function openModal(title, content) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = content;
  document.getElementById("modal").hidden = false;
}

function closeModal() {
  document.getElementById("modal").hidden = true;
  document.getElementById("modal-body").innerHTML = "";
}

// ========================================
// LOGOUT
// ========================================

function logout() {
  currentUser = null;
  currentRole = null;
  currentPage = "dashboard";

  document.getElementById("main-app").hidden = true;
  document.getElementById("auth-page").hidden = false;

  document.getElementById("login-form").reset();
  document.getElementById("register-form").reset();

  showAuthPanel("login");

  selectLoginRole(
    "Admin",
    document.getElementById("admin-option")
  );

  document.getElementById("login-error").textContent = "";
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(amount) || 0);
}

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN");
}

function statusClass(status) {
  const classes = {
    Active: "status-active",
    Paid: "status-paid",
    Draft: "status-draft",
    Pending: "status-pending",
    Confirmed: "status-confirmed",
    Closed: "status-closed",
    Cancelled: "status-cancelled"
  };

  return classes[status] || "status-pending";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showToast(message) {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timeout);

  showToast.timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ========================================
// START APPLICATION
// ========================================

document.addEventListener("DOMContentLoaded", initializeApp);
