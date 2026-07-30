/* ============================================================
   CREATE-BILL.JS
   ============================================================ */

let rowCounter = 0;
const productRowsBody = document.getElementById("product-rows");

/* ------------------------------------------------------------
   Row template
   ------------------------------------------------------------ */
function addProductRow() {
  rowCounter += 1;
  const rowId = `row-${rowCounter}`;

  const tr = document.createElement("tr");
  tr.id = rowId;
  tr.innerHTML = `
    <td>
      <div class="autocomplete-wrap">
        <input type="text" class="product-name-input" placeholder="Type to search products..." autocomplete="off" />
        <input type="hidden" class="product-id-input" value="" />
        <div class="autocomplete-list"></div>
      </div>
    </td>
    <td><input type="number" class="qty-input" min="0.01" step="0.01" value="1" /></td>
    <td><input type="number" class="price-input" min="0" step="0.01" value="0" /></td>
    <td><input type="number" class="discount-input" min="0" step="0.01" value="0" /></td>
    <td><input type="number" class="gst-input" min="0" step="0.01" value="0" /></td>
    <td class="money line-total">₹0.00</td>
    <td><button class="btn btn-danger btn-sm remove-row-btn" type="button">Remove</button></td>
  `;

  productRowsBody.appendChild(tr);
  toggleEmptyMessage();

  // Wire up events for this row
  const qtyInput = tr.querySelector(".qty-input");
  const priceInput = tr.querySelector(".price-input");
  const discountInput = tr.querySelector(".discount-input");
  const gstInput = tr.querySelector(".gst-input");
  const nameInput = tr.querySelector(".product-name-input");
  const productIdInput = tr.querySelector(".product-id-input");
  const suggestionBox = tr.querySelector(".autocomplete-list");
  const removeBtn = tr.querySelector(".remove-row-btn");

  [qtyInput, priceInput, discountInput, gstInput].forEach((el) =>
    el.addEventListener("input", recalculateAll)
  );

  removeBtn.addEventListener("click", () => {
    tr.remove();
    toggleEmptyMessage();
    recalculateAll();
  });

  // Product autocomplete: search Supabase products table as the user types
  let debounceTimer;
  nameInput.addEventListener("input", () => {
    productIdInput.value = ""; // typing manually clears any previously selected product
    clearTimeout(debounceTimer);
    const query = nameInput.value.trim();

    if (query.length < 2) {
      suggestionBox.style.display = "none";
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const { data, error } = await supabaseClient
          .from("products")
          .select("id, product_name, price")
          .ilike("product_name", `%${query}%`)
          .limit(6);

        if (error) throw error;

        if (!data || data.length === 0) {
          suggestionBox.style.display = "none";
          return;
        }

        suggestionBox.innerHTML = data
          .map(
            (p) =>
              `<div data-id="${p.id}" data-name="${p.product_name}" data-price="${p.price}">
                 ${p.product_name} — ${formatCurrency(p.price)}
               </div>`
          )
          .join("");
        suggestionBox.style.display = "block";

        suggestionBox.querySelectorAll("div").forEach((item) => {
          item.addEventListener("click", () => {
            nameInput.value = item.dataset.name;
            priceInput.value = item.dataset.price;
            productIdInput.value = item.dataset.id;
            suggestionBox.style.display = "none";
            recalculateAll();
          });
        });
      } catch (err) {
        console.error(err);
        // Autocomplete failing shouldn't block manual entry — fail silently here,
        // the user can still type the product name and price by hand.
      }
    }, 300);
  });

  document.addEventListener("click", (e) => {
    if (!tr.contains(e.target)) suggestionBox.style.display = "none";
  });

  recalculateAll();
}

function toggleEmptyMessage() {
  const msg = document.getElementById("no-products-msg");
  msg.style.display = productRowsBody.children.length === 0 ? "block" : "none";
}

/* ------------------------------------------------------------
   Line + bill total calculation
   Formula (matches the spec's worked example):
     lineBase     = quantity * price
     lineDiscount = discount (entered as a rupee amount)
     lineGst      = (lineBase - lineDiscount) * gst% / 100
     lineTotal    = lineBase - lineDiscount + lineGst
   ------------------------------------------------------------ */
function recalculateAll() {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalGst = 0;

  productRowsBody.querySelectorAll("tr").forEach((tr) => {
    const qty = parseFloat(tr.querySelector(".qty-input").value) || 0;
    const price = parseFloat(tr.querySelector(".price-input").value) || 0;
    const discount = parseFloat(tr.querySelector(".discount-input").value) || 0;
    const gstPercent = parseFloat(tr.querySelector(".gst-input").value) || 0;

    const lineBase = qty * price;
    const safeDiscount = Math.min(discount, lineBase); // discount can't exceed the line's value
    const lineGst = (lineBase - safeDiscount) * (gstPercent / 100);
    const lineTotal = lineBase - safeDiscount + lineGst;

    tr.querySelector(".line-total").textContent = formatCurrency(lineTotal);

    subtotal += lineBase;
    totalDiscount += safeDiscount;
    totalGst += lineGst;
  });

  const grandTotal = subtotal - totalDiscount + totalGst;

  document.getElementById("total-subtotal").textContent = formatCurrency(subtotal);
  document.getElementById("total-discount").textContent = formatCurrency(totalDiscount);
  document.getElementById("total-gst").textContent = formatCurrency(totalGst);
  document.getElementById("total-grand").textContent = formatCurrency(grandTotal);
}

