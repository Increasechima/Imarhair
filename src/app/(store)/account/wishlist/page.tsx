import type { Metadata } from "next";
import { WishlistView } from "@/components/wishlist/wishlist-view";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false },
};

export default function AccountWishlistPage() {
  return (
    <div>
      <h1 className="text-h1 mb-8">Wishlist</h1>
      <WishlistView />
    </div>
  );
}
