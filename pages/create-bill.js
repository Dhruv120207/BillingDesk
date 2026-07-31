/* ============================================================
   CREATE BILL
   ============================================================ */

let rowCounter = 0;
let isSaving = false;


/* ============================================================
   GET ELEMENTS
   ============================================================ */
console.log("create-bill.js loaded");
console.log("Initialization");

const productRowsBody = document.getElementById("product-rows");
const addRowBtn = document.getElementById("add-row-btn");

console.log("productRowsBody:", productRowsBody);
console.log("addRowBtn:", addRowBtn);

const mobileInput = document.getElementById("mobile-input");
const nameInputTop = document.getElementById("name-input");
const customerStatus = document.getElementById("customer-status");

const saveBillBtn = document.getElementById("save-bill-btn");



/* ============================================================
   MONEY
   ============================================================ */

function formatCurrency(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


/* ============================================================
   ADD PRODUCT ROW
   ============================================================ */

function addProductRow() {

  rowCounter++;

  const tr = document.createElement("tr");

  tr.id = `product-row-${rowCounter}`;

  tr.innerHTML = `
    
    <td>
      <div class="autocomplete-wrap">

        <input
          type="text"
          class="product-name-input"
          placeholder="Enter product name"
          autocomplete="off"
        >

        <input
          type="hidden"
          class="product-id-input"
          value=""
        >

        <div class="autocomplete-list"></div>

      </div>
    </td>


    <td>
      <input
        type="number"
        class="qty-input"
        value="1"
        min="0.01"
        step="0.01"
      >
    </td>


    <td>
      <input
        type="number"
        class="price-input"
        value="0"
        min="0"
        step="0.01"
      >
    </td>


    <td>
      <input
        type="number"
        class="discount-input"
        value="0"
        min="0"
        step="0.01"
      >
    </td>


    <td>
      <input
        type="number"
        class="gst-input"
        value="0"
        min="0"
        step="0.01"
      >
    </td>


    <td class="money line-total">
      ₹0.00
    </td>


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
     GET INPUTS
     ========================================================== */

  const qtyInput =
    tr.querySelector(".qty-input");

  const priceInput =
    tr.querySelector(".price-input");

  const discountInput =
    tr.querySelector(".discount-input");

  const gstInput =
    tr.querySelector(".gst-input");

  const productNameInput =
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

  qtyInput.addEventListener(
    "input",
    recalculateAll
  );

  priceInput.addEventListener(
    "input",
    recalculateAll
  );

  discountInput.addEventListener(
    "input",
    recalculateAll
  );

  gstInput.addEventListener(
    "input",
    recalculateAll
  );


  /* ==========================================================
     REMOVE
     ========================================================== */

  removeBtn.addEventListener(
    "click",
    function () {

      tr.remove();

      toggleEmptyMessage();

      recalculateAll();

    }
  );


  /* ==========================================================
     PRODUCT SEARCH
     ========================================================== */

  let timer;

  productNameInput.addEventListener(
    "input",
    function () {

      productIdInput.value = "";

      clearTimeout(timer);

      const query =
        productNameInput.value.trim();


      if (query.length < 2) {

        suggestionBox.style.display =
          "none";

        return;

      }


      timer = setTimeout(
        async function () {

          /*
           * If Supabase is not initialized,
           * manual product entry still works.
           */

          if (
            typeof supabaseClient ===
            "undefined"
          ) {

            suggestionBox.style.display =
              "none";

            return;

          }


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


            suggestionBox.innerHTML = "";


            data.forEach(
              function (product) {

                const item =
                  document.createElement("div");

                item.textContent =
                  `${product.product_name} — ${formatCurrency(product.price)}`;

                item.dataset.id =
                  product.id;

                item.dataset.name =
                  product.product_name;

                item.dataset.price =
                  product.price;


                item.addEventListener(
                  "click",
                  function () {

                    productNameInput.value =
                      product.product_name;

                    productIdInput.value =
                      product.id;

                    priceInput.value =
                      product.price;

                    suggestionBox.style.display =
                      "none";

                    recalculateAll();

                  }
                );


                suggestionBox.appendChild(item);

              }
            );


            suggestionBox.style.display =
              "block";


          } catch (error) {

            console.error(
              "Product search error:",
              error
            );

            suggestionBox.style.display =
              "none";

          }

        },
        300
      );

    }
  );


  /* ==========================================================
     INITIAL CALCULATION
     ========================================================== */

  recalculateAll();


  return tr;
}


/* ============================================================
   EMPTY MESSAGE
   ============================================================ */

function toggleEmptyMessage() {

  const message =
    document.getElementById(
      "no-products-msg"
    );


  if (!message) {
    return;
  }


  if (
    productRowsBody.children.length === 0
  ) {

    message.style.display =
      "block";

  } else {

    message.style.display =
      "none";

  }

}


/* ============================================================
   CALCULATE TOTALS
   ============================================================ */

function recalculateAll() {

  let subtotal = 0;

  let totalDiscount = 0;

  let totalGST = 0;


  const rows =
    productRowsBody.querySelectorAll(
      "tr"
    );


  rows.forEach(
    function (row) {

      const qty =
        parseFloat(
          row.querySelector(
            ".qty-input"
          ).value
        ) || 0;


      const rate =
        parseFloat(
          row.querySelector(
            ".price-input"
          ).value
        ) || 0;


      const discount =
        parseFloat(
          row.querySelector(
            ".discount-input"
          ).value
        ) || 0;


      const gstPercent =
        parseFloat(
          row.querySelector(
            ".gst-input"
          ).value
        ) || 0;


      /* Quantity × Rate */

      const baseAmount =
        qty * rate;


      /* Discount */

      const safeDiscount =
        Math.min(
          Math.max(discount, 0),
          baseAmount
        );


      /* Amount after discount */

      const taxableAmount =
        baseAmount -
        safeDiscount;


      /* GST */

      const gstAmount =
        taxableAmount *
        gstPercent /
        100;


      /* Final product total */

      const lineTotal =
        taxableAmount +
        gstAmount;


      /* Display product total */

      row.querySelector(
        ".line-total"
      ).textContent =
        formatCurrency(lineTotal);


      /* Add to bill totals */

      subtotal += baseAmount;

      totalDiscount += safeDiscount;

      totalGST += gstAmount;

    }
  );


  const grandTotal =
    subtotal -
    totalDiscount +
    totalGST;


  document.getElementById(
    "total-subtotal"
  ).textContent =
    formatCurrency(subtotal);


  document.getElementById(
    "total-discount"
  ).textContent =
    formatCurrency(totalDiscount);


  document.getElementById(
    "total-gst"
  ).textContent =
    formatCurrency(totalGST);


  document.getElementById(
    "total-grand"
  ).textContent =
    formatCurrency(grandTotal);

}


/* ============================================================
   ADD PRODUCT BUTTON
   ============================================================ */

if (addRowBtn) {
    addRowBtn.onclick = function () {

        const row = addProductRow();

        toggleEmptyMessage();

        const input = row.querySelector(".product-name-input");

        if (input) input.focus();

    };
}


/* ============================================================
   CUSTOMER MOBILE
   ============================================================ */

mobileInput.addEventListener(
  "input",
  function () {

    mobileInput.value =
      mobileInput.value
        .replace(/\D/g, "")
        .slice(0, 10);

  }
);


/* ============================================================
   CUSTOMER SEARCH
   ============================================================ */

mobileInput.addEventListener(
  "blur",
  async function () {

    const mobile =
      mobileInput.value.trim();


    customerStatus.textContent = "";


    if (mobile.length !== 10) {
      return;
    }


    if (
      typeof supabaseClient ===
      "undefined"
    ) {
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

        nameInputTop.value =
          data.customer_name;

        customerStatus.textContent =
          "✓ Existing customer found";

      } else {

        customerStatus.textContent =
          "New customer";

      }


    } catch (error) {

      console.error(
        "Customer search error:",
        error
      );

    }

  }
);


/* ============================================================
   START PAGE
   ============================================================ */

/*
 * IMPORTANT:
 * The script is loaded at the bottom of the HTML,
 * so the elements already exist.
 */

if (
  productRowsBody &&
  addRowBtn
) {

  /*
   * Create first product row
   */

  const firstRow =
    addProductRow();


  /*
   * Hide empty message
   */

  toggleEmptyMessage();


  /*
   * Focus product name
   */

  const firstInput =
    firstRow.querySelector(
      ".product-name-input"
    );


  if (firstInput) {
    firstInput.focus();
  }


  /*
   * Initial totals
   */

  recalculateAll();

} else {

  console.error(
    "Billing page elements not found. Check create-bill.html IDs."
  );

}