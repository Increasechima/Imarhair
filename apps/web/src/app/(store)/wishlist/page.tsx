import type { Metadata } from "next";
import { WishlistView } from "@/components/wishlist/wishlist-view";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false },
};

export default function WishlistPage() {
  return (
    <div className="container-page py-8 lg:py-12">
      <header className="mb-8 lg:mb-10">
        <p className="text-label text-taupe">Saved</p>
        <h1 className="text-h1 mt-2">Wishlist</h1>
      </header>
      <WishlistView />
    </div>
  );
}