/* ------------------------------------------------------------
   Customer: check existing mobile number on blur
   ------------------------------------------------------------ */
const mobileInput = document.getElementById("mobile-input");
const nameInputTop = document.getElementById("name-input");
const customerStatus = document.getElementById("customer-status");

mobileInput.addEventListener("input", () => {
  mobileInput.value = mobileInput.value.replace(/\D/g, "").slice(0, 10);
});

mobileInput.addEventListener("blur", async () => {
  const mobile = mobileInput.value.trim();
  customerStatus.textContent = "";
  if (mobile.length !== 10) return;

  try {
    const { data, error } = await supabaseClient
      .from("customers")
      .select("id, customer_name")
      .eq("mobile_no", mobile)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      nameInputTop.value = data.customer_name;
      customerStatus.textContent = "✓ Existing customer found";
      customerStatus.style.color = "var(--color-success)";
    } else {
      customerStatus.textContent = "New customer — will be created on save";
      customerStatus.style.color = "var(--color-text-muted)";
    }
  } catch (err) {
    console.error(err);
    // Non-fatal — user can still proceed and save will resolve/create the customer
  }
});

/* ------------------------------------------------------------
   Validation
   ------------------------------------------------------------ */
function validateBill() {
  let valid = true;

  const mobileField = document.getElementById("mobile-field");
  const nameField = document.getElementById("name-field");
  mobileField.classList.remove("has-error");
  nameField.classList.remove("has-error");

  if (!/^[0-9]{10}$/.test(mobileInput.value.trim())) {
    mobileField.classList.add("has-error");
    valid = false;
  }

  if (nameInputTop.value.trim().length === 0) {
    nameField.classList.add("has-error");
    valid = false;
  }

  const rows = productRowsBody.querySelectorAll("tr");
  if (rows.length === 0) {
    showToast("Add at least one product before saving.", "error");
    valid = false;
  }

  rows.forEach((tr) => {
    const qty = parseFloat(tr.querySelector(".qty-input").value);
    const price = parseFloat(tr.querySelector(".price-input").value);
    const name = tr.querySelector(".product-name-input").value.trim();

    if (!name) {
      showToast("Every product row needs a product name.", "error");
      valid = false;
    }
    if (!(qty > 0)) {
      showToast("Quantity must be greater than 0 for every product.", "error");
      valid = false;
    }
    if (!(price >= 0)) {
      showToast("Price cannot be negative.", "error");
      valid = false;
    }
  });

  if (!valid && (mobileField.classList.contains("has-error") || nameField.classList.contains("has-error"))) {
    showToast("Please fill in customer name and a valid 10-digit mobile number.", "error");
  }

  return valid;
}

/* ------------------------------------------------------------
   Save Bill (atomic, via the create_bill RPC function)
   ------------------------------------------------------------ */
const saveBillBtn = document.getElementById("save-bill-btn");
let isSaving = false; // extra guard against double-clicks/duplicate submissions

saveBillBtn.addEventListener("click", async () => {
  if (isSaving) return;
  if (!validateBill()) return;

  isSaving = true;
  setButtonLoading(saveBillBtn, true, "Saving...");

  const items = Array.from(productRowsBody.querySelectorAll("tr")).map((tr) => ({
    product_id: tr.querySelector(".product-id-input").value || null,
    product_name: tr.querySelector(".product-name-input").value.trim(),
    quantity: parseFloat(tr.querySelector(".qty-input").value),
    price: parseFloat(tr.querySelector(".price-input").value),
    discount: parseFloat(tr.querySelector(".discount-input").value) || 0,
    gst_percent: parseFloat(tr.querySelector(".gst-input").value) || 0,
  }));

  try {
    const { data, error } = await supabaseClient.rpc("create_bill", {
      p_customer_name: nameInputTop.value.trim(),
      p_mobile_no: mobileInput.value.trim(),
      p_payment_method: document.getElementById("payment-method").value,
      p_items: items,
    });

    if (error) throw error;

    const savedBill = data[0]; // function returns a single row (bill_id, bill_no, bill_date, bill_time)

    showToast(`Bill ${savedBill.bill_no} saved successfully`, "success");

    document.getElementById("saved-bill-line").textContent =
      `${savedBill.bill_no} · ${formatDateDDMMYYYY(savedBill.bill_date)} · ${formatTime12h(savedBill.bill_time)}`;
    document.getElementById("print-bill-link").href = `view-bill.html?id=${savedBill.bill_id}`;
    document.getElementById("save-success-panel").style.display = "block";

    saveBillBtn.style.display = "none"; // prevent saving the same bill twice
  } catch (err) {
    console.error(err);
    showToast(friendlyErrorMessage(err), "error");
    isSaving = false;
    setButtonLoading(saveBillBtn, false);
  }
});

document.getElementById("new-bill-btn").addEventListener("click", () => {
  window.location.reload();
});

document.getElementById("add-row-btn").addEventListener("click", addProductRow);

// Start with one empty product row for convenience
document.addEventListener("DOMContentLoaded", () => {
  toggleEmptyMessage();
  addProductRow();
});
