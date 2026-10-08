"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
      <h1 className="text-h1">Something went wrong.</h1>
      <p className="text-body mt-4 max-w-sm text-taupe">
        We couldn&rsquo;t load this page. Please try again. If it keeps happening, contact us and
        we&rsquo;ll help.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Go home
        </ButtonLink>
      </div>
    </main>
  );
}
