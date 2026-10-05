import { ProductGridSkeleton } from "@/components/product/product-card";

export default function Loading() {
  return (
    <div className="container-page py-8 lg:py-12" aria-busy aria-label="Loading products">
      <div className="mb-8 h-10 w-48 bg-sand lg:mb-10" />
      <ProductGridSkeleton />
    </div>
  );
}
