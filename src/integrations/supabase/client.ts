// Supabase client — shared backend with ALOMAR project
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kimyzwmniidwnixezqdi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbXl6d21uaWlkd25peGV6cWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzgxMjEsImV4cCI6MjA4NzAxNDEyMX0.NMWBk5UA1D2RudonrtwCtRawr8iOtXnwpakK_WiGSZc";

export const supabaseConfigured = true;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
