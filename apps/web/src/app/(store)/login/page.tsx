import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, OrDivider } from "@/components/auth/auth-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { SignInForm } from "@/components/auth/auth-forms";
import { FormMessage } from "@/components/ui/field";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

const linkErrors: Record<string, string> = {
  link_expired: "That link has expired or was already used. Sign in, or request a new link.",
  auth: "We couldn't sign you in. Please try again.",
  oauth_expired: "Google sign-in took too long and timed out. Please tap Continue with Google again.",
  oauth_cancelled: "Google sign-in was cancelled. You can try again, or sign in with your email.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const { next, error } = await props.searchParams;
  const nextPath = safeNextPath(next);
  const errorMessage = typeof error === "string" ? linkErrors[error] : undefined;
  const signupHref = nextPath === "/account" ? "/signup" : `/signup?next=${encodeURIComponent(nextPath)}`;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see your orders, wishlist and saved bag."
      footer={
        <>
          New to Imarhair?{" "}
          <Link href={signupHref} className="text-ink underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      {errorMessage && (
        <div className="mb-6">
          <FormMessage tone="error">{errorMessage}</FormMessage>
        </div>
      )}
      <GoogleButton next={nextPath} />
      <OrDivider />
      <SignInForm next={nextPath} />
    </AuthShell>
  );
}
