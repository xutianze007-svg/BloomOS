> **Current implementation (2026-10-13):** The home hero now uses scroll-driven video seeking, not hover playback. Read `README.md`, `app.js`, and `scene-compositor.js` first. The headline uses live scene-space foreground occlusion, so K becomes complete as it clears the computer. The screen uses a perspective-tracked native HTML/CSS UI with a flower mask. Use `assets/media/bloom-scroll-seek.mp4`; older hover instructions and screenshots below are historical references. Keep the current source behavior when porting.

# BloomOS — Template Spec for Enter

> **Purpose:** rebuild the BloomOS landing site as an Enter template, matching the current reference build pixel-for-pixel and behaviour-for-behaviour.
> **Source of truth:** the working code at the repository root (plain HTML/CSS/JS, no dependencies) plus the screenshots in `docs/reference/`. When this document and the code disagree, **the code wins**.
> **Golden rule:** this is a *port*, not a redesign. Keep every value (sizes, colours, timings, copy) exactly as in the source.

---

## 1. What the template is

A cinematic SaaS landing page for a fictional product, **BloomOS** ("Make work bloom."):

1. **Hero:** full-screen artwork of a retro computer in a sunset mountain meadow. Wherever the pointer moves, a soft-edged spotlight reveals the blooming garden from a 3-second growth video (vines, flowers, butterflies, the screen lighting up with the BloomOS UI). Revealed areas stay revealed until "Reset garden".
2. **Foreground occlusion:** the computer, vines, flowers and butterflies pass *in front of* the giant headline "MAKE WORK BLOOM.", while the tagline and buttons stay on top.
3. **A small site behind it:** Product, Solutions, Pricing, Log in, a 3-step Sign-up/onboarding flow, and a full-page demo Workspace. All of it is local only (localStorage); there is no backend.

## 2. Package contents

```
BloomOS/   (repository root = the working reference build; open with any static server)
   ├─ docs/TEMPLATE_SPEC.md   ← this file
   ├─ docs/PROMPTS.md         ← step-by-step prompts for Enter
   ├─ docs/reference/         ← 15 screenshots of every state (desktop 1440×900, mobile 390×844)
   ├─ index.html             all markup: hero + every page (sections toggled by the router)
   ├─ styles.css             hero, header and base styles (incl. the old dialog styles reused by Workspace)
   ├─ pages.css              Product / Solutions / Pricing / Auth / Workspace / footer styles
   ├─ app.js                 hero interaction + WebGL foreground occluder
   ├─ pages.js               hash router, tabs, pricing, log-in, onboarding, workspace
   ├─ server.mjs, package.json   `npm run dev` → http://127.0.0.1:5173 (Node 22+)
   └─ assets/
      ├─ favicon.svg
      ├─ fonts/BodoniModa.ttf, Inter.ttf (+ OFL licence files)
      └─ media/
         ├─ bloom-start-v2.webp       1920×1080, the first video frame (hero base image)
         ├─ bloom-end-v2.webp         1920×1080, the final video frame (Product hero, auth art, CTA bands)
         ├─ bloom-forward.mp4         1920×1080, 24 fps, 3.04 s, H.264, keyframe every 4 frames (≈6.3 MB)
         ├─ bloom-reverse.mp4         the same clip reversed (≈6.2 MB)
         └─ occlusion-domain.png      960×540 grayscale, the soft area where the occluder may cover the headline
```

All media must be served **from the same origin** as the app (e.g. `/public/assets/...`). The WebGL occluder reads video and image pixels, so cross-origin files without CORS headers will silently break it.

## 3. Recommended rebuild in Enter (React)

| Source | React target |
|---|---|
| `index.html` hero `<main id="hero">` | `<Hero/>`, **always mounted**. Hide it with CSS (`display:none`) on other routes; never unmount it, or the video state and WebGL context are lost. |
| `app.js` (hero + occluder) | `useGardenHero()` and `useOccluder()` hooks inside `<Hero/>`, ported line by line. Guard WebGL init so React StrictMode's double effect doesn't create two contexts. |
| `pages.js` router | Hash routes `#/`, `#/product`, `#/solutions`, `#/pricing`, `#/login`, `#/signup`, `#/workspace`. A tiny `useHashRoute()` is enough; no router library is needed. If one is used, it must be a *HashRouter* and must keep `<Hero/>` mounted. |
| Each `<main data-page="…">` | `<ProductPage/>`, `<SolutionsPage/>`, `<PricingPage/>`, `<LoginPage/>`, `<SignupPage/>`, `<WorkspacePage/>`, plus a shared `<SiteHeader/>` and `<SiteFooter/>` |
| `styles.css` + `pages.css` | Import **verbatim** as global CSS. Do not convert to Tailwind. If Tailwind is present, disable `preflight` or load these files after it; preflight changes button, heading and img defaults the design relies on. |
| `localStorage` keys | Keep the same names (see §7) |

