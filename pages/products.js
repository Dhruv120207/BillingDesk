/* ============================================================
   PRODUCTS.JS
   ============================================================ */

const LOW_STOCK_THRESHOLD = 5;

const productsTbody = document.getElementById("products-tbody");
const noProductsMsg = document.getElementById("no-products-msg");
const loadingMsg = document.getElementById("loading-msg");
const searchInput = document.getElementById("product-search");

const modal = document.getElementById("product-modal");
const modalTitle = document.getElementById("modal-title");
const productIdField = document.getElementById("product-id-field");
const nameField = document.getElementById("product-name-field");
const codeField = document.getElementById("product-code-field");
const priceField = document.getElementById("product-price-field");
const stockField = document.getElementById("product-stock-field");

/* ------------------------------------------------------------
   Load + render
   ------------------------------------------------------------ */
async function loadProducts() {
  loadingMsg.style.display = "block";
  noProductsMsg.style.display = "none";
  productsTbody.innerHTML = "";

  const search = searchInput.value.trim();

  try {
    let query = supabaseClient
      .from("products")
      .select("id, product_name, product_code, price, stock_quantity")
      .order("product_name", { ascending: true });

    if (search) {
      query = query.or(`product_name.ilike.%${search}%,product_code.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      noProductsMsg.style.display = "block";
      return;
    }

    productsTbody.innerHTML = data
      .map((p) => {
        const lowStock = p.stock_quantity <= LOW_STOCK_THRESHOLD;
        return `
        <tr>
          <td>${escapeHtml(p.product_name)}</td>
          <td>${escapeHtml(p.product_code || "—")}</td>
          <td class="money">${formatCurrency(p.price)}</td>
          <td class="money ${lowStock ? "low-stock" : ""}">${p.stock_quantity}${lowStock ? " ⚠" : ""}</td>
          <td>
            <button class="btn btn-secondary btn-sm edit-btn" data-id="${p.id}">Edit</button>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${p.id}" data-name="${escapeHtml(p.product_name)}">Delete</button>
          </td>
        </tr>`;
      })
      .join("");

    wireRowButtons(data);
  } catch (err) {
    console.error(err);
    showToast(friendlyErrorMessage(err), "error");
  } finally {
    loadingMsg.style.display = "none";
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function wireRowButtons(products) {
  productsTbody.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const product = products.find((p) => String(p.id) === btn.dataset.id);
      openModal(product);
    });
  });

  productsTbody.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteProduct(btn.dataset.id, btn.dataset.name));
  });
}

/* ------------------------------------------------------------
   Modal open/close
   ------------------------------------------------------------ */
function openModal(product) {
  document.getElementById("name-field").classList.remove("has-error");
  document.getElementById("price-field").classList.remove("has-error");

  if (product) {
    modalTitle.textContent = "Edit Product";
    productIdField.value = product.id;
    nameField.value = product.product_name;
    codeField.value = product.product_code || "";
    priceField.value = product.price;
    stockField.value = product.stock_quantity;
  } else {
    modalTitle.textContent = "Add Product";
    productIdField.value = "";
    nameField.value = "";
    codeField.value = "";
    priceField.value = "";
    stockField.value = "0";
  }
  modal.classList.add("open");
}

function closeModal() {
  modal.classList.remove("open");
}

document.getElementById("add-product-btn").addEventListener("click", () => openModal(null));
document.getElementById("cancel-modal-btn").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

/* ------------------------------------------------------------
   Save (insert or update)
   ------------------------------------------------------------ */
document.getElementById("save-product-btn").addEventListener("click", async () => {
  const nameFieldWrap = document.getElementById("name-field");
  const priceFieldWrap = document.getElementById("price-field");
  nameFieldWrap.classList.remove("has-error");
  priceFieldWrap.classList.remove("has-error");

  const name = nameField.value.trim();
  const code = codeField.value.trim() || null;
  const price = parseFloat(priceField.value);
  const stock = parseInt(stockField.value, 10) || 0;

  let valid = true;
  if (!name) {
    nameFieldWrap.classList.add("has-error");
    valid = false;
  }
  if (isNaN(price) || price < 0) {
    priceFieldWrap.classList.add("has-error");
    valid = false;
  }
  if (!valid) return;

  const payload = {
    product_name: name,
    product_code: code,
    price: price,
    stock_quantity: stock,
  };

  const saveBtn = document.getElementById("save-product-btn");
  setButtonLoading(saveBtn, true);

  try {
    let error;
    if (productIdField.value) {
      ({ error } = await supabaseClient
        .from("products")
        .update(payload)
        .eq("id", productIdField.value));
    } else {
      ({ error } = await supabaseClient.from("products").insert(payload));
    }

    if (error) throw error;

    showToast("Product saved successfully", "success");
    closeModal();
    loadProducts();
  } catch (err) {
    console.error(err);
    showToast(friendlyErrorMessage(err), "error");
  } finally {
    setButtonLoading(saveBtn, false);
  }
});

/* ------------------------------------------------------------
   Delete
   ------------------------------------------------------------ */
async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone. (Past bills that used this product are unaffected — they keep their own saved copy of the name and price.)`)) {
    return;
  }

  try {
    const { error } = await supabaseClient.from("products").delete().eq("id", id);
    if (error) throw error;
    showToast("Product deleted", "success");
    loadProducts();
  } catch (err) {
    console.error(err);
    showToast(friendlyErrorMessage(err), "error");
  }
}

/* ------------------------------------------------------------
   Search + init
   ------------------------------------------------------------ */
let searchDebounce;
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(loadProducts, 300);
});

document.addEventListener("DOMContentLoaded", loadProducts);
