
/* =====================================
   LAST CALL - SUBSCRIPTION MANAGER
===================================== */

// LOAD SAVED SUBSCRIPTIONS

let subscriptions = JSON.parse(
    localStorage.getItem("lastCallSubscriptions") || "[]"
);


// SAVE SUBSCRIPTIONS

function saveSubscriptions() {
    localStorage.setItem(
        "lastCallSubscriptions",
        JSON.stringify(subscriptions)
    );
}


// FORMAT CURRENCY

function formatCurrency(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}


// FORMAT DATE

function formatDate(date) {
    return new Date(date + "T00:00:00").toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );
}


// PREVENT HTML INJECTION

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}


// MONTHLY COST CALCULATION

function monthlyCost(subscription) {
    return subscription.billingCycle === "yearly"
        ? Number(subscription.price) / 12
        : Number(subscription.price);
}


// TODAY'S DATE

const today = new Date();

document.getElementById("todayDate").textContent =
    today.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });


// NAVIGATION

const navLinks = document.querySelectorAll(".nav-link");
const pages = document.querySelectorAll(".page");

function showPage(pageName) {

    pages.forEach(page => {
        page.classList.remove("active");
    });

    navLinks.forEach(link => {
        link.classList.remove("active");
    });

    const selectedPage = document.getElementById(pageName);

    if (selectedPage) {
        selectedPage.classList.add("active");
    }

    const selectedLink = document.querySelector(
        `.nav-link[data-page="${pageName}"]`
    );

    if (selectedLink) {
        selectedLink.classList.add("active");
    }

    const pageNames = {
        overview: "OVERVIEW",
        subscriptions: "MY SUBSCRIPTIONS",
        calendar: "RENEWAL CALENDAR",
        cancellation: "CANCELLATION CENTER",
        insights: "INSIGHTS",
        settings: "SETTINGS"
    };

    document.querySelector(".breadcrumb").textContent =
        "WORKSPACE / " + (pageNames[pageName] || "OVERVIEW");
}


navLinks.forEach(link => {

    link.addEventListener("click", function(event) {

        event.preventDefault();

        const pageName = this.dataset.page;

        showPage(pageName);

    });

});


// VIEW ALL BUTTON

document.querySelectorAll("[data-goto]").forEach(button => {

    button.addEventListener("click", function() {

        showPage(this.dataset.goto);

    });

});


// SUBSCRIPTION MODAL

const modal = document.getElementById("subscriptionModal");

const addButton = document.getElementById("addSubscriptionBtn");
const addButton2 = document.getElementById("addSubscriptionBtn2");
const closeButton = document.getElementById("closeModal");

function openModal() {
    modal.classList.add("show");
}

function closeModal() {
    modal.classList.remove("show");
}

addButton.addEventListener("click", openModal);
addButton2.addEventListener("click", openModal);
closeButton.addEventListener("click", closeModal);

modal.addEventListener("click", function(event) {

    if (event.target === modal) {
        closeModal();
    }

});


// ADD SUBSCRIPTION

const subscriptionForm = document.getElementById("subscriptionForm");

subscriptionForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const name = document.getElementById("serviceName").value.trim();
    const price = Number(document.getElementById("servicePrice").value);
    const billingCycle = document.getElementById("billingCycle").value;
    const renewalDate = document.getElementById("renewalDate").value;
    const category = document.getElementById("serviceCategory").value;

    if (!name || price <= 0 || !renewalDate) {
        alert("Please enter valid subscription details.");
        return;
    }

    const newSubscription = {

        id: Date.now(),

        name: name,

        price: price,

        billingCycle: billingCycle,

        renewalDate: renewalDate,

        category: category,

        unused: false

    };

    subscriptions.push(newSubscription);

    saveSubscriptions();

    subscriptionForm.reset();

    closeModal();

    renderAll();

    alert("Subscription added successfully!");

});


// DELETE SUBSCRIPTION

function deleteSubscription(id) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this subscription?"
    );

    if (!confirmDelete) return;

    subscriptions = subscriptions.filter(
        subscription => subscription.id !== id
    );

    saveSubscriptions();

    renderAll();

}


// FLAG UNUSED SUBSCRIPTION

function toggleUnused(id) {

    subscriptions = subscriptions.map(subscription => {

        if (subscription.id === id) {

            subscription.unused = !subscription.unused;

        }

        return subscription;

    });

    saveSubscriptions();

    renderAll();

}


// SUBSCRIPTION DISPLAY

