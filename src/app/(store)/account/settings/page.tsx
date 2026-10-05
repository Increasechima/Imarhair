import type { Metadata } from "next";
import { PasswordForm, ProfileForm } from "@/components/account/account-forms";
import { getProfile, getSessionUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };

export default async function SettingsPage() {
  const [user, profile] = await Promise.all([getSessionUser(), getProfile()]);
  return (
    <div>
      <h1 className="text-h1 mb-8">Account settings</h1>
      <section aria-labelledby="details-h">
        <h2 id="details-h" className="text-h3 mb-5">
          Your details
        </h2>
        <ProfileForm
          profile={{
            full_name: profile?.full_name ?? null,
            phone: profile?.phone ?? null,
            marketing_opt_in: profile?.marketing_opt_in ?? false,
            email: user?.email ?? "",
          }}
        />
      </section>
      <section aria-labelledby="password-h" className="mt-12 border-t border-line pt-10">
        <h2 id="password-h" className="text-h3 mb-2">
          Password
        </h2>
        <p className="text-small mb-5 text-taupe">If you sign in with Google, you don&rsquo;t need a password here.</p>
        <PasswordForm />
      </section>
    </div>
  );
}
