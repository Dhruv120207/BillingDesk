/* ============================================================
   CUSTOMERS.JS
   Note: customers are normally created automatically from
   Create Bill. This page is for viewing, correcting typos,
   and removing customers who were never actually billed.
   ============================================================ */

const customersTbody = document.getElementById("customers-tbody");
const noCustomersMsg = document.getElementById("no-customers-msg");
const loadingMsg = document.getElementById("loading-msg");
const searchInput = document.getElementById("customer-search");

const modal = document.getElementById("customer-modal");
const customerIdField = document.getElementById("customer-id-field");
const nameField = document.getElementById("customer-name-field");
const mobileField = document.getElementById("customer-mobile-field");

async function loadCustomers() {
  loadingMsg.style.display = "block";
  noCustomersMsg.style.display = "none";
  customersTbody.innerHTML = "";

  const search = searchInput.value.trim();

  try {
    let query = supabaseClient
      .from("customers")
      .select("id, customer_name, mobile_no, created_at")
      .order("customer_name", { ascending: true });

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,mobile_no.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      noCustomersMsg.style.display = "block";
      return;
    }

    customersTbody.innerHTML = data
      .map(
        (c) => `
        <tr>
          <td>${escapeHtml(c.customer_name)}</td>
          <td>${escapeHtml(c.mobile_no)}</td>
          <td>${new Date(c.created_at).toLocaleDateString("en-IN")}</td>
          <td>
            <button class="btn btn-secondary btn-sm edit-btn" data-id="${c.id}">Edit</button>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${c.id}" data-name="${escapeHtml(c.customer_name)}">Delete</button>
          </td>
        </tr>`
      )
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

function wireRowButtons(customers) {
  customersTbody.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const customer = customers.find((c) => String(c.id) === btn.dataset.id);
      openModal(customer);
    });
  });

  customersTbody.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteCustomer(btn.dataset.id, btn.dataset.name));
  });
}

function openModal(customer) {
  document.getElementById("name-field").classList.remove("has-error");
  document.getElementById("mobile-field").classList.remove("has-error");

  customerIdField.value = customer.id;
  nameField.value = customer.customer_name;
  mobileField.value = customer.mobile_no;
  modal.classList.add("open");
}

function closeModal() {
  modal.classList.remove("open");
}

document.getElementById("cancel-modal-btn").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

mobileField.addEventListener("input", () => {
  mobileField.value = mobileField.value.replace(/\D/g, "").slice(0, 10);
});

document.getElementById("save-customer-btn").addEventListener("click", async () => {
  const nameFieldWrap = document.getElementById("name-field");
  const mobileFieldWrap = document.getElementById("mobile-field");
  nameFieldWrap.classList.remove("has-error");
  mobileFieldWrap.classList.remove("has-error");

  const name = nameField.value.trim();
  const mobile = mobileField.value.trim();

  let valid = true;
  if (!name) {
    nameFieldWrap.classList.add("has-error");
    valid = false;
  }
  if (!/^[0-9]{10}$/.test(mobile)) {
    mobileFieldWrap.classList.add("has-error");
    valid = false;
  }
  if (!valid) return;

  const saveBtn = document.getElementById("save-customer-btn");
  setButtonLoading(saveBtn, true);

  try {
    const { error } = await supabaseClient
      .from("customers")
      .update({ customer_name: name, mobile_no: mobile })
      .eq("id", customerIdField.value);

    if (error) throw error;

    showToast("Customer updated", "success");
    closeModal();
    loadCustomers();
  } catch (err) {
    console.error(err);
    showToast(friendlyErrorMessage(err), "error");
  } finally {
    setButtonLoading(saveBtn, false);
  }
});

async function deleteCustomer(id, name) {
  if (!confirm(`Delete "${name}"? This only works if they have no bills on record.`)) {
    return;
  }

  try {
    const { error } = await supabaseClient.from("customers").delete().eq("id", id);
    if (error) throw error;
    showToast("Customer deleted", "success");
    loadCustomers();
  } catch (err) {
    console.error(err);
    showToast(friendlyErrorMessage(err), "error");
  }
}

let searchDebounce;
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(loadCustomers, 300);
});

document.addEventListener("DOMContentLoaded", loadCustomers);
