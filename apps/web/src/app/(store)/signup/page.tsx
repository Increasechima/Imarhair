import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, OrDivider } from "@/components/auth/auth-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { SignUpForm } from "@/components/auth/auth-forms";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false },
};

export default async function SignUpPage(props: PageProps<"/signup">) {
  const { next } = await props.searchParams;
  const nextPath = safeNextPath(next);
  const loginHref = nextPath === "/account" ? "/login" : `/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save your bag across devices, track orders and keep a wishlist."
      footer={
        <>
          Already have an account?{" "}
          <Link href={loginHref} className="text-ink underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <GoogleButton next={nextPath} />
      <OrDivider />
      <SignUpForm next={nextPath} />
    </AuthShell>
  );
}