function subscriptionHTML(subscription) {

    const name = escapeHTML(subscription.name);
    const category = escapeHTML(subscription.category);
    const price = formatCurrency(subscription.price);

    const cycle = subscription.billingCycle === "yearly"
        ? "Yearly"
        : "Monthly";

    const unusedLabel = subscription.unused
        ? "Flagged as unused"
        : "Active";

    return `
        <div class="subscription-item">

            <div class="service-info">

                <div class="service-icon">
                    ${name.charAt(0).toUpperCase()}
                </div>

                <div>
                    <h4>${name}</h4>
                    <p>${category} · ${cycle} · ${unusedLabel}</p>
                </div>

            </div>

            <div class="item-actions">

                <span class="service-price">${price}</span>

                <button
                    class="small-action"
                    data-action="unused"
                    data-id="${subscription.id}"
                >
                    ${subscription.unused ? "Unflag" : "Unused"}
                </button>

                <button
                    class="small-action"
                    data-action="delete"
                    data-id="${subscription.id}"
                >
                    Delete
                </button>

            </div>

        </div>
    `;
}


// UPCOMING RENEWALS

function upcomingSubscriptions() {

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const nextWeek = new Date(currentDate);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return subscriptions
        .filter(subscription => {

            const renewal = new Date(
                subscription.renewalDate + "T00:00:00"
            );

            return renewal >= currentDate && renewal <= nextWeek;

        })
        .sort((a, b) =>
            a.renewalDate.localeCompare(b.renewalDate)
        );

}


// UPCOMING ITEM DISPLAY

function upcomingHTML(subscription) {

    return `
        <div class="upcoming-item">

            <div class="service-info">

                <div class="service-icon">
                    ${escapeHTML(subscription.name.charAt(0).toUpperCase())}
                </div>

                <div>
                    <h4>${escapeHTML(subscription.name)}</h4>
                    <p>${formatDate(subscription.renewalDate)}</p>
                </div>

            </div>

            <span class="service-price">
                ${formatCurrency(subscription.price)}
            </span>

        </div>
    `;

}


// EMPTY STATE

function emptyState(message, description = "") {

    return `
        <div class="empty-state">

            <span>◇</span>

            <p>${message}</p>

            <small>${description}</small>

        </div>
    `;

}


// UPDATE DASHBOARD STATISTICS

function updateStats() {

    const total = subscriptions.length;

    const monthly = subscriptions.reduce(
        (sum, subscription) =>
            sum + monthlyCost(subscription),
        0
    );

    const upcoming = upcomingSubscriptions().length;

    const savings = subscriptions
        .filter(subscription => subscription.unused)
        .reduce(
            (sum, subscription) =>
                sum + monthlyCost(subscription),
            0
        );

    document.getElementById("totalSubscriptions").textContent = total;

    document.getElementById("monthlySpending").textContent =
        formatCurrency(monthly);

    document.getElementById("upcomingRenewals").textContent = upcoming;

    document.getElementById("potentialSavings").textContent =
        formatCurrency(savings);

}


// RECENT SUBSCRIPTIONS

function renderRecent() {

    const container = document.getElementById("recentSubscriptions");

    const recent = subscriptions.slice(-4).reverse();

    container.innerHTML = recent.length
        ? recent.map(subscriptionHTML).join("")
        : emptyState(
            "No subscriptions added yet.",
            "Add your first subscription to get started."
        );

}


// ALL SUBSCRIPTIONS

function renderSubscriptions() {

    const container = document.getElementById("allSubscriptions");

    container.innerHTML = subscriptions.length
        ? [...subscriptions].reverse().map(subscriptionHTML).join("")
        : emptyState(
            "Your subscription list is empty.",
            "Click Add subscription to get started."
        );

}


// RENEWAL CALENDAR

function renderCalendar() {

    const container = document.getElementById("calendarList");

    const sorted = [...subscriptions].sort(
        (a, b) => a.renewalDate.localeCompare(b.renewalDate)
    );

    container.innerHTML = sorted.length
        ? sorted.map(subscription => `
            <div class="upcoming-item">

                <div class="service-info">

                    <div class="service-icon">
                        ${escapeHTML(subscription.name.charAt(0).toUpperCase())}
                    </div>

                    <div>
                        <h4>${escapeHTML(subscription.name)}</h4>
                        <p>${escapeHTML(subscription.category)}</p>
                    </div>

                </div>

                <div>
                    <span class="service-price">
                        ${formatCurrency(subscription.price)}
                    </span>

                    <p class="item-date">
                        ${formatDate(subscription.renewalDate)}
                    </p>
                </div>

            </div>
        `).join("")
        : emptyState("No renewals to display.");

}


// UPCOMING LIST

