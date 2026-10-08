// Public build-time config (EXPO_PUBLIC_* is inlined into the app bundle, so
// never put a secret here). Each variable must be read with a literal
// `process.env.EXPO_PUBLIC_X` for Expo to inline it.

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing ${name}. Copy apps/mobile/.env.example to .env.local and fill it in.`);
  return value.replace(/\/$/, "");
}

export const env = {
  supabaseUrl: required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required("EXPO_PUBLIC_SUPABASE_ANON_KEY", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  /** The website: /api/v1 routes and web checkout. */
  siteUrl: required("EXPO_PUBLIC_SITE_URL", process.env.EXPO_PUBLIC_SITE_URL),
};
