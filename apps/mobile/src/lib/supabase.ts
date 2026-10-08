import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@imarhair/shared/database.types";
import { env } from "@/lib/env";
import { secureStorage } from "@/lib/secure-storage";

// The shopper's client: same Supabase project and Auth as the website, so one
// account works on both. Session lives in the Keychain/Keystore.
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

// Refresh tokens only while the app is in the foreground (Supabase's advice for RN).
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

// Catalogue reads always go anonymous, exactly like the website's cached reads:
// RLS then guarantees published products only, even for an admin's account.
export const catalog = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "imar-catalog" },
});
