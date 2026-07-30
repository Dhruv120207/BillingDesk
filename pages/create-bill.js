/* ============================================================
   CREATE-BILL.JS
   Billing Software
   ============================================================ */


/* ============================================================
   GLOBAL VARIABLES
   ============================================================ */

let rowCounter = 0;

let isSaving = false;

const productRowsBody =
  document.getElementById("product-rows");

const addRowBtn =
  document.getElementById("add-row-btn");

const saveBillBtn =
  document.getElementById("save-bill-btn");

const mobileInput =
  document.getElementById("mobile-input");

const nameInputTop =
  document.getElementById("name-input");

const customerStatus =
  document.getElementById("customer-status");


/* ============================================================
   MONEY FORMAT
   ============================================================ */

function formatMoney(value) {

  const number =
    Number(value || 0);

  return (
    "₹" +
    number.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  );
}


/* ============================================================
   FORMAT DATE
   ============================================================ */

function formatDateDDMMYYYY(dateString) {

  if (!dateString) {
    return "";
  }

  const parts =
    dateString.split("-");

  if (parts.length !== 3) {
    return dateString;
  }

  return (
    parts[2] +
    "/" +
    parts[1] +
    "/" +
    parts[0]
  );
}


/* ============================================================
   FORMAT TIME
   ============================================================ */

function formatTime12h(timeString) {

  if (!timeString) {
    return "";
  }

  const parts =
    timeString.split(":");

  if (parts.length < 2) {
    return timeString;
  }

  let hour =
    parseInt(parts[0], 10);

  const minute =
    parts[1];

  const second =
    parts[2]
      ? parts[2].split(".")[0]
      : "00";

  const period =
    hour >= 12
      ? "PM"
      : "AM";

  hour =
    hour % 12 || 12;

  return (
    String(hour).padStart(2, "0") +
    ":" +
    minute +
    ":" +
    second +
    " " +
    period
  );
}


/* ============================================================
   PRODUCT ROW
   ============================================================ */

