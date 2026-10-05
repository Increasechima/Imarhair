import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import heroImage from "@/assets/hero-body-wave.webp";

export const metadata: Metadata = {
  title: "About",
  description: "Imarhair makes premium human hair wigs and bundles for elegant women. Classy. Confident. IMAR.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="container-page py-10 lg:py-16">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="relative aspect-4/5 overflow-hidden bg-sand lg:col-span-5">
          <Image src={heroImage} alt="Honey brown body wave unit by Imarhair" fill placeholder="blur" sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover object-top" />
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <p className="text-label text-taupe">About Imarhair</p>
          <h1 className="text-h1 mt-3">Hair that makes you feel confident.</h1>
          <div className="prose-imar mt-6">
            <p>
              Imarhair makes premium human hair wigs, bundles and closures for elegant women: hair that looks like
              yours, moves like yours and lasts.
            </p>
            <p>
              <strong>Imar Classic</strong> is for every day: soft, natural units you&rsquo;ll reach for again and
              again. <strong>Imar Prime</strong> is our finest: fuller density and premium lace for the moments that
              matter.
            </p>
            <p>
              Every product page shows real photos and honest details, including length, density, lace and care, so
              you know exactly what you&rsquo;re getting. If you need help choosing, we&rsquo;re a message away.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/shop">Shop hair</ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              Talk to us
            </ButtonLink>
          </div>
        </div>
      </div>
    </article>
  );
}
