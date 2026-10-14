# BloomOS — Make work bloom

Local, dependency-free HTML/CSS/JavaScript landing-page reconstruction.

## Preview

Run `npm run dev` (Node 22+), then open http://127.0.0.1:5173/.

## Interaction

The hero is pinned for 220 viewport-heights of scrolling. Scroll down to advance the supplied five-second camera-and-bloom video; scroll up to seek backwards. Hovering has no playback effect. The video remains paused: page scroll position sets its time, with the latest seek queued until the decoder finishes the previous one.

The opening poster, typography and layout are retained. The headline and supporting copy move upwards and fade out during the first 36% of the scroll. The full K is rendered without a fixed cutout. A WebGL foreground, keyed from the current scene frame, covers only the parts of the headline overlapping the computer and flowers. K becomes complete as it clears the computer. Background and foreground share the same decoded canvas snapshot to prevent edge ghosting. On mobile, the crop follows the computer towards the center.

The monitor contains a high-resolution HTML/CSS interface with native text. `scene-compositor.js` maps it to measured inner-glass corner keyframes with a projective transform; the display lights up at 3.06–3.30 seconds. Rounded edges, warm surface shading and subtle scanlines match the CRT. A frame-dependent mask retains bright saturated petals in the lower-left screen border, leaving foreground flowers over the UI. The tracking data is specific to this supplied video and must be recalibrated if the video or camera motion changes.

At the decoded final frame, the original monitor UI becomes interactive in place. `screen-interactions.js` enhances the existing markup without replacing the screen or navigating to `#/workspace`. Projects supports search, task creation, editing, and completion. Home includes live progress statistics and recent-task shortcuts. Knowledge provides category filters, editable notes, and explicit local saves. Agents offers three assistant profiles, suggested prompts, and scripted sample responses. Content scrolls within the glass; returning to the animation disables screen controls. Monitor tasks and notes use their own local-storage keys, separate from the full-page workspace demo.

Headline, tagline, and controls animate as separate layers. The computer and flowers can overlap the title while the tagline and primary button remain above the foreground at every viewport size.

"Watch demo" smoothly scrolls to the end; "Back to start" returns to the opening. Reduced-motion mode removes the title translation and uses instant control navigation. Touch and keyboard use normal browser scrolling; no wheel or touch events are intercepted.

See **Site pages** below.

## Site pages

A hash router (`pages.js`, styles in `pages.css`) turns the landing page into a small site; every route has a shareable URL and the hero remains paused on every route; returning home resets the scroll position.

- `#/product`: feature overview with tabbed previews (Projects, Knowledge, Bloom assistant, Focus), how it works, tool categories, CTA.
- `#/solutions`: team tabs (Creative studios, Product teams, Marketing, Founders) with starter templates; "Use this template" carries the template into sign-up (or straight into the workspace when signed in).
- `#/pricing`: monthly/yearly toggle, three illustrative plans, comparison table, FAQ. Choosing a plan carries it into sign-up.
- `#/login`: validated log-in form, password reset state, guest entry.
- `#/signup`: three-step onboarding (account, what you will grow + team size, workspace name + accent colour) that plants starter tasks and opens the workspace.
- `#/workspace`: the full-page demo workspace (formerly a dialog) with the signed-in name, workspace name, plan and accent, a user menu (reset demo data, sign out) and a guest banner.

Try BloomOS opens the workspace as a guest; Get started opens sign-up; once signed in, the header shows Open workspace. Everything is a local demo: the session, tasks and choices live in browser local storage; no backend, authentication, payment or AI service is connected.

## Assets

- `assets/media/bloom-scroll.mp4`: untouched copy of the supplied `video_1791864712492.mp4` (3836×2160, 5.042 seconds).
- `assets/media/bloom-scroll-seek.mp4`: active 1920×1080 H.264 playback copy, 121 independently seekable frames, approximately 12 MB. Reproduce with `swift tools/prepare-scroll-video.swift assets/media/bloom-scroll.mp4 assets/media/new-scroll-output.mp4`.
- `assets/media/bloom-start-v2.webp`: retained opening poster.
- `assets/media/occlusion-domain.png`: foreground domain for live scene-space title occlusion.
- `assets/media/foreground-before-v2.png`: initial occlusion fallback while WebGL textures load.
- Earlier video, frame and atlas assets are preserved for reference.
- `output/backup-before-scroll-video/`: previous source and initial screenshot.

## Typography

The reference is an AI-generated bitmap, so the precise original font cannot be determined. Bodoni Moda Black is the closest chosen Didone match, adjusted for width, optical size, line spacing, and reference placement. UI uses Inter. Both are served from local files and included under their SIL Open Font Licenses. Source: https://github.com/google/fonts/tree/main/ofl/bodonimoda and https://github.com/google/fonts/tree/main/ofl/inter.

## Latest verification

Latest checks cover in-monitor task editing and saving, search, Home/Knowledge/Agents switching, note filtering and saving, assistant prompt selection and sample replies, preserved home URL, and primary-control stacking. `npm run check` includes the screen interaction script. Earlier browser checks cover paused hover, forward/reverse scroll seeking, scene-space headline occlusion, tracked clear screen UI, desktop and mobile framing, demo/reset controls, and route return. Run syntax checks with `npm run check` and `node --check pages.js`.

### Archived monitor geometry repair

The previous `assets/media/bloom-growth-repaired.mp4` repairs the source video’s inward L-shaped lower-left screen bezel. `tools/stabilize-monitor.swift` composites a registered imagegen repair plate within x1044–1162, y700–810, with feathered edges, temporal introduction, and screen-light compensation. The small overlapping vine section uses the repair plate; movement elsewhere is retained. Original videos remain intact. Reproduce with `swift tools/stabilize-monitor.swift assets/media/bloom-growth-v2.mp4 assets/media/new-output.mp4 assets/media/monitor-repair-plate.png`.
