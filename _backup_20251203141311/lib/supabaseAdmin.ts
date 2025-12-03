// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is not set. Check your .env.local file."
  );
}

if (!serviceKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not set. Use the *service_role* key from Supabase → Settings → API."
  );
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
