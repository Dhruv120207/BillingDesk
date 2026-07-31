# Billing Software — Setup Guide

Everything you need is in this folder. Follow these steps in order.

## 1. Create a Supabase project
- Go to https://supabase.com → New Project
- Pick a name, a database password, and a region close to you (e.g. Singapore for India)
- Wait for it to finish provisioning (~2 minutes)

## 2. Set up the database
In your Supabase project:
- Open **SQL Editor → New Query**
- Paste the entire contents of `sql/01_schema.sql` → click **Run**
- Open a new query, paste the entire contents of `sql/02_create_bill_function.sql` → click **Run**
- Open a new query, paste the entire contents of `sql/03_business_settings.sql` → click **Run**
- Go to **Table Editor** and confirm you see 5 tables: `customers`, `products`, `bills`, `bill_items`, `business_settings`

## 3. Get your API keys
- Go to **Project Settings (gear icon) → API**
- Copy the **Project URL** and the **anon public** key
  (never copy the "service_role" key into this project — see the security note in `config.js`)

## 4. Connect the app to your database
- Open `config.js` in VS Code
- Replace `YOUR_SUPABASE_PROJECT_URL_HERE` and `YOUR_SUPABASE_ANON_KEY_HERE` with the values from step 3
- Save the file

## 5. Run the app
Do **not** just double-click `index.html` — opening files directly (`file://...`) can break Supabase requests.

Instead, in VS Code:
- Install the **"Live Server"** extension (Extensions icon → search "Live Server" → Install)
- Right-click `index.html` → **"Open with Live Server"**
- It opens at something like `http://127.0.0.1:5500`

## 6. Test it
- You should land on the **Dashboard** (stats show 0 — correct, no bills yet)
- Click **Create Bill**, fill in a customer, add a product, click **SAVE BILL**
- You should see a real bill number like `BILL-000001`
- Go to **Bill History** to see it in the list, search/filter it, and click **View** or **Print**

## Folder structure
```
billing-software/
│
├── index.html          → entry point, redirects to dashboard
├── style.css            → shared design system
├── app.js                → shared sidebar, toasts, formatting helpers
├── config.js              → YOUR Supabase URL + anon key go here
│
├── sql/
│   ├── 01_schema.sql              → run first
│   └── 02_create_bill_function.sql → run second
│
└── pages/
    ├── dashboard.html / dashboard.js
    ├── create-bill.html / create-bill.js
    ├── bill-history.html / bill-history.js
    └── view-bill.html / view-bill.js
```

## If something breaks
Open the browser console: press **F12** → **Console** tab, reproduce the issue, and copy the exact red error text. That tells us precisely what failed instead of guessing.

## What's built so far
- ✅ Auto bill numbers (BILL-000001, atomic, collision-proof)
- ✅ Auto date/time (server-side, India timezone)
- ✅ Customer lookup/creation by mobile number
- ✅ Multi-product bill entry with live totals
- ✅ Atomic, safe bill saving (all-or-nothing)
- ✅ Bill History with search + date range filter + sales report
- ✅ Printable invoice and printable sales report
- ✅ Products page (add/edit/delete, low-stock warning)
- ✅ Customers page (view/edit/delete)
- ✅ Settings page — business name, address, phone, GSTIN, shown on every printed invoice
- ✅ Cloud storage via Supabase — same data on every device

## Not built yet (future features from your original spec)
Products/Customers management pages, login system, inventory/stock deduction, PDF export, WhatsApp sharing, multi-business support — the database is already designed so these can be added later without rebuilding anything.
