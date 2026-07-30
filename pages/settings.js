/* ============================================================
   SETTINGS.JS
   Loads and saves the single row in business_settings (id = 1).
   ============================================================ */

const businessNameField = document.getElementById("business-name-field");
const addressField = document.getElementById("address-field");
const phoneField = document.getElementById("phone-field");
const gstinField = document.getElementById("gstin-field");
const saveBtn = document.getElementById("save-settings-btn");

async function loadSettings() {
  try {
    const { data, error } = await supabaseClient
      .from("business_settings")
      .select("business_name, address, phone, gstin")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      businessNameField.value = data.business_name || "";
      addressField.value = data.address || "";
      phoneField.value = data.phone || "";
      gstinField.value = data.gstin || "";
    }
  } catch (err) {
    console.error(err);
    showToast(friendlyErrorMessage(err), "error");
  }
}

saveBtn.addEventListener("click", async () => {
  setButtonLoading(saveBtn, true);

  try {
    const { error } = await supabaseClient
      .from("business_settings")
      .update({
        business_name: businessNameField.value.trim() || "Your Business Name",
        address: addressField.value.trim(),
        phone: phoneField.value.trim(),
        gstin: gstinField.value.trim(),
      })
      .eq("id", 1);

    if (error) throw error;

    showToast("Settings saved", "success");
  } catch (err) {
    console.error(err);
    showToast(friendlyErrorMessage(err), "error");
  } finally {
    setButtonLoading(saveBtn, false);
  }
});

document.addEventListener("DOMContentLoaded", loadSettings);
