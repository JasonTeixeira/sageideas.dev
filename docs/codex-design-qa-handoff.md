# Codex Handoff: Sage Ideas Design QA & Polish

## Links

| Resource | URL |
|----------|-----|
| **Repo** | https://github.com/JasonTeixeira/sageideas.dev.git |
| **Live Site** | https://www.sageideas.dev |
| **Branch** | `main` (latest: `4b28558`) |

### v0 Component Previews (live demos)

| Component | Preview | Status |
|-----------|---------|--------|
| Logo SVG | https://v0.app/chat/uyicziL8Tg9 | In repo as backup (`components/sage-logo.tsx`) |
| Hero Section | https://v0.app/chat/uqud3KQCEsR | **LIVE** on homepage |
| Process Timeline | https://v0.app/chat/c8hXXuKpvun | **LIVE** on /process |
| Pricing Page | https://v0.app/chat/evhiXwt4K3t | **LIVE** on /pricing |
| Portfolio Grid | https://v0.app/chat/n7BXxPOpYsO | Ready to swap (`components/v0-case-study-grid.tsx`) |
| Navigation | https://v0.app/chat/cZuoAiwBFpO | Ready to swap (`components/v0-sage-navbar.tsx`) |
| Footer | https://v0.app/chat/iRweQ3iwe1n | Ready to swap (`components/v0-footer/`) |

---

## What Was Done (12 Commits, 236 Files, 10,822 Insertions)

### Brand Identity
- Typography: Inter → **Instrument Serif** (headings) + **Plus Jakarta Sans** (body) + JetBrains Mono (code)
- Colors: Default Tailwind cyan/violet → **5-color logo-derived palette** with warm-tinted neutrals
- Logo: Real multicolor S-ribbon PNG (422x647 transparent) in nav, footer, hero, 404
- Favicon + apple-icon generated from real logo
- OG image route updated with brand gradient, serif title, color dot palette bar

### Design System (styles/globals.css)
```css
--sage-brand: #0ED3CF;      /* teal — primary CTAs, links */
--sage-coral: #E85D3A;      /* warm accent, secondary */
--sage-lime: #A8C633;       /* success, growth */
--sage-magenta: #C7236E;    /* premium tier */
--sage-surface: #09090B;    /* base background */
--sage-surface-raised: #12110F;  /* cards */
--sage-surface-overlay: #1A1917; /* hover states */
--sage-border: #2A2826;
--sage-ink: #F4F2EF;        /* primary text */
--sage-ink-muted: #A8A29E;  /* secondary text */
--sage-ink-subtle: #78716C; /* tertiary text */
```

### v0 Components (LIVE)
- **HeroSection** → `app/page.tsx` — typewriter animation, product rotator, dot grid, ambient washes
- **PricingPage** → `app/pricing/page.tsx` — tier cards with glow, comparison table, care plans, FAQ
- **ProcessTimeline** → `app/process/process-content.tsx` — scroll-triggered vertical timeline

### Assets Generated
- 12 hero images via fal-ai Flux Pro (homepage, pricing, services, work, trust, lab, 6 service details)
- 4 Recraft V3 SVGs (logo mark, service icons, blog covers, favicon)
- 1 editorial founder portrait via fal-ai
- Real logo processed with PIL (background removed, favicon/apple-icon created)

### Other Changes
- Homepage streamlined: 13 → 9 sections
- 51 blog posts migrated from JS array to individual MDX files in `content/blog/`
- Page entrance CSS animation on `<main>` element
- Card depth system (hover lift + shadow glow) via CSS
- Premium link underline animation on brand-colored links
- PullQuote, Callout, SectionDivider components for editorial content
- GitHubActivity component with live shipping indicator
- PageHeroBg reusable component with next/image optimization
- Skip-link + focus-visible + prefers-reduced-motion all implemented
- Legal pages: prose-sage typography system

---

## What Codex Should Do

