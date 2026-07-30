// ============================================================
// CREATE BILL - PRODUCT ROWS & AUTOMATIC CALCULATIONS
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

  const productRows = document.getElementById("product-rows");
  const addRowBtn = document.getElementById("add-row-btn");

  const subtotalEl = document.getElementById("total-subtotal");
  const discountEl = document.getElementById("total-discount");
  const gstEl = document.getElementById("total-gst");
  const grandTotalEl = document.getElementById("total-grand");

  const noProductsMsg = document.getElementById("no-products-msg");


  // ----------------------------------------------------------
  // Format money
  // ----------------------------------------------------------

  function money(value) {
    return "₹" + Number(value || 0).toFixed(2);
  }


  // ----------------------------------------------------------
  // Create a new product row
  // ----------------------------------------------------------

  function createProductRow() {

    const row = document.createElement("tr");

    row.className = "product-row";

    row.innerHTML = `
      <td>
        <input
          type="text"
          class="product-name"
          placeholder="Enter product name"
        >
      </td>

      <td>
        <input
          type="number"
          class="product-qty"
          value="1"
          min="0.01"
          step="0.01"
          placeholder="Qty"
        >
      </td>

      <td>
        <input
          type="number"
          class="product-rate"
          value="0"
          min="0"
          step="0.01"
          placeholder="Rate"
        >
      </td>

      <td>
        <input
          type="number"
          class="product-discount"
          value="0"
          min="0"
          step="0.01"
          placeholder="Discount"
        >
      </td>

      <td>
        <input
          type="number"
          class="product-gst"
          value="0"
          min="0"
          step="0.01"
          placeholder="GST %"
        >
      </td>

      <td class="money">
        <span class="product-total">₹0.00</span>
      </td>

      <td>
        <button
          type="button"
          class="remove-product-btn"
          title="Remove product"
        >
          ✕
        </button>
      </td>
    `;

    productRows.appendChild(row);

    attachRowEvents(row);

    updateNoProductsMessage();

    calculateTotals();

    return row;
  }


  // ----------------------------------------------------------
  // Calculate one product row
  // ----------------------------------------------------------

  function calculateRow(row) {

    const qty =
      parseFloat(row.querySelector(".product-qty")?.value) || 0;

    const rate =
      parseFloat(row.querySelector(".product-rate")?.value) || 0;

    const discount =
      parseFloat(row.querySelector(".product-discount")?.value) || 0;

    const gstPercent =
      parseFloat(row.querySelector(".product-gst")?.value) || 0;


    // Basic amount
    const basicAmount = qty * rate;


    // Amount after discount
    const afterDiscount = Math.max(
      basicAmount - discount,
      0
    );


    // GST amount
    const gstAmount =
      afterDiscount * gstPercent / 100;


    // Final total
    const finalTotal =
      afterDiscount + gstAmount;


    // Display total
    const totalEl =
      row.querySelector(".product-total");

    if (totalEl) {
      totalEl.textContent = money(finalTotal);
    }


    // Return values for overall calculation
    return {
      basicAmount,
      discount,
      gstAmount,
      finalTotal
    };
  }


  // ----------------------------------------------------------
  // Calculate complete bill
  // ----------------------------------------------------------

  function calculateTotals() {

    let subtotal = 0;
    let totalDiscount = 0;
    let totalGST = 0;
    let grandTotal = 0;


    const rows =
      productRows.querySelectorAll(".product-row");


    rows.forEach(row => {

      const result = calculateRow(row);

      subtotal += result.basicAmount;
      totalDiscount += result.discount;
      totalGST += result.gstAmount;
      grandTotal += result.finalTotal;

    });


    // Update screen
    subtotalEl.textContent = money(subtotal);

    discountEl.textContent = money(totalDiscount);

    gstEl.textContent = money(totalGST);

    grandTotalEl.textContent = money(grandTotal);
  }


  // ----------------------------------------------------------
  // Attach events to product row
  // ----------------------------------------------------------

  function attachRowEvents(row) {

    const inputs =
      row.querySelectorAll("input");


    // Recalculate whenever user types
    inputs.forEach(input => {

      input.addEventListener("input", () => {

        calculateTotals();

      });

      input.addEventListener("change", () => {

        calculateTotals();

      });

    });


    // Remove button
    const removeBtn =
      row.querySelector(".remove-product-btn");


    removeBtn.addEventListener("click", () => {

      row.remove();

      updateNoProductsMessage();

      calculateTotals();

    });

  }


  // ----------------------------------------------------------
  // Add Product button
  // ----------------------------------------------------------

  addRowBtn.addEventListener("click", () => {

    const newRow = createProductRow();

    // Automatically focus product name
    const productName =
      newRow.querySelector(".product-name");

    if (productName) {
      productName.focus();
    }

  });


  // ----------------------------------------------------------
  // Show/hide "No products" message
  // ----------------------------------------------------------

  function updateNoProductsMessage() {

    const count =
      productRows.querySelectorAll(".product-row").length;


    if (count === 0) {

      noProductsMsg.style.display = "block";

    } else {

      noProductsMsg.style.display = "none";

    }

  }


  // ----------------------------------------------------------
  // Initialize existing first row
  // ----------------------------------------------------------

  const existingRows =
    productRows.querySelectorAll(".product-row");


  existingRows.forEach(row => {

    attachRowEvents(row);

  });


  updateNoProductsMessage();

  calculateTotals();

});