function addProductRow() {

  rowCounter += 1;

  const rowId =
    `row-${rowCounter}`;


  const tr =
    document.createElement("tr");

  tr.id = rowId;


  tr.innerHTML = `

    <!-- PRODUCT -->
    <td>

      <div class="autocomplete-wrap">

        <input
          type="text"
          class="product-name-input"
          placeholder="Enter product name"
          autocomplete="off"
        />

        <input
          type="hidden"
          class="product-id-input"
          value=""
        />

        <div class="autocomplete-list"></div>

      </div>

    </td>


    <!-- QUANTITY -->
    <td>

      <input
        type="number"
        class="qty-input"
        min="0.01"
        step="0.01"
        value="1"
        placeholder="Qty"
      />

    </td>


    <!-- RATE -->
    <td>

      <input
        type="number"
        class="price-input"
        min="0"
        step="0.01"
        value="0"
        placeholder="Rate"
      />

    </td>


    <!-- DISCOUNT -->
    <td>

      <input
        type="number"
        class="discount-input"
        min="0"
        step="0.01"
        value="0"
        placeholder="Discount"
      />

    </td>


    <!-- GST -->
    <td>

      <input
        type="number"
        class="gst-input"
        min="0"
        step="0.01"
        value="0"
        placeholder="GST %"
      />

    </td>


    <!-- TOTAL -->
    <td class="money line-total">
      ₹0.00
    </td>


    <!-- REMOVE -->
    <td>

      <button
        type="button"
        class="btn btn-danger btn-sm remove-row-btn"
      >
        Remove
      </button>

    </td>

  `;


  productRowsBody.appendChild(tr);


  /* ==========================================================
     ELEMENTS
  ========================================================== */

  const qtyInput =
    tr.querySelector(".qty-input");

  const priceInput =
    tr.querySelector(".price-input");

  const discountInput =
    tr.querySelector(".discount-input");

  const gstInput =
    tr.querySelector(".gst-input");

  const nameInput =
    tr.querySelector(".product-name-input");

  const productIdInput =
    tr.querySelector(".product-id-input");

  const suggestionBox =
    tr.querySelector(".autocomplete-list");

  const removeBtn =
    tr.querySelector(".remove-row-btn");


  /* ==========================================================
     AUTOMATIC CALCULATION
  ========================================================== */

  [
    qtyInput,
    priceInput,
    discountInput,
    gstInput
  ].forEach(input => {

    input.addEventListener(
      "input",
      recalculateAll
    );

    input.addEventListener(
      "change",
      recalculateAll
    );

  });


  /* ==========================================================
     REMOVE PRODUCT
  ========================================================== */

  removeBtn.addEventListener(
    "click",
    () => {

      tr.remove();

      toggleEmptyMessage();

      recalculateAll();

    }
  );


  /* ==========================================================
     PRODUCT SEARCH
  ========================================================== */

  let debounceTimer;


  nameInput.addEventListener(
    "input",
    () => {

      /*
       * If user starts typing manually,
       * remove previously selected product ID.
       */

      productIdInput.value = "";


      clearTimeout(debounceTimer);


      const query =
        nameInput.value.trim();


      /*
       * Allow manual product entry.
       * Search starts after 2 characters.
       */

      if (query.length < 2) {

        suggestionBox.style.display =
          "none";

        return;
      }


      debounceTimer =
        setTimeout(
          async () => {

            try {

              const {
                data,
                error
              } = await supabaseClient

                .from("products")

                .select(
                  "id, product_name, price"
                )

                .ilike(
                  "product_name",
                  `%${query}%`
                )

                .limit(6);


              if (error) {
                throw error;
              }


              if (
                !data ||
                data.length === 0
              ) {

                suggestionBox.style.display =
                  "none";

                return;
              }


              suggestionBox.innerHTML =
                data
                  .map(product => {

                    return `

                      <div
                        data-id="${product.id}"
                        data-name="${escapeHtml(product.product_name)}"
                        data-price="${product.price}"
                      >

                        ${escapeHtml(product.product_name)}
                        —
                        ${formatMoney(product.price)}

                      </div>

                    `;

                  })
                  .join("");


              suggestionBox.style.display =
                "block";


              /* ==================================================
                 SELECT PRODUCT FROM SEARCH
              ================================================== */

              suggestionBox
                .querySelectorAll("div")
                .forEach(item => {

                  item.addEventListener(
                    "click",
                    () => {

                      nameInput.value =
                        item.dataset.name;

                      priceInput.value =
                        item.dataset.price;

                      productIdInput.value =
                        item.dataset.id;

                      suggestionBox.style.display =
                        "none";

                      recalculateAll();

                    }
                  );

                });


            } catch (error) {

              console.error(
                "Product search error:",
                error
              );

              /*
               * Manual entry still works
               * if Supabase search fails.
               */

              suggestionBox.style.display =
                "none";

            }

          },
          300
        );

    }
  );


  /* ==========================================================
     CLOSE AUTOCOMPLETE
  ========================================================== */

  document.addEventListener(
    "click",
    event => {

      if (!tr.contains(event.target)) {

        suggestionBox.style.display =
          "none";

      }

    }
  );


  /* ==========================================================
     UPDATE
  ========================================================== */

  toggleEmptyMessage();

  recalculateAll();


  /*
   * Return row so we can focus the product name.
   */

  return tr;
}


/* ============================================================
   HTML ESCAPE
   ============================================================ */

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* ============================================================
   EMPTY PRODUCT MESSAGE
   ============================================================ */

function toggleEmptyMessage() {

  const msg =
    document.getElementById(
      "no-products-msg"
    );


  if (!msg) {
    return;
  }


  const count =
    productRowsBody.children.length;


  if (count === 0) {

    msg.style.display =
      "block";

  } else {

    msg.style.display =
      "none";

  }
}


/* ============================================================
   CALCULATE ALL TOTALS
   ============================================================

   Formula:

   lineBase =
      quantity × price

   lineDiscount =
      discount

   taxableAmount =
      lineBase - discount

   GST =
      taxableAmount × GST% / 100

   lineTotal =
      taxableAmount + GST
   ============================================================ */

