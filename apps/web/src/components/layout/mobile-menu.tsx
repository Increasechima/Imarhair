"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { mainNav, siteConfig } from "@/lib/site";

const secondaryNav = [
  { label: "My account", href: "/account" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label="Open menu"
        className="-ml-2.5 inline-flex size-11 items-center justify-center lg:hidden"
      >
        <Menu className="size-6" strokeWidth={1.5} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-[fade-in_250ms_var(--ease-out)]" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-full max-w-sm flex-col bg-ivory shadow-(--shadow-overlay) data-[state=open]:animate-[slide-in-left_350ms_var(--ease-out)]">
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            <Wordmark className="text-[1.375rem]" />
            <Dialog.Close aria-label="Close menu" className="-mr-2.5 inline-flex size-11 items-center justify-center">
              <X className="size-6" strokeWidth={1.5} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Site navigation</Dialog.Description>

          <nav aria-label="Mobile" className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
            <ul className="flex flex-col">
              {mainNav.map((item) => (
                <li key={item.href} className="border-b border-line">
                  <Link href={item.href} onClick={close} className="text-h2 flex min-h-16 items-center">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-8 flex flex-col gap-1">
              {secondaryNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={close} className="text-body flex min-h-11 items-center text-taupe">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <a
              href={siteConfig.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-label mt-auto inline-flex min-h-11 items-center pt-8"
            >
              Follow {siteConfig.instagram.handle}
            </a>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