Keep class names identical so the CSS applies unchanged.

## 4. Design tokens

| Token | Value | Use |
|---|---|---|
| `--cream` | `#fff1d0` | hero text, cream buttons |
| `--green` | `#274f42` | primary buttons, accents |
| `--paper` | `#fcf5e5` | inner-page background |
| `--ink` | `#203d33` | inner-page text |
| `--sage` / `--peach` / `--butter` | `#d5d9bc` / `#f1cfac` / `#f8dfa6` | chips, tags, banners |
| `--line` | `#ddd2ba` | borders |
| `--muted` | `#6f7867` | secondary text |
| Hero bg fallback | `#225b70` | body background behind the artwork |
| Accent options (onboarding) | peach `#f1b48f`, sage `#a9bf92`, butter `#f0cf73`, rose `#e7a3a8` | workspace accent |

**Icons:** Lucide (ISC licence), inlined in `icons.js`; markup uses `<i data-icon="name"></i>`, replaced on load and for dynamically added nodes. Do not substitute emoji or unicode symbols.

**Fonts:** *Bodoni Moda* (variable, served locally, weight 900, `opsz` axis) for the display headline and page titles; *Inter* for everything else. Do not substitute Playfair, Didot or system serif.

**Hero headline:** two lines, "MAKE WORK" / "BLOOM.", Bodoni Moda 900, horizontally **condensed with `transform: scaleX(...)`** and a compensating `width` (e.g. `scaleX(.49)` + `width:204.08%` at desktop). Size is in container units (`cqw`) of `.scene`. Copy these rules exactly from `styles.css`; this condensed look is the signature of the page.

## 5. Hero — exact behaviour

### 5.1 Layer stack (inside `.scene`, `isolation:isolate`)

| z | Layer | Notes |
|---|---|---|
| 0 | `<img.start-frame>` bloom-start-v2.webp | `object-fit:cover`, see 5.2 |
| 0 | `<video#garden-video>` + cloned reverse `<video>` | same box as the image; the visible one has `opacity:1`; inline radial mask-image (5.3) |
| 3 | `.scene-shade` | subtle left gradient |
| 6 | `<h1>` headline | sits **behind** the occluder |
| 7 | `canvas#occluder` (WebGL) | redraws computer + plants above the headline, see 5.5 |
| 8 | `.hover-hint` | "Move your cursor. Let it bloom." with a curved line |
| 9 | tagline + buttons | always above the occluder |
| 6 | `.bloom-cursor` | 180 px faint warm glow following the pointer (`mix-blend-mode:screen`) |
| — | fixed `<SiteHeader/>` (z 8, outside the hero) | transparent with cream text on the hero |

### 5.2 Artwork framing (must match for the occluder and hit areas)

The artwork is 1920×1080 and always `object-fit:cover`:
- width > 700 px and aspect > 3:2: `object-position: 62% center`
- width > 700 px and aspect ≤ 3:2: `object-position: 68% center`
- width ≤ 700 px (mobile): the media plane is a 16:9 box anchored to the bottom (`width:178%; left:-62%`), `object-position:center`, with a top fade to `#225b70`; the headline sits above it.

`app.js → layout()` mirrors these numbers in JS; keep both in sync.

### 5.3 Hover bloom (source of truth: app.js)

- **Trigger area = the computer core** (monitor + base), source rect x 990–1625, y 265–850. Entering it starts the bloom; leaving it starts the rewind **immediately** (no delay). Leaving the whole hero also rewinds.
- **Native video, two copies:** `bloom-forward.mp4` and `bloom-reverse.mp4` (pre-reversed, keyframe every 4 frames for instant seeks). Forward plays at 0.85×; on leave, the reverse copy is seeked to `duration − t` and plays at 1.25×, so the garden grows back smoothly to frame 0, then everything resets. Re-entering mid-rewind continues forward from the current moment.
- **Directional reveal, one shared clock:** the video is shown through a CSS `radial-gradient` mask centred where the pointer first entered. Its radius grows with pointer travel (moving 50% of the artwork width opens everything; plus 18%/s while hovering still), so the bloom spreads in the direction you move. Feather = 32% of artwork width. Everything revealed shows the same video moment, so old and new flowers are never patched together.
- "Watch demo": an automatic stroke over the computer, then rewinds. Reduced motion: jumps to the last frame / first frame.

