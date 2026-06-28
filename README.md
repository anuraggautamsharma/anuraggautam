# Anurag Gautam — Portfolio

High-contrast brutalist personal site. Mono palette + one acid accent, oversized kinetic
type, an interactive WebGL particle hero, and glitch/scramble motion. Single long-scroll
home page plus three deep case-study pages (Suggaa, Srijan, The PipelineLab).

## Stack
- **Vite** (multi-page) — vanilla, no framework
- **Three.js** — interactive noise-displaced particle object in the hero (reacts to cursor)
- **Lenis** — smooth scroll
- **GSAP** — hero intro timeline
- Custom: cursor, magnetic buttons, text-scramble reveals, kinetic marquees, tilt

## Run
```bash
npm install
npm run dev        # local dev
npm run build      # production build → dist/
npm run preview    # preview the build
```

## Deploy (Vercel)
Push the repo and import it in Vercel. `vercel.json` sets the build command (`npm run build`),
output (`dist`) and `cleanUrls` (so `/work/suggaa` works). No env vars needed.

## Project structure
```
index.html              # home (all sections)
work/suggaa.html        # case study
work/srijan.html        # case study
work/pipelinelab.html   # case study
src/main.js             # home JS (loader, scroll, cursor, hero, marquees…)
src/case.js             # lighter JS for case pages (no Three.js)
src/three/hero.js       # WebGL particle hero
src/styles/main.css     # design tokens + all home styles
src/styles/case.css     # case-study styles (imports main.css)
public/                 # favicon.svg, portrait.svg, og.svg
```

## ⚠️ Before you ship — replace these
Search the codebase for these and swap in real values:

1. **Headshot** — drop `public/portrait.jpg` (≈900×1100). The `<img>` in the About
   section points at `/portrait.svg`; change it to `/portrait.jpg`.
2. **Social links** — `index.html` Content + Contact sections have `href="#"` on
   Instagram / YouTube / LinkedIn. Add real URLs.
3. **Dates** — `[year]`, `[2018]`, `[2023]`, `[N]` placeholders in the timeline,
   case-study meta, and Suggaa stats.
4. **Email** — currently `anuraggautamsharma@gmail.com` everywhere. Swap to
   `anurag@anuraggautam.com` if you prefer the domain address.
5. **Project images** — the work thumbnails and case-study galleries use CSS placeholder
   blocks (`.ph`). Replace with real `<img>`/`<video>` (e.g. Srijan's AI ad →
   `public/srijan-ad.mp4`).
6. **Case-study outcomes** — each case page has a `[bracketed]` line where a real
   number/result should go.
7. **OG image** — `public/og.svg` is a placeholder. For best link previews, export a
   1200×630 PNG and point the `og:image` / `twitter:image` tags at it.
8. **Analytics** — add your privacy-light snippet (e.g. Vercel Analytics, Plausible)
   to `index.html`.
9. **Domain** — update the `canonical` / `og:url` in each page's `<head>`.

## Accessibility / performance
Responsive to mobile, visible keyboard focus, skip-link, semantic landmarks, alt text,
`prefers-reduced-motion` honored (3D slows, scramble/marquees stop), fonts load with
`display=swap`. Three.js loads only on the home page; case pages are ~2 KB JS.
