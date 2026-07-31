-- ============================================================
-- BUSINESS SETTINGS
-- Run this in Supabase SQL Editor (after 01 and 02).
-- A single-row table: the CHECK (id = 1) guarantees there is
-- only ever one business profile, which is all this app needs
-- right now. Multi-business support (future feature) would
-- replace this with a proper businesses table later.
-- ============================================================

CREATE TABLE public.business_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    business_name TEXT NOT NULL DEFAULT 'Your Business Name',
    address TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    gstin TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the single row so the app always has something to read
INSERT INTO public.business_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_business_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_business_settings_updated_at
BEFORE UPDATE ON public.business_settings
FOR EACH ROW EXECUTE FUNCTION public.set_business_settings_updated_at();

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "development business settings access"
ON public.business_settings
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- ============================================================
-- DONE
-- ============================================================