### 5.4 Hero copy (verbatim)

- H1: `MAKE WORK` / `BLOOM.`
- Tagline: "One workspace. From first thought to finished work."
- Buttons: **Try BloomOS ↗** (cream, goes to `#/workspace` as guest) · **Watch demo** (underlined, starts the garden from the computer)
- Hint (desktop): "Move your cursor. / Let it bloom." · (mobile): "Touch to / discover."
- Footer left: "— BUILT FOR HUMAN POSSIBILITY" · right (after start): "↺ Reset garden"

### 5.5 Foreground occluder (WebGL)

A transparent `<canvas id="occluder" width=1920 height=1080>` above the `<h1>` redraws the current picture (start frame, or start frame mixed with the visible video through the same radial mask) and keeps only the computer and plants:
- sky key: `sky = smoothstep(.02,.12,b−r) * smoothstep(.18,.34,b)`, alpha = `1 − sky`
- **erode** the alpha by taking the minimum of 4 neighbours 1.5 px away, then `smoothstep(.4,.95,alpha)`, × `occlusion-domain.png`
- **despill**: `b = min(b, max(r,g)*1.04)`, so no blue fringe shows against the cream letters
- the video texture is re-uploaded on every `requestVideoFrameCallback` of the visible video
Only the `<h1>` sits below it; tagline and buttons stay above.

## 6. Site pages (routes)

Global header: wordmark **BloomOS** · Product · Solutions · Pricing · Log in · **Get started ↗**. On the hero it is transparent with cream text; on inner pages it is paper `rgba(252,245,229,.88)` with blur and green CTA. The active route is underlined (`aria-current="page"`). When signed in, "Log in / Get started" become **Open workspace ↗**. Mobile (≤ 700 px): hamburger opens a dropdown. The header is hidden on `#/workspace`. Page enter animation: fade + 12 px rise, 0.5 s.

| Route | Content (copy is in `index.html`) | Behaviour |
|---|---|---|
| `#/product` | Hero "Everything your work needs to grow." + framed end-frame image; **4 feature tabs** (Projects, Knowledge, Bloom assistant, Focus) with CSS mock UIs; "How it works" Plant / Tend / Bloom; 6 tool categories; CTA band with artwork; footer | ARIA tabs with arrow-key navigation |
| `#/solutions` | "Made for the way your team grows."; **chip tabs** Creative studios / Product teams / Marketing / Founders, each with copy, 3 checks and a 5-step template card; "Popular ways to start" 4 cards; CTA band | "Use this template" saves the template intent → `#/signup` (if signed in: prepends 3 template tasks and goes to `#/workspace`) |
| `#/pricing` | "Simple plans for every season."; Monthly/Yearly toggle; plans **Seed $0**, **Bloom $12 → $10 yearly** (featured, dark green), **Garden $24 → $19 yearly**; comparison table; 4-item FAQ (`<details>`); note "Prices are illustrative and no payment is taken in this preview." | Choosing a plan saves it → `#/signup` (if signed in: updates the plan, goes to the workspace) |
| `#/login` | Split screen: artwork left with quote "A little focus. A lot of possibility."; form right: email, password (Show/Hide), Remember me, Forgot password?, Log in, "Explore as a guest", link to sign-up, demo note | Validation messages under fields; any valid email + 6-char password signs in (name derived from email). Forgot → reset form with a demo confirmation. |
| `#/signup` | Split screen; **3-step stepper**: ① Account (name, email, password + strength bar) ② "What will you grow here?" (6 checkbox chips, at least 1 required) + team size segmented control ③ Workspace name (prefilled "First’s garden"), accent swatches, live preview card | Back/Continue, Enter advances, art and quote change per step; submit shows "Planting your workspace…" (1.4 s) → `#/workspace` with starter tasks from the chosen use/template |
| `#/workspace` | Full-page app: top bar (✿ workspace name, plan badge, Back to site, avatar menu: name/email, plan, Reset demo data, Sign out); guest banner when not signed in; sidebar Home/Projects/Knowledge/Agents; search; board "In progress / Ready to bloom" with Complete/Reopen; + New task; Bloom assistant composer with a scripted reply | Tasks persist; the accent colour tints the selected nav, avatar and task art; Home view greets the user by first name |