### Task 1: Visual QA — Every Public Page
Visit every route and verify:
- [ ] Logo renders correctly (transparent, not distorted)
- [ ] Headings use Instrument Serif (26 files may still have `font-bold` overriding)
- [ ] Brand colors only (zero old #06B6D4 or #8B5CF6)
- [ ] Page entrance fade-in animation works
- [ ] Card hover effects work (lift + shadow)
- [ ] No broken images
- [ ] No layout overflow on mobile (375px, 768px, 1024px, 1440px)
- [ ] prefers-reduced-motion respected

### Task 2: Evaluate v0 Components Not Yet Swapped
Three v0 components are built but not live:

**`components/v0-sage-navbar.tsx`** (739 lines)
- Preview: https://v0.app/chat/cZuoAiwBFpO
- Risk: Current nav has auth state (isSignedIn), command palette (Cmd+K), hover-intent timing
- Decision: Only swap if v0 version handles auth + search

**`components/v0-footer/`** (5 files, 430 lines)
- Preview: https://v0.app/chat/iRweQ3iwe1n
- Risk: Low — footer is simpler. Check link paths match `/services/*` structure

**`components/v0-case-study-grid.tsx`** (560 lines)
- Preview: https://v0.app/chat/n7BXxPOpYsO
- Risk: Existing WorkGrid already has screenshots + metrics. Compare quality.

### Task 3: Pages Below 70 — Polish These

| Page | Score | Fix |
|------|-------|-----|
| `/stack` | 50 | Rebuild as visual layered diagram with opinions per tool |
| `/industries` | 62 | Add industry-specific hero images, richer content per vertical |
| `/lab` | 65 | Add product screenshots from `/work/screens/*.png` into cards |
| `/blog` listing | 68 | Make first post a full-width featured hero card |
| `/lab/ai-readiness` | 69 | Premium results visualization after form submission |
| `/lab/calculators` | 68 | Visual polish on 5 ROI calculator components |
| `/lab/templates` | 65 | Upgrade template gallery cards |

### Task 4: Content Gaps

| Issue | File | Fix |
|-------|------|-----|
| Fake testimonials | `data/social-proof/testimonials.ts` | File says "composite, anonymized." Remove carousel or mark as example outcomes |
| Anonymous references | `data/references.ts` | All 5 are `attributed: false`. Flag for real names when available |
| Thin blog posts | `content/blog/*.mdx` | Identify 5 best, flag for expansion to 2,500+ words |

### Task 5: Technical Verification
```bash
npx next build              # Should: 0 errors, 154+ static pages
npx tsc --noEmit            # Pre-existing test errors OK, no new ones
node -e "..."               # Verify 51 MDX files parse with gray-matter
```

---

## Anti-Patterns (Never Do)
- NEVER use Inter, Roboto, Arial, or system-default fonts
- NEVER use #06B6D4 (old cyan) or #8B5CF6 (old violet)
- NEVER use pure zinc grays (#27272A, #18181B, #71717A)
- NO emoji as icons — use Lucide React
- cursor-pointer on ALL clickable elements
- prefers-reduced-motion MUST be respected

## Key Files
```
styles/globals.css                    — Brand tokens, animations, prose styles
app/layout.tsx                        — Root layout, 3 fonts, structured data
app/page.tsx                          — Homepage (v0 hero + 8 sections)
app/pricing/page.tsx                  — Pricing (v0 PricingPage + extended menu)
app/process/process-content.tsx       — Process (v0 ProcessTimeline wrapper)
components/sage-logo.tsx              — v0 inline SVG logo (backup)
components/page-hero-bg.tsx           — Reusable hero bg (next/image + gradient)
components/pull-quote.tsx             — PullQuote + Callout + SectionDivider
components/github-activity.tsx        — Live GitHub metrics strip
components/glow-card.tsx              — Cursor-follow glow card
components/navigation.tsx             — Nav (logo + mega-menu + auth)
components/footer.tsx                 — Footer (logo + 5 columns + legal)
public/brand/sage-logo.png            — Real logo (422x647 transparent)
public/brand/sage-logo-hq.png         — Original HQ source
content/blog/*.mdx                    — 51 blog posts with frontmatter
lib/blog-server.ts                    — Server-side MDX loader (fs + gray-matter)
lib/blogData.ts                       — Client-side blog data (legacy JS array)
```
