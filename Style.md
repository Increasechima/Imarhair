# Imarhair — Style Guide

This is the visual and component specification. [Taste.md](Taste.md) explains the reasoning behind it. These values are implemented as CSS custom properties and Tailwind theme tokens in `src/app/globals.css`. **Don't hardcode hex values or pixel sizes in components. Use the tokens.**

---

## 1. Colour

### Brand

| Token | Hex | Use |
|---|---|---|
| `--color-ink` | `#111111` | Primary text, primary buttons, logo letters |
| `--color-gold` | `#C4922B` | The signature accent: logo "M", active states, small highlights. **Use sparingly.** (Sampled from the logo. Replace with the official brand-guide value when supplied.) |
| `--color-gold-deep` | `#A67A1F` | Gold text on light backgrounds when contrast is needed (≥ 4.5:1 on ivory at large sizes only) |

### Neutrals (warm)

| Token | Hex | Use |
|---|---|---|
| `--color-white` | `#FFFFFF` | Cards, inputs, product image backgrounds |
| `--color-ivory` | `#FAF8F4` | Default page background |
| `--color-beige` | `#F2EDE5` | Alternate section background, footer |
| `--color-sand` | `#E6DDD0` | Image placeholders, skeletons, subtle fills |
| `--color-line` | `#E3DDD3` | Hairline borders and dividers |
| `--color-stone` | `#8C847A` | Disabled text, placeholder text |
| `--color-taupe` | `#5F584F` | Secondary text, attribute lines, captions (AA on ivory) |

### Semantic

| Token | Hex | Use |
|---|---|---|
| `--color-success` | `#2F6B4F` | Paid / delivered status, success toasts |
| `--color-warning` | `#9A6A14` | Low stock, pending |
| `--color-error` | `#A3362D` | Errors, sold out, cancelled |
| `--color-info` | `#3B5568` | Shipped, informational |

### Rules
- Page background is **ivory** by default. Alternate full-width sections can use **beige**. Never put more than two neutral tones next to each other.
- Text is **ink** or **taupe**. Pure grey (`#888`) is never used.
- **Gold:** use it for at most about two touches per viewport. Never as a large fill or background, and never in gradients. Never use gold text for body copy.
- Primary buttons are **ink**, not gold.
- **Dark mode:** not in v1. The brand palette is light-first. The `<html>` element sets `color-scheme: light`.

## 2. Typography

| Role | Family | Notes |
|---|---|---|
| Display / headings | **Bodoni Moda** (Google Fonts, variable, via `next/font`) | High-contrast Didone, which echoes the logo. Use at 24px and above only. Hairlines break up at small sizes. |
| UI / body | **Jost** (Google Fonts, variable, via `next/font`) | Clean geometric sans that pairs with the logo's geometry |

Fallbacks: `Bodoni Moda, "Didot", "Bodoni 72", Georgia, serif` / `Jost, "Helvetica Neue", Arial, sans-serif`.

### Scale (mobile → desktop)

| Token | Mobile | Desktop | Family / weight | Line-height | Tracking |
|---|---|---|---|---|---|
| `display` | 40px | 72px | Bodoni Moda 400 | 1.05 | -0.01em |
| `h1` | 32px | 48px | Bodoni Moda 400 | 1.1 | -0.01em |
| `h2` | 26px | 36px | Bodoni Moda 400 | 1.15 | 0 |
| `h3` | 20px | 24px | Jost 500 | 1.3 | 0 |
| `body-lg` | 17px | 18px | Jost 400 | 1.6 | 0 |
| `body` | 15px | 16px | Jost 400 | 1.6 | 0 |
| `small` | 13px | 14px | Jost 400 | 1.5 | 0 |
| `label` | 12px | 12px | Jost 500, UPPERCASE | 1.2 | 0.14em |
| `price` | 15px | 16px | Jost 500, tabular-nums | 1.2 | 0 |

### Rules
- Buttons, nav links and section eyebrows use the **`label`** style (uppercase, tracked). This mirrors the wide spacing in the logo.
- Product names on cards use `body` in Jost 500, not the serif.
- The serif is used for headings and the hero only. Never use it for form fields, prices or buttons.
- Body text measure is at most 68 characters.
- Prices always use `font-variant-numeric: tabular-nums`.

## 3. Spacing and layout

