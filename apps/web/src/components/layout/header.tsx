import Link from "next/link";
import { Search, User } from "lucide-react";
import { BagLink } from "@/components/layout/bag-link";
import { LogoLink } from "@/components/brand/logo";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { mainNav } from "@/lib/site";

const iconLink =
  "size-11 items-center justify-center text-ink transition-colors hover:text-taupe";

// Style.md §6 Header. Desktop: logo left, nav centre, icons right.
// Mobile: menu left, logo centre, search + bag right.
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur-sm">
      <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-20">
        <div className="flex items-center">
          <MobileMenu />
          <div className="hidden lg:block">
            <LogoLink />
          </div>
        </div>

        <div className="flex justify-center">
          <div className="lg:hidden">
            <LogoLink />
          </div>
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-10">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-label inline-flex min-h-11 items-center underline-offset-8 decoration-gold hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex items-center justify-end lg:gap-2">
          <Link href="/search" aria-label="Search" className={`${iconLink} inline-flex`}>
            <Search className="size-5 lg:size-6" strokeWidth={1.5} />
          </Link>
          <Link href="/account" aria-label="Account" className={`${iconLink} hidden lg:inline-flex`}>
            <User className="size-6" strokeWidth={1.5} />
          </Link>
          <BagLink className={`${iconLink} inline-flex`} />
        </div>
      </div>
    </header>
  );
}
