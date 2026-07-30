/* ============================================================
   CONFIG.JS
   Supabase connection settings.

   PRIVACY / SECURITY NOTE (read this before deploying):
   ------------------------------------------------------------
   - SUPABASE_URL and SUPABASE_ANON_KEY below are SAFE to put in
     frontend code. The "anon" key is a PUBLIC key by design —
     Supabase expects it to sit in browser JavaScript. Your data
     is protected by Row Level Security (RLS) policies on the
     database, not by hiding this key.

   - NEVER put your "service_role" key here, in any .js file, or
     anywhere in this project folder. The service_role key
     bypasses RLS completely — anyone who gets it has full
     read/write access to every table with no restrictions.
     It belongs only in secure server-side code (which this
     project does not use).

   - Where to find your own values:
     Supabase Dashboard → Project Settings → API
       - "Project URL"       → SUPABASE_URL
       - "anon public" key   → SUPABASE_ANON_KEY
   ============================================================ */

const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL_HERE";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_PUBLIC_KEY_HERE";

// Single shared Supabase client used by every page.
// Loaded via the Supabase CDN script (see index.html / pages/*.html).
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
