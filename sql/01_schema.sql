-- ============================================================
-- BILLING SOFTWARE DATABASE
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP TABLE IF EXISTS public.bill_items CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP SEQUENCE IF EXISTS public.bill_no_seq CASCADE;
DROP FUNCTION IF EXISTS public.generate_bill_no() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.create_bill(text, text, text, jsonb) CASCADE;

-- ------------------------------------------------------------
-- CUSTOMERS
-- ------------------------------------------------------------
CREATE TABLE public.customers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_name TEXT NOT NULL CHECK (char_length(trim(customer_name)) > 0),
    mobile_no TEXT NOT NULL CHECK (mobile_no ~ '^[0-9]{10}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX customers_mobile_no_key ON public.customers (mobile_no);
CREATE INDEX customers_name_idx ON public.customers USING GIN (customer_name gin_trgm_ops);

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------
CREATE TABLE public.products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_name TEXT NOT NULL CHECK (char_length(trim(product_name)) > 0),
    product_code TEXT UNIQUE,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX products_name_idx ON public.products USING GIN (product_name gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- BILLS
-- ------------------------------------------------------------
CREATE SEQUENCE public.bill_no_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE public.bills (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_no TEXT NOT NULL UNIQUE,
    bill_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE,
    bill_time TIME NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')::TIME,
    customer_id BIGINT NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    gst NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (gst >= 0),
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash','UPI','Card','Bank Transfer','Other')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.generate_bill_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.bill_no IS NULL OR NEW.bill_no = '' THEN
        NEW.bill_no := 'BILL-' || LPAD(NEXTVAL('public.bill_no_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_bill_no
BEFORE INSERT ON public.bills
FOR EACH ROW EXECUTE FUNCTION public.generate_bill_no();

CREATE INDEX bills_bill_date_idx ON public.bills (bill_date);
CREATE INDEX bills_customer_id_idx ON public.bills (customer_id);
CREATE INDEX bills_bill_no_idx ON public.bills (bill_no);

-- ------------------------------------------------------------
-- BILL ITEMS
-- ------------------------------------------------------------
CREATE TABLE public.bill_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id BIGINT NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    gst NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (gst >= 0),
    total NUMERIC(12,2) NOT NULL CHECK (total >= 0)
);

CREATE INDEX bill_items_bill_id_idx ON public.bill_items (bill_id);
CREATE INDEX bill_items_product_id_idx ON public.bill_items (product_id);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "development customers access" ON public.customers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "development products access" ON public.products FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "development bills access" ON public.bills FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "development bill items access" ON public.bill_items FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- DATABASE CREATED — now run 02_create_bill_function.sql
-- ============================================================