function recalculateAll() {

  let subtotal = 0;

  let totalDiscount = 0;

  let totalGst = 0;


  const rows =
    productRowsBody.querySelectorAll(
      "tr"
    );


  rows.forEach(tr => {

    const qty =
      parseFloat(
        tr.querySelector(
          ".qty-input"
        ).value
      ) || 0;


    const price =
      parseFloat(
        tr.querySelector(
          ".price-input"
        ).value
      ) || 0;


    const discount =
      parseFloat(
        tr.querySelector(
          ".discount-input"
        ).value
      ) || 0;


    const gstPercent =
      parseFloat(
        tr.querySelector(
          ".gst-input"
        ).value
      ) || 0;


    /*
     * Base amount
     */

    const lineBase =
      qty * price;


    /*
     * Discount cannot be
     * greater than line value.
     */

    const safeDiscount =
      Math.min(
        Math.max(discount, 0),
        lineBase
      );


    /*
     * Amount after discount
     */

    const taxableAmount =
      lineBase -
      safeDiscount;


    /*
     * GST
     */

    const lineGst =
      taxableAmount *
      (gstPercent / 100);


    /*
     * Final product total
     */

    const lineTotal =
      taxableAmount +
      lineGst;


    /*
     * Show product total
     */

    const lineTotalElement =
      tr.querySelector(
        ".line-total"
      );


    lineTotalElement.textContent =
      formatMoney(lineTotal);


    /*
     * Add to bill totals
     */

    subtotal += lineBase;

    totalDiscount += safeDiscount;

    totalGst += lineGst;

  });


  /*
   * Grand total
   */

  const grandTotal =
    subtotal -
    totalDiscount +
    totalGst;


  /*
   * Display totals
   */

  document.getElementById(
    "total-subtotal"
  ).textContent =
    formatMoney(subtotal);


  document.getElementById(
    "total-discount"
  ).textContent =
    formatMoney(totalDiscount);


  document.getElementById(
    "total-gst"
  ).textContent =
    formatMoney(totalGst);


  document.getElementById(
    "total-grand"
  ).textContent =
    formatMoney(grandTotal);

}


/* ============================================================
   CUSTOMER MOBILE INPUT
   ============================================================ */

mobileInput.addEventListener(
  "input",
  () => {

    mobileInput.value =
      mobileInput.value
        .replace(/\D/g, "")
        .slice(0, 10);

  }
);


/* ============================================================
   CUSTOMER LOOKUP
   ============================================================ */

mobileInput.addEventListener(
  "blur",
  async () => {

    const mobile =
      mobileInput.value.trim();


    customerStatus.textContent =
      "";


    if (mobile.length !== 10) {
      return;
    }


    try {

      const {
        data,
        error
      } = await supabaseClient

        .from("customers")

        .select(
          "id, customer_name"
        )

        .eq(
          "mobile_no",
          mobile
        )

        .maybeSingle();


      if (error) {
        throw error;
      }


      if (data) {

        /*
         * Existing customer
         */

        nameInputTop.value =
          data.customer_name;


        customerStatus.textContent =
          "✓ Existing customer found";


        customerStatus.style.color =
          "var(--color-success)";


      } else {

        /*
         * New customer
         */

        customerStatus.textContent =
          "New customer — will be created on save";


        customerStatus.style.color =
          "var(--color-text-muted)";

      }


    } catch (error) {

      console.error(
        "Customer lookup error:",
        error
      );

    }

  }
);


/* ============================================================
   VALIDATION
   ============================================================ */

function validateBill() {

  let valid = true;


  const mobileField =
    document.getElementById(
      "mobile-field"
    );


  const nameField =
    document.getElementById(
      "name-field"
    );


  mobileField.classList.remove(
    "has-error"
  );


  nameField.classList.remove(
    "has-error"
  );


  /*
   * Mobile
   */

  if (
    !/^[0-9]{10}$/.test(
      mobileInput.value.trim()
    )
  ) {

    mobileField.classList.add(
      "has-error"
    );

    valid = false;

  }


  /*
   * Customer name
   */

  if (
    nameInputTop.value.trim().length === 0
  ) {

    nameField.classList.add(
      "has-error"
    );

    valid = false;

  }


  /*
   * Product rows
   */

  const rows =
    productRowsBody.querySelectorAll(
      "tr"
    );


  if (rows.length === 0) {

    showToast(
      "Add at least one product before saving.",
      "error"
    );

    valid = false;

  }


  /*
   * Validate every product
   */

  rows.forEach(tr => {

    const qty =
      parseFloat(
        tr.querySelector(
          ".qty-input"
        ).value
      );


    const price =
      parseFloat(
        tr.querySelector(
          ".price-input"
        ).value
      );


    const name =
      tr.querySelector(
        ".product-name-input"
      ).value.trim();


    if (!name) {

      showToast(
        "Every product row needs a product name.",
        "error"
      );

      valid = false;

    }


    if (!(qty > 0)) {

      showToast(
        "Quantity must be greater than 0 for every product.",
        "error"
      );

      valid = false;

    }


    if (!(price >= 0)) {

      showToast(
        "Price cannot be negative.",
        "error"
      );

      valid = false;

    }

  });


  /*
   * Customer error message
   */

  if (
    !valid &&
    (
      mobileField.classList.contains(
        "has-error"
      ) ||
      nameField.classList.contains(
        "has-error"
      )
    )
  ) {

    showToast(
      "Please fill in customer name and a valid 10-digit mobile number.",
      "error"
    );

  }


  return valid;
}


