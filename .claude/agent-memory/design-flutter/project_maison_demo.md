---
name: MAISON demo login screen
description: First Flutter screen generated for AW Solution — luxury restaurant loyalty app demo with dark/gold design system
type: project
---

Fictive luxury restaurant loyalty app "MAISON" used as a demo/showcase for AW Solution's Flutter capabilities.

**Screens completed:**
1. `login_screen.dart` — email/password login, Google Sign-In, animated gold glow background, cinematic vignette, staggered slide animations
2. `home_page.dart` — full homepage with header (logo + points badge + notification bell), personalized greeting, progress card toward next reward with animated gold bar, horizontal rewards carousel (6 items, locked/unlocked states), promotions section (3 promo cards with unique accent colors), bottom nav bar with elevated scanner button with gold pulse glow

**Design system tokens (_MaisonTokens):**
- Palette: deep charcoal (#1A1A1A) + gold champagne (#D4AF37) + gold light (#E8D48B) + off-white (#F5F0E8) + off-white secondary (#B0A89A)
- Additional: success (#6FCF97), error (#CF6679), cardGlass (#242424), progressBg (#2E2E2E), locked (#555555)
- Fonts: Playfair Display (brand name, section titles), Cormorant Garamond (subtitle — login only), Inter (body/UI)
- Style: dark luxury, cinematic vignette, animated gold glow CustomPainter background, glassmorphic-adjacent cards with subtle gold borders
- Radius: 8/12/16/20/28, gradient gold CTA/scanner button with pulse animation
- Animations: staggered fade+slide entrance per section, progress bar easeOutCubic fill, scanner button glow pulse, rotating background halos

**Why:** Alex requested this as the Flutter pur demo to demonstrate AW Solution's app quality for high-end restaurant franchises.

**How to apply:** Use _MaisonTokens and visual language as reference for all MAISON demo screens. Every new screen must reuse the same tokens, animation patterns, and design language.