Footer on marketing pages: BloomOS / "Make work bloom." + Product, Solutions, Account link columns + line "BloomOS is a product concept. No real accounts, payments or AI services are connected; demo data stays in your browser."

## 7. Local state

| Key | Shape |
|---|---|
| `bloomos-demo-session` | `{name, email, workspace, plan:'seed'|'bloom'|'garden', accent:'peach'|'sage'|'butter'|'rose', team, uses:[]}` or absent (guest) |
| `bloomos-demo-intent` | `{plan, template}`, set by the Pricing / Solutions buttons, consumed by sign-up |
| `bloomos-demo-tasks` | `[{id,title,description,tag,done,botanical?}]`, validated on load |
| `bloomos-demo-board` | board title string (e.g. "Launch campaign") |

Wrap every storage access in try/catch. The UI must still work when storage is blocked.

## 8. Responsive & accessibility

- Breakpoints: `≤700px` mobile, `701–900px` tablet tweaks, `aspect ≤ 3:2` framing, `aspect ≥ 2:1` copy offset.
- Mobile: plans stack, tabs scroll horizontally, auth art hidden, workspace sidebar collapses to icons.
- Skip link, focus moved to each page's H1 on route change (no visible ring on programmatic focus), ARIA tabs, `role=status` live regions, all decorative media `aria-hidden`, and `prefers-reduced-motion` honoured everywhere.

## 9. Acceptance checklist (for the PR reviewer)

**Hero**
- [ ] Idle hero matches `docs/reference/01-hero-start.jpg` at 1440×900 (headline size, condensed width, positions, header).
- [ ] The "K" in WORK is partly covered by the monitor corner and vines; tagline and buttons are never covered.
- [ ] Moving the pointer reveals the bloom only along its path, with soft, feathered edges; lingering makes a spot fully revealed.
- [ ] Revealed areas stay revealed; flowers there pass in front of the headline.
- [ ] "Reset garden" clears the reveal; "Watch demo" paints an automatic stroke over the computer.
- [ ] Reduced motion shows the final frame without playback; no console errors.

**Pages**
- [ ] All 7 routes work by URL and with back/forward; the active nav item is underlined.
- [ ] Product and Solutions tabs work by click and arrow keys.
- [ ] Pricing yearly toggle changes $12→$10 and $24→$19; plan buttons carry the plan into sign-up.
- [ ] Log-in validation messages; a valid demo log-in opens the workspace with the right name.
- [ ] Sign-up: 3 steps with validation; the stepper, art and preview update; "Planting…" then the workspace shows the chosen name, accent and starter tasks.
- [ ] Workspace: add, complete and reopen tasks; search; views; assistant reply; reset demo data; sign out returns home and the header reverts.
- [ ] Mobile 390×844 matches `docs/reference/13–15`.

**Code**
- [ ] Copy, colours and timings unchanged from the repository code; fonts are Bodoni Moda + Inter.
- [ ] Media served same-origin; the hero stays mounted across routes.
- [ ] Disclaimers present (concept product, illustrative prices, local-only demo).

## 10. Known pitfalls

1. **Tailwind preflight / CSS resets** change `h1`, `button`, `img` and break the condensed headline. Load the source CSS last or disable preflight.
2. **Unmounting the hero** on route change restarts the video and loses WebGL. Keep it mounted and hide it.
3. **Cross-origin media** (CDN without CORS) taints the WebGL textures and the occluder stops drawing. Keep media in `/public`.
4. **React StrictMode** runs effects twice; make WebGL and video listeners idempotent and clean them up.
5. **Video format:** keep H.264 MP4, `muted playsinline`; don't lazy-load it; don't add `autoplay`.
6. **Don't "improve" the copy or layout.** Any deviation should be listed in the PR description.

## 11. Reference screenshots

`01-hero-start` · `02-hero-entrance` · `03-hero-bloomed` · `04-product` (full page) · `05-solutions` (full) · `06-pricing` (full) · `07-login` · `08-signup-step1` · `09-signup-step2` · `10-signup-step3` · `11-workspace-member` · `12-home-signed-in` · `13-mobile-hero` · `14-mobile-pricing` · `15-mobile-workspace`

---
*Licences:* Bodoni Moda and Inter are SIL Open Font License (licence files included). BloomOS is a fictional product; all imagery was generated for this project.