- Base unit is **4px**. Use Tailwind's default spacing scale.
- Section vertical rhythm is `py-16` (64px) on mobile and `py-28` (112px) on desktop.
- **Container:** max width `1440px`. Side gutters are **16px** on mobile, 32px on tablet and 48px on desktop.
- Content-heavy pages (legal, FAQ) use a `720px` max width.

### Breakpoints (Tailwind defaults)
`sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. Design at **375px first**.

### Grid
| Context | Mobile | Tablet (md) | Desktop (lg+) |
|---|---|---|---|
| Product grid | 2 cols, 12px gap | 3 cols, 20px gap | 4 cols, 24px gap |
| Collection tiles | 1 col (or 2 if small) | 2 cols | 4 cols |
| PDP | stacked | stacked | 7/5 split (gallery / info) |
| Checkout | stacked, summary collapsible on top | stacked | 7/5 split (form / sticky summary) |

## 4. Shape, borders, elevation

- **Radius:** `--radius-none: 0` for images, tiles and cards. `--radius-sm: 2px` for buttons, inputs and chips. `--radius-pill: 999px` only for the cart count badge and status chips. **Avoid large radii.**
- **Borders:** 1px `--color-line`. Prefer hairline dividers to boxed cards.
- **Shadows:** almost never used. The one exception is drawers and popovers: `0 8px 32px rgb(17 17 17 / 0.08)`.
- **Overlay scrim:** `rgb(17 17 17 / 0.4)`.

## 5. Iconography

- **Lucide** icons, `stroke-width: 1.5`, at 20px (UI) or 24px (header).
- Icons are always ink or taupe. Gold is used only for the active/filled wishlist heart.
- Header icons are Search, User, Shopping Bag and Menu. Use a bag icon, not a cart icon. "Bag" is the fashion convention.
- Every icon-only button has an `aria-label`.

## 6. Components

### Buttons

| Variant | Style | Use |
|---|---|---|
| **Primary** | Ink fill, white `label` text, height 52px (mobile) / 48px (desktop), radius-sm, full-width on mobile in forms/PDP | Add to Cart, Checkout, Pay Now |
| **Secondary** | 1px ink border, ink text, transparent | Buy Now, Explore Collections, Continue Shopping |
| **Text link** | `label` style with 1px underline offset 4px | Tertiary actions ("View all", "Clear filters") |
| **On-image** | White fill, ink text (hero CTAs over photography) | Hero |

States:
- **Hover:** primary goes to `#2A2A2A`. Secondary fills ink with white text.
- **Focus-visible:** 2px gold outline, 2px offset.
- **Disabled:** sand fill, stone text.
- **Loading:** label replaced by a small spinner with the same width, so the button doesn't jump.
- **Added:** label swaps to "✓ Added" for 1.5s.

### Header
- Height 64px (mobile) / 80px (desktop). Ivory background. A 1px line appears at the bottom once the page scrolls.
- **Desktop:** logo on the left, nav (Shop · Collections · About) in the centre in `label` style, icons on the right.
- **Mobile:** hamburger on the left, logo in the centre, Search and Bag on the right.
- An optional announcement bar sits above the header: 36px, ink background, white `small` text, one message, not rotating.
- On product listing and PDP the header is sticky and hides on scroll down and reappears on scroll up.

### Product card
- Image 4:5, `object-cover`, sand placeholder while loading. On desktop hover, cross-fade to the second image over 300ms.
- Wishlist heart at the top right of the image, 40px hit area.
- Badge at the top left: `label`, 10px uppercase, ink on white (Sale / Sold out / Coming soon).
- Below the image, 12px gap, then the name (Jost 500), the attribute line (taupe `small`, wigs/bundles only) and the price row.
- Sale price shows in ink with the original price in stone, struck through, to its right.
- **Add to Cart:** a secondary full-width button under the card on mobile. On desktop it slides up over the bottom of the image on hover and is always visible on touch devices.
- No card border, no shadow, no rounded corners.

### Variant chips
- Height 44px, minimum width 56px, 1px line border, `small` text.
- Selected: ink border 1.5px plus ink text.
- Unavailable: stone text with a diagonal strike, `aria-disabled`.
- The group label sits above, e.g. **LENGTH** `label` · selected value in taupe.

