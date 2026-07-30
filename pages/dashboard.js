/* ============================================================
   DASHBOARD.JS
   Loads today's and this-month's bill counts/totals directly
   from Supabase using efficient database-side filtering
   (not by downloading every bill and summing in JS).
   ============================================================ */

async function loadDashboardStats() {
  const today = todayISTDateString();
  const monthStart = firstDayOfMonthISTDateString();

  try {
    // Today's bills
    const { data: todayBills, error: todayError, count: todayCount } =
      await supabaseClient
        .from("bills")
        .select("grand_total", { count: "exact" })
        .eq("bill_date", today);

    if (todayError) throw todayError;

    const todaySales = (todayBills || []).reduce(
      (sum, b) => sum + Number(b.grand_total),
      0
    );

    document.getElementById("stat-today-bills").textContent = todayCount ?? 0;
    document.getElementById("stat-today-sales").textContent = formatCurrency(todaySales);

    // This month's bills (month start -> today)
    const { data: monthBills, error: monthError, count: monthCount } =
      await supabaseClient
        .from("bills")
        .select("grand_total", { count: "exact" })
        .gte("bill_date", monthStart)
        .lte("bill_date", today);

    if (monthError) throw monthError;

    const monthSales = (monthBills || []).reduce(
      (sum, b) => sum + Number(b.grand_total),
      0
    );

    document.getElementById("stat-month-bills").textContent = monthCount ?? 0;
    document.getElementById("stat-month-sales").textContent = formatCurrency(monthSales);
  } catch (error) {
    console.error(error);
    showToast(friendlyErrorMessage(error), "error");

    // Show a clear failure state rather than leaving "—" forever
    ["stat-today-bills", "stat-today-sales", "stat-month-bills", "stat-month-sales"].forEach(
      (id) => (document.getElementById(id).textContent = "N/A")
    );
  }
}

document.addEventListener("DOMContentLoaded", loadDashboardStats);
