import type { Metadata } from "next";
import { ShopView } from "@/components/shop/shop-view";
import { parseShopParams } from "@imarhair/shared/catalog/shop-params";

export const metadata: Metadata = {
  title: "Shop wigs, bundles and closures",
  description: "Shop Imarhair wigs, bundles and closures. Imar Classic and Imar Prime human hair units, delivered across Nigeria.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage(props: PageProps<"/shop">) {
  const params = parseShopParams(await props.searchParams);

  return (
    <div className="container-page py-8 lg:py-12">
      <header className="mb-8 lg:mb-10">
        <p className="text-label text-taupe">Shop</p>
        <h1 className="text-h1 mt-2">All hair</h1>
      </header>
      <ShopView params={params} basePath="/shop" />
    </div>
  );
}
