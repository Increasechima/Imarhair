import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { signOut } from "@/server/actions/auth";

const accountNav = [
  { label: "Overview", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "Saved addresses", href: "/account/addresses" },
  { label: "Account settings", href: "/account/settings" },
];

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  // The proxy already redirects guests; this is the authoritative check.
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");

  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-12 lg:gap-8 lg:py-16">
      <aside className="lg:col-span-3">
        <h2 className="text-label text-taupe">My account</h2>
        <nav aria-label="Account" className="mt-4">
          <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
            {accountNav.map((item) => (
              <li key={item.href} className="shrink-0">
                <Link href={item.href} className="text-body inline-flex min-h-11 items-center pr-4 hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="shrink-0">
              <form action={signOut}>
                <button type="submit" className="text-body inline-flex min-h-11 items-center text-taupe hover:underline">
                  Log out
                </button>
              </form>
            </li>
          </ul>
        </nav>
      </aside>
      <div className="lg:col-span-9">{children}</div>
    </div>
  );
}
