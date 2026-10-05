import { Wordmark } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
      <Wordmark className="text-2xl" />
      <h1 className="text-h1 mt-12">This page has moved on.</h1>
      <p className="text-body mt-4 max-w-sm text-taupe">
        The link may be old, or the page no longer exists. The good news: the hair is still here.
      </p>
      <ButtonLink href="/shop" className="mt-10">
        Shop hair
      </ButtonLink>
    </main>
  );
}
