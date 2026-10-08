import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Wordmark } from "@/components/brand/logo";
import { getProfile, getSessionUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Imarhair Admin" },
  robots: { index: false, follow: false },
};

const adminNav = [
  { label: "Dashboard", href: "/admin" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Products", href: "/admin/products" },
  { label: "Inventory", href: "/admin/inventory" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Reviews", href: "/admin/reviews" },
  { label: "Discounts", href: "/admin/discounts" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");

  // Authoritative role check. Non-admins get a plain 404 rather than a hint
  // that an admin area exists. RLS enforces the same rule on every query.
  const profile = await getProfile();
  if (profile?.role !== "admin") notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="border-b border-line">
        <div className="container-page flex h-14 items-center gap-8 overflow-x-auto">
          <Link href="/admin" className="inline-flex shrink-0 items-center gap-3">
            <Wordmark className="text-lg" />
            <span className="text-label text-taupe">Admin</span>
          </Link>
          <nav aria-label="Admin">
            <ul className="flex gap-6">
              {adminNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-small inline-flex min-h-11 items-center hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link href="/" className="text-small ml-auto shrink-0 text-taupe hover:underline">
            View store
          </Link>
        </div>
      </header>
      <main className="container-page min-w-0 flex-1 py-8">{children}</main>
    </div>
  );
}
