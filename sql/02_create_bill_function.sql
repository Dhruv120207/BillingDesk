-- ============================================================
-- ATOMIC BILL SAVE FUNCTION
-- Run this SECOND, after 01_schema.sql
-- Wraps customer find/create + bill insert + line items insert
-- in a single transaction. If anything fails, everything rolls
-- back — no partial bills, no orphaned line items.
-- ============================================================

create or replace function public.create_bill(
  p_customer_name text,
  p_mobile_no text,
  p_payment_method text,
  p_items jsonb   -- [{product_id, product_name, quantity, price, discount, gst_percent}, ...]
)
returns table (bill_id bigint, bill_no text, bill_date date, bill_time time)
language plpgsql
as $$
declare
  v_customer_id bigint;
  v_bill_id bigint;
  v_bill_no text;
  v_bill_date date;
  v_bill_time time;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_gst numeric(12,2) := 0;
  v_grand_total numeric(12,2) := 0;
  item jsonb;
  v_line_subtotal numeric(12,2);
  v_line_discount numeric(12,2);
  v_line_gst_percent numeric(12,2);
  v_line_gst_amount numeric(12,2);
  v_line_total numeric(12,2);
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A bill must have at least one product';
  end if;

  if p_mobile_no !~ '^[0-9]{10}$' then
    raise exception 'Mobile number must be exactly 10 digits';
  end if;

  select id into v_customer_id from public.customers where mobile_no = p_mobile_no;
  if v_customer_id is null then
    insert into public.customers (customer_name, mobile_no)
    values (p_customer_name, p_mobile_no)
    returning id into v_customer_id;
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    v_line_subtotal   := (item->>'quantity')::numeric * (item->>'price')::numeric;
    v_line_discount   := coalesce((item->>'discount')::numeric, 0);
    v_line_gst_percent:= coalesce((item->>'gst_percent')::numeric, 0);
    v_line_gst_amount := round((v_line_subtotal - v_line_discount) * v_line_gst_percent / 100, 2);

    v_subtotal := v_subtotal + v_line_subtotal;
    v_discount := v_discount + v_line_discount;
    v_gst      := v_gst + v_line_gst_amount;
  end loop;

  v_grand_total := v_subtotal - v_discount + v_gst;

  insert into public.bills (customer_id, subtotal, discount, gst, grand_total, payment_method)
  values (v_customer_id, v_subtotal, v_discount, v_gst, v_grand_total, p_payment_method)
  returning id, bill_no, bill_date, bill_time into v_bill_id, v_bill_no, v_bill_date, v_bill_time;

  for item in select * from jsonb_array_elements(p_items) loop
    v_line_subtotal   := (item->>'quantity')::numeric * (item->>'price')::numeric;
    v_line_discount   := coalesce((item->>'discount')::numeric, 0);
    v_line_gst_percent:= coalesce((item->>'gst_percent')::numeric, 0);
    v_line_gst_amount := round((v_line_subtotal - v_line_discount) * v_line_gst_percent / 100, 2);
    v_line_total      := v_line_subtotal - v_line_discount + v_line_gst_amount;

    insert into public.bill_items (bill_id, product_id, product_name, quantity, price, discount, gst, total)
    values (
      v_bill_id,
      nullif(item->>'product_id','')::bigint,
      item->>'product_name',
      (item->>'quantity')::numeric,
      (item->>'price')::numeric,
      v_line_discount,
      v_line_gst_amount,
      v_line_total
    );
  end loop;

  return query select v_bill_id, v_bill_no, v_bill_date, v_bill_time;
end;
$$;

grant execute on function public.create_bill(text, text, text, jsonb) to anon;

-- ============================================================
-- DONE — your database is fully set up.
-- ============================================================
