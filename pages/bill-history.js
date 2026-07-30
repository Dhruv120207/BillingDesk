/* ============================================================
   BILL-HISTORY.JS
   Search + date-range filtering happen inside the database
   query itself (not by downloading every bill and filtering
   in JavaScript), so this stays fast even with thousands of
   bills.
   ============================================================ */

const searchInput = document.getElementById("search-input");
const fromDateInput = document.getElementById("from-date");
const toDateInput = document.getElementById("to-date");
const billsTbody = document.getElementById("bills-tbody");
const noBillsMsg = document.getElementById("no-bills-msg");
const loadingMsg = document.getElementById("loading-msg");

let lastResults = []; // kept in memory only for the Print Report button

function showLoading(isLoading) {
  loadingMsg.style.display = isLoading ? "block" : "none";
}

/* ------------------------------------------------------------
   Main fetch: applies search + date range + sort together
   ------------------------------------------------------------ */
async function fetchBills() {
  showLoading(true);
  noBillsMsg.style.display = "none";
  billsTbody.innerHTML = "";

  const search = searchInput.value.trim();
  const fromDate = fromDateInput.value;
  const toDate = toDateInput.value;

  try {
    let query = supabaseClient
      .from("bills")
      .select(
        "id, bill_no, bill_date, bill_time, subtotal, discount, gst, grand_total, payment_method, customers(customer_name, mobile_no)"
      )
      .order("bill_date", { ascending: false })
      .order("bill_time", { ascending: false });

    if (fromDate) query = query.gte("bill_date", fromDate);
    if (toDate) query = query.lte("bill_date", toDate);

    if (search) {
      // Search matches bill number directly, OR customer name/mobile
      // via a lookup against the customers table first.
      const { data: matchingCustomers, error: custError } = await supabaseClient
        .from("customers")
        .select("id")
        .or(`customer_name.ilike.%${search}%,mobile_no.ilike.%${search}%`);

      if (custError) throw custError;

      const customerIds = (matchingCustomers || []).map((c) => c.id);
      const orParts = [`bill_no.ilike.%${search}%`];
      if (customerIds.length > 0) {
        orParts.push(`customer_id.in.(${customerIds.join(",")})`);
      }
      query = query.or(orParts.join(","));
    }

    const { data, error } = await query;
    if (error) throw error;

    lastResults = data || [];
    renderBillsTable(lastResults);
    renderReportSummary(lastResults);
  } catch (err) {
    console.error(err);
    showToast(friendlyErrorMessage(err), "error");
  } finally {
    showLoading(false);
  }
}

/* ------------------------------------------------------------
   Render table rows
   ------------------------------------------------------------ */
function renderBillsTable(bills) {
  if (bills.length === 0) {
    noBillsMsg.style.display = "block";
    return;
  }

  billsTbody.innerHTML = bills
    .map((bill) => {
      const customerName = bill.customers?.customer_name || "—";
      const mobile = bill.customers?.mobile_no || "—";
      return `
        <tr>
          <td>${bill.bill_no}</td>
          <td>${formatDateDDMMYYYY(bill.bill_date)}</td>
          <td>${formatTime12h(bill.bill_time)}</td>
          <td>${customerName}</td>
          <td>${mobile}</td>
          <td class="money">${formatCurrency(bill.grand_total)}</td>
          <td>${bill.payment_method}</td>
          <td>
            <a class="btn btn-secondary btn-sm" href="view-bill.html?id=${bill.id}">View</a>
            <a class="btn btn-secondary btn-sm" href="view-bill.html?id=${bill.id}&print=1">Print</a>
          </td>
        </tr>
      `;
    })
    .join("");
}

/* ------------------------------------------------------------
   Render the sales report summary for the current filtered set
   ------------------------------------------------------------ */
function renderReportSummary(bills) {
  const totalBills = bills.length;
  const totalSales = bills.reduce((sum, b) => sum + Number(b.grand_total), 0);
  const totalDiscount = bills.reduce((sum, b) => sum + Number(b.discount), 0);
  const totalGst = bills.reduce((sum, b) => sum + Number(b.gst), 0);

  document.getElementById("report-count").textContent = totalBills;
  document.getElementById("report-sales").textContent = formatCurrency(totalSales);
  document.getElementById("report-discount").textContent = formatCurrency(totalDiscount);
  document.getElementById("report-gst").textContent = formatCurrency(totalGst);
}

/* ------------------------------------------------------------
   Print Report — opens a clean printable summary of the
   currently filtered bills in a new tab
   ------------------------------------------------------------ */
function printReport() {
  if (lastResults.length === 0) {
    showToast("No bills to print for the current filter.", "error");
    return;
  }

  const fromDate = fromDateInput.value ? formatDateDDMMYYYY(fromDateInput.value) : "Beginning";
  const toDate = toDateInput.value ? formatDateDDMMYYYY(toDateInput.value) : "Today";

  const rowsHtml = lastResults
    .map(
      (b) => `
      <tr>
        <td>${b.bill_no}</td>
        <td>${formatDateDDMMYYYY(b.bill_date)}</td>
        <td>${b.customers?.customer_name || "—"}</td>
        <td style="text-align:right;">${formatCurrency(b.grand_total)}</td>
      </tr>`
    )
    .join("");

  const totalSales = lastResults.reduce((sum, b) => sum + Number(b.grand_total), 0);

  const reportWindow = window.open("", "_blank");
  reportWindow.document.write(`
    <html>
      <head>
        <title>Sales Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #1B2430; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { padding: 8px 10px; border-bottom: 1px solid #ccc; font-size: 13px; text-align: left; }
          th { text-transform: uppercase; font-size: 11px; color: #555; }
          .totals { margin-top: 20px; font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>SALES REPORT</h1>
        <p>From Date: ${fromDate} &nbsp;&nbsp; To Date: ${toDate}</p>
        <table>
          <thead>
            <tr><th>Bill No.</th><th>Date</th><th>Customer</th><th style="text-align:right;">Total</th></tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="totals">
          <p>Total Bills: ${lastResults.length}</p>
          <p>Total Sales: ${formatCurrency(totalSales)}</p>
        </div>
        <script>window.onload = () => window.print();<\/script>
      </body>
    </html>
  `);
  reportWindow.document.close();
}

/* ------------------------------------------------------------
   Event wiring
   ------------------------------------------------------------ */
document.getElementById("search-btn").addEventListener("click", fetchBills);
document.getElementById("print-report-btn").addEventListener("click", printReport);

document.getElementById("reset-btn").addEventListener("click", () => {
  searchInput.value = "";
  fromDateInput.value = "";
  toDateInput.value = "";
  fetchBills();
});

// Let pressing Enter in the search box trigger search too
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchBills();
});

document.addEventListener("DOMContentLoaded", fetchBills);
