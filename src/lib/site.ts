// Brand-level constants. Contact details are placeholders until Imarhair
// confirms them (prd.md Q7); they render only when set.
export const siteConfig = {
  name: "Imarhair",
  tagline: "Classy. Confident. IMAR",
  description: "Wigs, bundles and haircare products for elegant women.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  instagram: {
    handle: "@imarhair",
    url: "https://www.instagram.com/imarhair",
  },
} as const;

export const mainNav = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "About", href: "/about" },
] as const;

export const footerNav = [
  {
    title: "Shop",
    links: [
      { label: "Shop all", href: "/shop" },
      { label: "Imar Classic", href: "/collections/imar-classic" },
      { label: "Imar Prime", href: "/collections/imar-prime" },
      { label: "Bundles", href: "/collections/bundles" },
      { label: "Haircare", href: "/collections/haircare" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" },
      { label: "Shipping", href: "/shipping" },
      { label: "Returns", href: "/returns" },
    ],
  },
  {
    title: "Imarhair",
    links: [
      { label: "About", href: "/about" },
      { label: "Collections", href: "/collections" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
] as const;
