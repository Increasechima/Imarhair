# Imarhair — Taste

This document covers **judgement**: how the site should feel and what to say yes or no to. [Style.md](Style.md) covers **specification**: the exact tokens and components. When the spec doesn't cover something, use this document to decide.

---

## The one-line brief

> **A premium fashion house that happens to sell hair.**
> Simple on the surface. Powerful underneath.

We want it to feel like the online store of a confident, well-dressed woman's favourite boutique. It should be calm, considered and expensive-looking, and still warm and easy to use. It should not feel like a marketplace, a SaaS dashboard or a template.

## Brand character

| We are | We are not |
|---|---|
| Classy | Flashy |
| Feminine | Girly / pink-everything |
| Confident | Loud |
| Timeless | Trendy-for-a-season |
| Modern | Techy |
| Accessible luxury | Exclusive / cold |
| Warm | Cutesy |

## What the logo tells us

The wordmark is **I M A R** in a high-contrast Didone-style serif. It is widely spaced and black, except for the **M**, which is drawn in gold and has a single fine loop that suggests a strand or a drop. From that:

- **Black does the talking. Gold is the signature.** Gold appears once per view where possible, like the single gold letter in the logo.
- **Thin and thick strokes.** Pair a refined serif for display with a clean sans for UI. Use hairline rules (1px) rather than boxes.
- **Generous spacing.** Letterspacing on small caps labels, whitespace around everything.
- **One flourish, not ten.** The loop in the M is the only ornament. Our UI gets one quiet detail per screen at most.

## Reference points (for feel, never to copy)

- Fashion e-commerce with editorial photography and calm grids, e.g. the restraint of a luxury ready-to-wear house's online store
- Beauty brands that use warm neutral backgrounds and confident typography
- Printed fashion magazines: big imagery, small captions, lots of air

## The taste checklist

Before shipping any screen, ask:

1. **Is the product the hero?** Photography should take up more space than chrome.
2. **Could I remove something?** If the screen works without an element, remove it.
3. **Is there only one primary action?** Each view has one obvious next step.
4. **Is the gold earning its place?** If gold appears more than about twice on a screen, cut some.
5. **Does it look like a template?** If you've seen this exact layout on a hundred startup sites, rethink it.
6. **Would it look good printed in a magazine?** Typography and spacing should hold up without colour.
7. **Does it work with one thumb on a phone on a slow network?**

## Signs that something looks AI-generated (avoid)

- Gradient backgrounds, gradient text, glowing blobs, glassmorphism
- Every card with `rounded-2xl` + drop shadow + icon in a coloured circle
- Three-column "features" rows with emoji or generic line icons
- Headlines like "Elevate your look" / "Unleash your beauty" / "Experience the difference"
- Stock "happy diverse team" imagery, 3D illustrations, sparkles ✨
- Fake urgency ("12 people are viewing this!"), fake countdown timers
- Placeholder testimonials ("Jane D. — ★★★★★ Amazing product!")
- Excessive micro-animations, bouncing buttons, parallax everywhere
- Dense dashboards with charts nobody asked for
- Over-explained UI ("Click the button below to add this item to your cart")

## Photography direction

- **Editorial over catalogue.** Real women, natural poses, soft directional light, warm skin tones rendered faithfully.
- **Backgrounds:** ivory, sand, warm stone, or soft blurred interiors. No harsh pure-white studio sweeps for hero images. Pure white is fine for product-only shots.
- **Crops:** portrait 4:5 for product cards and PDP, so the hair has room. Use 16:9 or taller full-bleed images for the hero on desktop and 4:5 on mobile.
- **Consistency:** every image in a product grid uses the same aspect ratio and a similar background tone.
- **Show the hair.** Show the length, movement, texture and hairline/lace. A close-up of the lace builds trust.
- Never stretch, over-saturate or apply heavy filters.

## Voice and copy

**Tone:** warm, assured, brief. She knows what she wants and we respect her time.

- Short sentences. Use fragments where they read well. *"Classy. Confident. IMAR."*
- Use **"Queen"** sparingly, only at moments of warmth: account welcome, order confirmation, emails. Never in error messages and never more than once per screen.
- Use plain words for actions: **Add to Cart**, **Checkout**, **Pay Now**, **Continue Shopping**. Don't use clever labels for buttons.
- Errors are calm and say what to do next. *"That card was declined. Try another card or pay by bank transfer."* Never blame the customer.
- Product names follow the pattern **Imar [Line] [Length] [Texture/Style] [Type]**, e.g. *Imar Prime 16" Bouncy Unit*.
- Write Naira as **₦480,000**, with no decimals for whole amounts and no "NGN" in the UI.
- Use the ″ symbol for lengths: `16"`. Write weights as `300g` and lace as `5x5 Swiss Lace`.

### Microcopy bank

| Moment | Copy |
|---|---|
| Added to cart | **Added to your bag** · View Cart · Continue Shopping |
| Empty cart | Your bag is empty. · **Shop hair** |
| Empty wishlist | Save the looks you love. · **Shop hair** |
| Low stock | Only 2 left |
| Sold out | Sold out |
| Coming soon | Coming soon · Be the first to know |
| Account welcome | Welcome back, Queen. |
| Payment processing | Confirming your payment… |
| Payment failed | Your payment didn't go through. Your bag is saved, so you can try again. |
| Order confirmed | Order Confirmed! Thank you for shopping with Imarhair, Queen. |
| Newsletter | New drops and restocks, first. |

## Motion taste

Motion should feel like fabric settling. Nothing should spring or bounce.

- Use it to help the customer understand what changed (drawer slides in, toast fades up, image cross-fades). Never use it just to decorate.
- Keep it fast (150–300ms) and ease-out.
- Always respect `prefers-reduced-motion`.

## Saying no

Features we should push back on, even if asked, unless the PRD changes:

- Pop-ups on page load (newsletter, discount spin-wheels)
- Chat widgets covering the cart button on mobile
- Carousels in the hero that rotate automatically
- Forcing sign-up before checkout
- More than one promotional banner at a time
- Social-proof counters, fake scarcity

When in doubt, choose **less, but better**.