/* ============================================================
   SAVE BILL
   ============================================================ */

saveBillBtn.addEventListener(
  "click",
  async () => {

    /*
     * Prevent double click
     */

    if (isSaving) {
      return;
    }


    /*
     * Validate
     */

    if (!validateBill()) {
      return;
    }


    isSaving = true;


    setButtonLoading(
      saveBillBtn,
      true,
      "Saving..."
    );


    /*
     * Collect product items
     */

    const items =
      Array.from(
        productRowsBody.querySelectorAll(
          "tr"
        )
      ).map(tr => {

        return {

          product_id:
            tr.querySelector(
              ".product-id-input"
            ).value || null,

          product_name:
            tr.querySelector(
              ".product-name-input"
            ).value.trim(),

          quantity:
            parseFloat(
              tr.querySelector(
                ".qty-input"
              ).value
            ),

          price:
            parseFloat(
              tr.querySelector(
                ".price-input"
              ).value
            ),

          discount:
            parseFloat(
              tr.querySelector(
                ".discount-input"
              ).value
            ) || 0,

          gst_percent:
            parseFloat(
              tr.querySelector(
                ".gst-input"
              ).value
            ) || 0

        };

      });


    try {

      /*
       * Call Supabase RPC
       */

      const {
        data,
        error
      } =
        await supabaseClient.rpc(
          "create_bill",
          {

            p_customer_name:
              nameInputTop.value.trim(),

            p_mobile_no:
              mobileInput.value.trim(),

            p_payment_method:
              document.getElementById(
                "payment-method"
              ).value,

            p_items:
              items

          }
        );


      if (error) {
        throw error;
      }


      /*
       * Check response
       */

      if (
        !data ||
        !data[0]
      ) {

        throw new Error(
          "Bill was saved but no bill information was returned."
        );

      }


      const savedBill =
        data[0];


      /*
       * Success message
       */

      showToast(
        `Bill ${savedBill.bill_no} saved successfully`,
        "success"
      );


      /*
       * Show bill information
       */

      document.getElementById(
        "saved-bill-line"
      ).textContent =

        `${savedBill.bill_no} · ` +
        `${formatDateDDMMYYYY(savedBill.bill_date)} · ` +
        `${formatTime12h(savedBill.bill_time)}`;


      /*
       * Print link
       */

      document.getElementById(
        "print-bill-link"
      ).href =
        `view-bill.html?id=${savedBill.bill_id}`;


      /*
       * Show success panel
       */

      document.getElementById(
        "save-success-panel"
      ).style.display =
        "block";


      /*
       * Hide save button
       */

      saveBillBtn.style.display =
        "none";


    } catch (error) {

      console.error(
        "Save bill error:",
        error
      );


      showToast(
        friendlyErrorMessage(error),
        "error"
      );


      /*
       * Allow another attempt
       */

      isSaving = false;


      setButtonLoading(
        saveBillBtn,
        false
      );

    }

  }
);


/* ============================================================
   CREATE ANOTHER BILL
   ============================================================ */

document
  .getElementById("new-bill-btn")
  .addEventListener(
    "click",
    () => {

      window.location.reload();

    }
  );


/* ============================================================
   ADD PRODUCT BUTTON
   ============================================================ */

addRowBtn.addEventListener(
  "click",
  () => {

    const newRow =
      addProductRow();


    /*
     * Automatically focus
     * product name
     */

    const nameInput =
      newRow.querySelector(
        ".product-name-input"
      );


    if (nameInput) {

      nameInput.focus();

    }

  }
);


/* ============================================================
   INITIALIZE PAGE
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    /*
     * Make sure table is empty
     */

    productRowsBody.innerHTML = "";


    /*
     * Create first product row
     */

    const firstRow =
      addProductRow();


    /*
     * Focus product name
     */

    const firstNameInput =
      firstRow.querySelector(
        ".product-name-input"
      );


    if (firstNameInput) {

      firstNameInput.focus();

    }


    /*
     * Initial totals
     */

    recalculateAll();

  }
);