### Inputs
- Height 52px, white background, 1px line border, radius-sm, 16px text (prevents iOS zoom).
- The label sits above in `small` Jost 500. Placeholders are only used as examples.
- Focus: ink border plus a 1px ink ring.
- Error: error-colour border, with the message below in `small` error colour and a leading icon.
- Selects use the native `<select>` styled to match, so mobile users get the native picker. This matters for the Nigerian states list.

### Quantity stepper
Three 44px cells − / n / +, hairline-bordered. Minus disables at 1. Plus disables at the stock or per-line limit.

### Drawers and sheets
- **Cart drawer:** slides in from the right. 420px wide on desktop, full-screen on mobile. Header "Your Bag (n)" plus close, scrollable lines, sticky footer with subtotal and CHECKOUT.
- **Filter sheet (mobile):** slides up from the bottom, full height, sticky **Apply (n results)** button.
- **Quick-add variant picker:** a bottom sheet on mobile, a popover anchored to the card on desktop.

### Toast
- Bottom-centre on mobile and bottom-right on desktop. White background, hairline border, drawer shadow, 4s auto-dismiss, dismissible.
- "Added to your bag" toast shows a thumbnail, the name, **View Cart** and **Continue Shopping**.

### Status chips (orders)
Pill shape, `label` 11px, tinted background at 10% of the semantic colour with text in the semantic colour.

| Status | Colour |
|---|---|
| Pending Payment | warning |
| Paid, Processing, Ready for Dispatch | ink on beige |
| Shipped | info |
| Delivered | success |
| Cancelled, Refunded | error |

### Skeletons
Sand blocks matching the final layout, with a slow 1.6s opacity pulse (no shimmer gradient).

### Accordions (PDP, FAQ)
Hairline dividers between items. `h3` row with a + / − icon. Content uses the `body` style. Only one open at a time on the PDP.

## 7. Motion

| Token | Value |
|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--dur-fast` | 150ms (hover, focus, chip select) |
| `--dur-base` | 250ms (toast, accordion, cross-fade) |
| `--dur-slow` | 350ms (drawer, sheet) |

- Section entrance is a single fade plus an 8px rise on first scroll into view, once per element. Product grids don't animate in.
- No parallax, no bouncing, no auto-rotating carousels.
- `prefers-reduced-motion: reduce` turns transitions into instant changes.

## 8. Imagery specs

| Placement | Ratio | Notes |
|---|---|---|
| Hero | 4:5 mobile / 16:9 desktop (art-directed `<picture>`) | Priority load. Text sits on the calm side of the frame. |
| Product card / PDP | 4:5 | Same background tone across a grid |
| Collection tile | 3:4 | Collection name in `h2` serif over the image (white) or below it |
| Brand section | 4:5 or 1:1 | |
| Instagram grid | 1:1 | 3 cols mobile / 6 cols desktop, no gaps or 2px gaps |

- Every image has descriptive `alt` text, e.g. *"Imar Prime 16" Bouncy Unit, natural black, front view"*.
- Text over images needs a contrast check. Use a subtle bottom scrim (`linear-gradient(transparent, rgb(17 17 17 / 0.35))`) only when necessary. This is the one permitted gradient.

## 9. Logo usage

- Source file: `public/brand/imar-logo-source.png`. **A vector SVG is needed for production** (ask Imarhair for it, or have it traced).
- Variants: **full wordmark** (black + gold M) on light backgrounds, **all-white** on photography, and the **gold M monogram** alone for the favicon, app icon and email footer.
- Minimum height is 20px in the mobile header and 28px on desktop. Clear space on all sides is at least the height of the "I".
- Never recolour the M anything but gold. Never add effects, outlines or shadows.

## 10. Email style

The email width is 600px with an ivory background and a white content panel. The logo is centred at the top. Headings use the system serif fallback (`Georgia`), because web fonts are unreliable in email. Body text uses `Helvetica/Arial`. The CTA is a solid ink button with white uppercase label. The footer is beige with support contact and Instagram. The layout is table-based and inline-styled.

## 11. Accessibility checklist

- Text contrast ≥ 4.5:1 (body) and ≥ 3:1 (large text, UI boundaries)
- Focus is visible on every interactive element (gold outline)
- Tap targets ≥ 44 × 44px
- Form errors are announced (`aria-live="polite"`) and linked to their input (`aria-describedby`)
- Drawers and sheets trap focus, close on Esc, and return focus to the trigger
- Colour is never the only way information is shown (e.g. status chips include text)
