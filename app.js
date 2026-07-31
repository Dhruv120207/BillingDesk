/* ============================================================
   APP.JS
   Shared utilities loaded on every page: sidebar navigation,
   toast notifications, currency/date formatting, and small
   helpers used across pages.
   ============================================================ */

/* ------------------------------------------------------------
   Sidebar navigation
   Each page includes: <div id="sidebar-root"></div>
   and sets: <body data-page="dashboard">  (or create-bill, etc.)
   ------------------------------------------------------------ */
function renderSidebar() {
  const root = document.getElementById("sidebar-root");
  if (!root) return;

  const currentPage = document.body.dataset.page || "";

  const links = [
    { key: "dashboard", label: "Dashboard", href: "/pages/dashboard.html" },
    { key: "create-bill", label: "Create Bill", href: "/pages/create-bill.html" },
    { key: "bill-history", label: "Bill History", href: "/pages/bill-history.html" },
    { key: "customers", label: "Customers", href: "/pages/customers.html" },
    { key: "reports", label: "Reports", href: "/pages/bill-history.html" },
    { key: "settings", label: "Settings", href: "/pages/settings.html" },
  ];

  const linksHtml = links
    .map(
      (l) => `
      <a class="nav-link ${l.key === currentPage ? "active" : ""}" href="${l.href}">
        ${l.label}
      </a>`
    )
    .join("");

  root.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-brand">Isha<span>Designer</span></div>
      ${linksHtml}
    </aside>
  `;
}

document.addEventListener("DOMContentLoaded", renderSidebar);

/* ------------------------------------------------------------
   Toast notifications
   Usage: showToast("Bill saved successfully", "success")
   type: "success" | "error" | "info"
   ------------------------------------------------------------ */
function ensureToastContainer() {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, type = "info", durationMs = 4000) {
  const container = ensureToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.2s ease";
    setTimeout(() => toast.remove(), 200);
  }, durationMs);
}

/* ------------------------------------------------------------
   Formatting helpers
   ------------------------------------------------------------ */

// ₹1,234.50 style Indian currency formatting
function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return "₹" + value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// DB gives "2026-07-31" -> display as "31/07/2026"
function formatDateDDMMYYYY(isoDate) {
  if (!isoDate) return "-";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

// DB gives "13:35:00" -> display as "01:35 PM"
function formatTime12h(timeString) {
  if (!timeString) return "-";
  const [hStr, mStr] = timeString.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${period}`;
}

// Today's date in Asia/Kolkata as "YYYY-MM-DD", for default filter values
function todayISTDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

// First day of current month in Asia/Kolkata, as "YYYY-MM-DD"
function firstDayOfMonthISTDateString() {
  const today = todayISTDateString();
  const [y, m] = today.split("-");
  return `${y}-${m}-01`;
}

/* ------------------------------------------------------------
   Simple loading-state helper for buttons (prevents double-clicks
   / duplicate submissions — used by Save Bill, etc.)
   ------------------------------------------------------------ */
function setButtonLoading(button, isLoading, loadingText = "Saving...") {
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

/* ------------------------------------------------------------
   Generic Supabase error -> friendly message
   ------------------------------------------------------------ */
function friendlyErrorMessage(error) {
  if (!error) return "Something went wrong. Please try again.";

  if (!navigator.onLine) {
    return "You're offline. Check your internet connection and try again.";
  }

  if (error.code === "23505") {
    return "A record with this value already exists.";
  }

  if (error.code === "23503") {
    return "This record is linked to existing bills and can't be deleted.";
  }

  if (error.message && error.message.includes("Failed to fetch")) {
    return "Could not reach the server. Check your internet connection.";
  }

  return error.message || "Something went wrong. Please try again.";
}
