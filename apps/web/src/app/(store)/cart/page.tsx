import type { Metadata } from "next";
import { CartContents } from "@/components/cart/cart-contents";

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false },
};

export default async function CartPage(props: PageProps<"/cart">) {
  const { payment } = await props.searchParams;
  return (
    <div className="container-page py-8 lg:py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-h1 mb-6">Your bag</h1>
        {payment === "error" && (
          <p role="alert" className="text-small mb-6 border-l-2 border-error bg-white px-4 py-3 text-error">
            We couldn&rsquo;t confirm your payment just now. If you were charged, your order is safe. Check your email or
            contact us. Otherwise, please try again.
          </p>
        )}
        <CartContents />
      </div>
    </div>
  );
}
