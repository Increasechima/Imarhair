import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { authErrorMessage } from "@imarhair/shared/auth-errors";
import { signInSchema, signUpSchema } from "@imarhair/shared/validation/auth";
import { supabase } from "@/lib/supabase";

// Same Supabase Auth as the website: one account works on web and in the app.

type Outcome = { ok: true; message?: string } | { ok: false; error: string };

type AuthValue = {
  /** undefined while the stored session is being read. */
  session: Session | null | undefined;
  signIn: (email: string, password: string) => Promise<Outcome>;
  signUp: (fullName: string, email: string, password: string) => Promise<Outcome>;
  signInWithGoogle: () => Promise<Outcome>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Please check your details.";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      async signIn(email, password) {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        return error ? { ok: false, error: authErrorMessage(error.code) } : { ok: true };
      },
      async signUp(fullName, email, password) {
        const parsed = signUpSchema.safeParse({ fullName, email, password });
        if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          // The confirmation email opens the website, which signs them in there;
          // they then sign in here with the same email and password.
          options: { data: { full_name: parsed.data.fullName } },
        });
        if (error) return { ok: false, error: authErrorMessage(error.code) };
        if (data.session) return { ok: true };
        // Same message whether or not the email already has an account.
        return {
          ok: true,
          message: `We've sent a confirmation link to ${parsed.data.email}. Open it, then sign in here.`,
        };
      },
      async signInWithGoogle() {
        // PKCE through the system auth browser. The redirect (imarhair://auth-callback
        // in builds) must be on Supabase Auth's redirect allow-list.
        const redirectTo = Linking.createURL("auth-callback");
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error || !data.url) {
          return { ok: false, error: "Google sign-in isn't available right now. Please use your email instead." };
        }
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== "success") return { ok: false, error: "" };
        const code = new URL(result.url).searchParams.get("code");
        if (!code) return { ok: false, error: "Google sign-in didn't finish. Please try again." };
        const exchanged = await supabase.auth.exchangeCodeForSession(code);
        return exchanged.error ? { ok: false, error: authErrorMessage(exchanged.error.code) } : { ok: true };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
