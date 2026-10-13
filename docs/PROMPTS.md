> **Current implementation (2026-10-13):** The home hero now uses scroll-driven video seeking, not hover playback. Read `README.md`, `app.js`, and `scene-compositor.js` first. The headline uses live scene-space foreground occlusion, so K becomes complete as it clears the computer. The screen uses a perspective-tracked native HTML/CSS UI with a flower mask. Use `assets/media/bloom-scroll-seek.mp4`; older hover instructions and screenshots below are historical references. Keep the current source behavior when porting.

# Prompts for rebuilding BloomOS in Enter

**Easiest start:** give Enter the repository link https://github.com/xutianze007-svg/BloomOS and say: "Import this repo; it's a finished static site. Read docs/TEMPLATE_SPEC.md, then reply with your React component plan before writing code." After that, skip Step 0 and continue from Step 1, telling it to "use the files in the repo" instead of attaching them.

Use these **in order, one message each**. Wait for each step to work in the preview before sending the next. Attach or upload the files named in each step. If Enter only accepts images, paste the code files' contents into the message.

---

## Step 0: Context (send first, with `TEMPLATE_SPEC.md` and all screenshots in `docs/reference/`)

```
I'm porting an existing, finished landing site called BloomOS into an Enter template.
Attached: TEMPLATE_SPEC.md (the full spec) and reference screenshots of every state.
This is a faithful PORT, not a redesign: keep every size, colour, timing and line of copy
exactly as specified. The code I'll give you next is the source of truth; if the spec and
code disagree, follow the code.
Please read the spec and reply with: (1) your component/file plan in React, (2) where the
static assets will live (must be same-origin, e.g. /public/assets), (3) anything you can't
support. Don't write code yet.
```

## Step 1: Scaffold, assets, global CSS (attach `styles.css`, `pages.css`, `assets/**`)

```
Create the project skeleton:
- Put all files from assets/ under /public/assets/ with the same paths.
- Import styles.css then pages.css as GLOBAL CSS, verbatim, loaded last. Do not convert to
  Tailwind. If Tailwind is installed, disable preflight so it doesn't reset h1/button/img.
- Register the local fonts exactly as in styles.css (@font-face Bodoni + Inter).
- Add a tiny hash router (useHashRoute) for #/, #/product, #/solutions, #/pricing, #/login,
  #/signup, #/workspace. Set body[data-route] to the current route name ("home" for #/).
- <Hero/> must stay mounted on every route (hidden by CSS when not on #/).
Keep all class names from the source so the CSS applies unchanged.
```

## Step 2: Hero markup + header (attach `index.html`; reference 01, 13)

```
Build <SiteHeader/> and <Hero/> by converting the matching markup in index.html to JSX
1:1 (same elements, classes, ids, aria attributes, copy). Include: .scene, .media-plane with
the start image and the <video id="garden-video" muted playsInline preload="auto">,
.scene-shade, .hero-copy (h1 "MAKE WORK"/"BLOOM.", tagline, Try BloomOS → #/workspace,
Watch demo), the occluder canvas (empty for now), .bloom-trigger, .hover-hint, .bloom-cursor,
footer with "Reset garden". Static only, no interaction yet.
Compare against docs/reference/01-hero-start.png at 1440×900 and docs/reference/13 at 390×844: the
condensed Bodoni headline (scaleX + width compensation, cqw sizes) must match exactly.
```

## Step 3: Hero interaction (attach `app.js`; reference 02, 03)

```
Port the hero logic from app.js (everything above the "Foreground occlusion" section) into a
useGardenHero() hook inside <Hero/>, line by line:
- layout()/sourcePoint()/artworkPoint() mirror the CSS cover framing (62% / 68% / mobile).
- Cursor spotlight (spec 5.3): a 400px-wide mask canvas in plane space; each frame while
  hovering, stamp a soft radial gradient (radius 230px, strength 0.16) at the smoothed pointer;
  apply it to the video as inline mask-image (dataURL, mask-size 100% 100%). The video starts on
  the first stroke, plays once and holds the last frame; revealed areas persist until Reset.
- Classes on #hero: has-explored, is-revealing, garden-playing.
- Touch, keyboard focus on .bloom-trigger, and Watch demo also start it; Reset garden resets.
- prefers-reduced-motion: seek to the last frame instead of playing.
- Pause when the tab is hidden, and when leaving #/; resume when coming back if it was mid-play.
- Make effects idempotent (React StrictMode) and clean up all listeners.
```