function renderUpcoming() {

    const container = document.getElementById("upcomingList");

    const upcoming = upcomingSubscriptions();

    container.innerHTML = upcoming.length
        ? upcoming.map(upcomingHTML).join("")
        : emptyState(
            "No upcoming renewals.",
            "Your next 7 days are clear."
        );

}


// CANCELLATION CENTER

function renderCancellation() {

    const container = document.getElementById("cancellationList");

    const flagged = subscriptions.filter(
        subscription => subscription.unused
    );

    if (!subscriptions.length) {

        container.innerHTML = emptyState(
            "No subscriptions to review yet."
        );

        return;

    }

    if (!flagged.length) {

        container.innerHTML = `
            ${emptyState(
                "No unused subscriptions flagged.",
                "Mark a subscription as unused to review its cancellation."
            )}
            <p class="small-note">
                Cancellation is guided. You will complete the cancellation
                directly with the service provider.
            </p>
        `;

        return;

    }

    container.innerHTML = flagged.map(subscription => `

        <div class="subscription-item">

            <div class="service-info">

                <div class="service-icon">!</div>

                <div>
                    <h4>${escapeHTML(subscription.name)}</h4>
                    <p>Potential saving: ${formatCurrency(monthlyCost(subscription))}/month</p>
                </div>

            </div>

            <button
                class="small-action"
                data-action="cancel-guide"
                data-id="${subscription.id}"
            >
                Cancellation guide
            </button>

        </div>

    `).join("");

}


// GUIDED CANCELLATION

function cancellationGuide(id) {

    const subscription = subscriptions.find(
        item => item.id === id
    );

    if (!subscription) return;

    const providerLinks = {
        "netflix": "https://www.netflix.com/cancelplan",
        "spotify": "https://www.spotify.com/account/",
        "amazon prime": "https://www.amazon.in/amazonprime",
        "youtube premium": "https://www.youtube.com/paid_memberships"
    };

    const key = subscription.name.toLowerCase();

    const providerLink = providerLinks[key];

    let message = `
CANCELLATION GUIDE

Service: ${subscription.name}

1. Open the service's official website or app.
2. Sign in to your account.
3. Open Account or Membership settings.
4. Find Manage Subscription or Cancel Membership.
5. Follow the provider's cancellation instructions.
6. Check for a cancellation confirmation.

IMPORTANT:
Last Call does not cancel the subscription for you.
Complete the cancellation with the provider.
`;

    if (providerLink) {

        const openProvider = confirm(
            message + "\n\nOpen the provider's official page?"
        );

        if (openProvider) {
            window.open(providerLink, "_blank", "noopener,noreferrer");
        }

    } else {

        alert(message);

    }

}


// INSIGHTS

function renderInsights() {

    const container = document.getElementById("insightsContent");

    if (!subscriptions.length) {

        container.innerHTML = emptyState(
            "Add subscriptions to see your insights."
        );

        return;

    }

    const categoryTotals = {};

    subscriptions.forEach(subscription => {

        const category = subscription.category;

        categoryTotals[category] =
            (categoryTotals[category] || 0) +
            monthlyCost(subscription);

    });

    const total = Object.values(categoryTotals).reduce(
        (sum, amount) => sum + amount,
        0
    );

    const categoryHTML = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => {

            const percentage = total
                ? (amount / total) * 100
                : 0;

            return `
                <div class="upcoming-item">

                    <div>
                        <h4>${escapeHTML(category)}</h4>
                        <p class="item-date">
                            ${percentage.toFixed(1)}% of monthly spending
                        </p>
                    </div>

                    <span class="service-price">
                        ${formatCurrency(amount)}
                    </span>

                </div>
            `;

        }).join("");

    container.innerHTML = `
        <div style="margin-top:20px">
            <p class="subtitle">Estimated monthly spending</p>

            <h2 style="color:#e0c28c;margin:10px 0 20px">
                ${formatCurrency(total)}
            </h2>

            ${categoryHTML}

        </div>
    `;

}


// HANDLE SUBSCRIPTION ACTIONS

document.addEventListener("click", function(event) {

    const button = event.target.closest("[data-action]");

    if (!button) return;

    const id = Number(button.dataset.id);

    const action = button.dataset.action;

    if (action === "delete") {
        deleteSubscription(id);
    }

    if (action === "unused") {
        toggleUnused(id);
    }

    if (action === "cancel-guide") {
        cancellationGuide(id);
    }

});


// RENDER EVERYTHING

function renderAll() {

    updateStats();

    renderRecent();

    renderSubscriptions();

    renderCalendar();

    renderUpcoming();

    renderCancellation();

    renderInsights();

}


// INITIALIZE APPLICATION

renderAll();
