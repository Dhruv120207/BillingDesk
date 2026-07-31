/* ============================================================
   VIEW-BILL.JS
   Reads ?id=<bill_id> from the URL, loads that bill plus its
   customer and line items, and renders a printable invoice.
   If ?print=1 is also present (used by the "Print" link on
   Bill History), it triggers the browser print dialog once
   the data has finished rendering.
   ============================================================ */

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function loadBill() {
  const billId = getQueryParam("id");
  const shouldAutoPrint = getQueryParam("print") === "1";

  const loadingMsg = document.getElementById("loading-msg");
  const notFoundMsg = document.getElementById("not-found-msg");
  const invoiceContent = document.getElementById("invoice-content");

  if (!billId) {
    loadingMsg.style.display = "none";
    notFoundMsg.style.display = "block";
    notFoundMsg.textContent = "No bill specified.";
    return;
  }

  try {
    // Business profile for the invoice header (falls back to defaults if not set yet)
    const { data: settings } = await supabaseClient
      .from("business_settings")
      .select("business_name, address, phone, gstin")
      .eq("id", 1)
      .maybeSingle();

    if (settings) {
      document.getElementById("business-name").textContent = settings.business_name || "Your Business Name";
      const detailParts = [settings.address, settings.phone, settings.gstin ? `GSTIN: ${settings.gstin}` : null].filter(Boolean);
      document.getElementById("business-details").textContent = detailParts.join(" · ") || "—";
    }

    const { data: bill, error: billError } = await supabaseClient
      .from("bills")
      .select(
        "id, bill_no, bill_date, bill_time, subtotal, discount, gst, grand_total, payment_method, customers(customer_name, mobile_no)"
      )
      .eq("id", billId)
      .maybeSingle();

    if (billError) throw billError;

    if (!bill) {
      loadingMsg.style.display = "none";
      notFoundMsg.style.display = "block";
      return;
    }

    const { data: items, error: itemsError } = await supabaseClient
      .from("bill_items")
      .select("product_name, quantity, price, discount, gst, total")
      .eq("bill_id", billId)
      .order("id", { ascending: true });

    if (itemsError) throw itemsError;

    renderInvoice(bill, items || []);

    loadingMsg.style.display = "none";
    invoiceContent.style.display = "block";

    if (shouldAutoPrint) {
      // Give the browser a moment to finish layout before printing
      setTimeout(() => window.print(), 300);
    }
  } catch (err) {
    console.error(err);
    loadingMsg.style.display = "none";
    notFoundMsg.style.display = "block";
    notFoundMsg.textContent = friendlyErrorMessage(err);
  }
}

function renderInvoice(bill, items) {
  document.getElementById("bill-no").textContent = bill.bill_no;
  document.getElementById("bill-date").textContent = `Date: ${formatDateDDMMYYYY(bill.bill_date)}`;
  document.getElementById("bill-time").textContent = `Time: ${formatTime12h(bill.bill_time)}`;

  document.getElementById("customer-name").textContent = bill.customers?.customer_name || "—";
  document.getElementById("customer-mobile").textContent = bill.customers?.mobile_no
    ? `Mobile: ${bill.customers.mobile_no}`
    : "";

  document.getElementById("items-tbody").innerHTML = items
    .map(
      (item) => `
      <tr>
        <td>${item.product_name}</td>
        <td>${item.quantity}</td>
        <td class="money">${formatCurrency(item.price)}</td>
        <td class="money">${formatCurrency(item.discount)}</td>
        <td class="money">${formatCurrency(item.gst)}</td>
        <td class="money">${formatCurrency(item.total)}</td>
      </tr>`
    )
    .join("");

  document.getElementById("inv-subtotal").textContent = formatCurrency(bill.subtotal);
  document.getElementById("inv-discount").textContent = formatCurrency(bill.discount);
  document.getElementById("inv-gst").textContent = formatCurrency(bill.gst);
  document.getElementById("inv-grand").textContent = formatCurrency(bill.grand_total);
  document.getElementById("payment-method").textContent = bill.payment_method;
}

document.getElementById("print-btn").addEventListener("click", () => window.print());
document.addEventListener("DOMContentLoaded", loadBill);