## Step 4: Foreground occluder (attach `app.js`, `occlusion-domain.png`; reference 01, 03)

```
Port the "Foreground occlusion" IIFE from app.js into useOccluder(), unchanged:
a WebGL canvas (1920×1080, premultipliedAlpha) above the h1 that redraws the start image
(mode 0) or the start→video mix by the spotlight mask texture (mode 1), keys out the blue
sky with the exact shader in the spec, and multiplies by occlusion-domain.png.
Upload the video texture on every requestVideoFrameCallback while playing and on
seeked/ended/pause. Re-render when #hero's class changes and on resize. Only the h1 goes
behind it; tagline and buttons stay above (z-index rules are in styles.css).
Acceptance: idle, the monitor corner and vines cover the right leg of the "K" in WORK; when
bloomed, flowers and butterflies cover parts of "WORK" (docs/reference/03). No console errors.
If WebGL is unavailable, skip silently.
```

## Step 5: Marketing pages (attach `index.html`, `pages.js`; reference 04–06)

```
Build <ProductPage/>, <SolutionsPage/>, <PricingPage/> and a shared <SiteFooter/> by
converting the matching <main data-page> sections of index.html to JSX 1:1, and port the
related logic from pages.js:
- ARIA tabs with arrow keys (Product features, Solutions teams).
- Pricing Monthly/Yearly toggle ($12↔$10, $24↔$19, "billed yearly" label).
- Plan buttons and "Use this template" store bloomos-demo-intent {plan, template} and go to
  #/signup (if signed in: update plan / prepend template tasks and go to #/workspace).
- Header: active link underlined via aria-current; solid paper header on inner pages;
  "Open workspace" replaces Log in/Get started when signed in; mobile hamburger menu.
- On route change scroll to top and focus the page H1.
Match docs/reference/04, 05, 06 (full-page screenshots).
```

## Step 6: Log in, Sign up, Workspace (attach `index.html`, `pages.js`; reference 07–12, 15)

```
Build <LoginPage/>, <SignupPage/>, <WorkspacePage/> from the matching sections of
index.html, porting the logic from pages.js exactly:
- Log in: field validation messages, Show/Hide password, Forgot password view with demo
  confirmation, Explore as a guest; a valid email + 6+ char password creates/loads
  bloomos-demo-session and opens #/workspace.
- Sign up: 3-step stepper (Account → About you → Workspace) with per-step validation,
  Enter to advance, password strength bar, art/quote change per step, prefilled
  "First’s garden", accent swatches + live preview, "Planting your workspace…" for 1.4s,
  then seed starter tasks from the chosen template/use and open the workspace.
- Workspace: full-page app with top bar (workspace name, plan badge, Back to site, avatar
  menu with Reset demo data / Sign out), guest banner, sidebar views, search, board with
  Complete/Reopen, + New, scripted assistant reply; accent colour via --accent.
- Keep the localStorage keys and shapes from the spec; wrap storage in try/catch.
Match docs/reference/07–12 and 15.
```

## Step 7: QA pass

```
Go through the "Acceptance checklist" in TEMPLATE_SPEC.md item by item at 1440×900 and
390×844 and report pass/fail for each, with screenshots for the hero states. Fix every fail.
List any intentional deviation from the source in the PR description.
```

---

## Fix-up prompts (use if you see these problems)

- **Headline looks wide or uses the wrong font:** "The h1 must use the local Bodoni Moda (weight 900) and the exact transform: scaleX(...) + width compensation and cqw font-size from styles.css for each breakpoint. Something (probably a CSS reset or Tailwind preflight) is overriding it; make the source CSS win."
- **Video restarts when navigating back home:** "Don't unmount <Hero/> on route change; keep it mounted and hide it with CSS (body:not([data-route=home]) .hero{display:none})."
- **Headline is fully on top / nothing covers it:** "The occluder canvas isn't drawing. Check the WebGL console errors, that media is same-origin, and that .hero-copy has z-index:auto with h1 z-index 6 below the occluder (z 7) and tagline/actions z-index 9."
- **Clouds or grass cover the text:** "The occluder must multiply by occlusion-domain.png (only the area around the computer) and key out blue sky with the exact smoothstep values in the spec."
- **The reveal circle is offset from the cursor:** "layout() must match the CSS object-position (62% / 68% / mobile centre) of .scene-layer; recompute it on resize."
