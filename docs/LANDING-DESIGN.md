# Landing page, public navbar and mobile footer: design direction

Built in **0.0.3**. The implementation lives in `src/components/site/` and `src/app/page.tsx`. Revise
this document if the owner sends further reference designs.

## Done already (in 0.0.2)
- Tech stack removed from the public footer. The public site never names the stack.
- Browser tab icon: the Weekflow "W" mark (`src/app/icon.svg`).

## References and what we take from each
| Reference | Take | Leave |
|---|---|---|
| Daybridge | Airy centered hero, floating pastel task cards around a faint calendar grid, soft gradient, pill CTA, a quiet "works with" row | Pricing link, trial wording |
| Sunsama | Bold centered headline, one pill CTA with a reassurance line, product screenshot directly under the hero, simple nav with Log in and Sign up | Orange brand color (ours is the user's accent) |
| Nonlinear | Framed app window over a vivid background, giant tight headline, product mock below | Dark-only look; ours follows light, dark and the 12 backgrounds |

## Page structure
1. **Navbar** (sticky). Logo left. Center: Features, How it works, Version history, Demo. Right: theme toggle and a pill "Open the demo". "Sign in" appears when accounts ship (0.1.0). No Pricing: Weekflow is free forever, which gets its own band instead.
2. **Hero.** Recommended: centered. "Plan smarter. Work better." in a large display size, one sentence, one primary CTA ("Open the demo"), reassurance line "Free forever. No credit card." Floating task cards built from the real task tokens scatter around a faint calendar grid. Alternative (Nonlinear style): left-aligned headline with the product window to the right. We decide after the next reference designs.
3. **Product window.** A framed, live (not an image) read-only week calendar using the real `TimeGrid` on sample data, sitting over the visitor's chosen background so the glass option shows off.
4. **How it works.** Capture, set your rules, let the engine plan and explain.
5. **Features.** Deterministic engine, rules you control, lock in place, workload view, themes with 15 colors and 12 backgrounds, free team workspaces.
6. **Free forever band.** No subscriptions, tiers or limits.
7. **FAQ** (accessible disclosure list), then **final CTA**, then **footer**.

## Navbar spec
- Desktop: height 64px, container `max-w-6xl`, transparent at top and a glass surface with a hairline border after the first scroll.
- Mobile (< 1024px): logo and a 44×44 menu button. The menu opens a full-height sheet: links as 48px rows, the CTA pinned at the bottom, Escape and an explicit close button, focus moved in and returned on close.
- Active link marked with `aria-current` plus weight, not color alone.
- Skip link first in tab order.

## Mobile footer spec
- Stack: logo and tagline, two columns of links (Product, Project), the "Open the demo" CTA, "Free forever" note, version line. No tech stack.
- Respects the iOS home indicator (`env(safe-area-inset-bottom)`); content never hides behind fixed bars.
- Optional sticky bottom CTA on the landing page only, shown after the hero scrolls away, one primary action per screen.
- Link rows at least 44px tall with 8px gaps.

## Typography and spacing
- Keep Inter. Display: `clamp(2.5rem, 6vw, 4.5rem)`, weight 650, tracking -0.03em, line-height 1.05. Body 16–18px, line-height 1.6, measure 60–70 characters.
- Plus Jakarta Sans is a candidate if the owner wants a friendlier headline voice.
- 4/8px spacing scale; section rhythm 96 / 64 / 48 desktop, 64 / 40 / 32 mobile.

## Motion
- 150–300ms, transform and opacity only, ease-out in and faster out.
- Floating hero cards drift gently (about 6s); stagger entrance 40ms per card.
- Everything static under `prefers-reduced-motion` and the Accessibility setting.
- Drawer and FAQ animate with the same tokens as the app.

## Accessibility
- One `h1`; sequential headings; landmarks (header, main, footer, nav labels).
- Decorative cards and grid are `aria-hidden`; the live product window gets a text summary.
- All text on tokens that already meet AA, including over glass surfaces.
- Visible focus rings, keyboard-complete drawer, no hover-only actions.
- Verified at 375, 768, 1024 and 1440 wide, in light and dark, with reduced motion, and with axe.

## Pre-delivery checklist (from the UI/UX review)
- [ ] No emoji as structural icons (vector icons only)
- [ ] Touch targets 44px or larger
- [ ] No horizontal scroll at 375px
- [ ] Reduced motion honored
- [ ] Light and dark both checked
- [ ] Layout stable (no CLS): reserve space for the live product window
