# Anurag Gautam — Portfolio

Light, refined & playful **multipage** portfolio (inspired by the feel of
kkapustin.com). Warm-grey canvas, elegant serif (Playfair Display) + clean grotesque
(Inter), a single lime accent, and tactile interaction: an interactive lime keycap
cluster that tilts with your cursor and links to sections, a scroll-fill thesis line,
cursor-following work previews, serif/sans marquees and page-transition wipes. Fast,
no heavy 3D.

## Pages
- `/` — Home (hero, thesis, proof, featured work, services, contact)
- `/work.html` — all 8 projects
- `/about.html` — story, track record, in-public
- `/capabilities.html` — the five disciplines
- `/contact.html` — contact, availability, CV
- `/work/suggaa.html`, `/work/srijan.html`, `/work/pipelinelab.html` — case studies

## Stack
- **Vite** (multipage) — vanilla, no framework
- **Lenis** — smooth scroll
- One shared module `src/site.js` + one stylesheet `src/styles/site.css` used by every
  page: loader, page-transition wipe, custom cursor, marquees, scroll reveals, nav.

## Run
```bash
npm install
npm run dev        # local dev
npm run build      # production build → dist/
npm run preview    # preview the build
```

## Deploy (Vercel)
Push and import in Vercel. `vercel.json` sets build (`npm run build`), output (`dist`)
and `cleanUrls`. Internal links use explicit `.html` paths so they work in dev, preview
and production alike. No env vars needed.

## Structure
```
index.html / work.html / about.html / contact.html   # top-level pages
work/suggaa.html · srijan.html · pipelinelab.html     # case studies
src/site.js          # shared JS for every page
src/styles/site.css  # design system + all page styles
public/              # favicon.svg, portrait.svg, og.svg
```

## ⚠️ Before you ship — replace these
1. **Headshot** — drop `public/portrait.jpg` and point the About `<img>` (`/portrait.svg`) at it.
2. **Social links** — Instagram / YouTube / LinkedIn are `href="#"` in the footers and on
   About/Contact. Add real URLs.
3. **Dates** — `[year]`, `[2018]`, `[2023]`, `[N]` placeholders in the timeline and case meta.
4. **Email** — `anuraggautamsharma@gmail.com` everywhere; swap if you prefer the domain address.
5. **Project visuals** — work cards and case galleries use neon gradient placeholder blocks
   (`.ph`). Replace with real `<img>`/`<video>` (e.g. Srijan's ad → `public/srijan-ad.mp4`).
6. **Case-study outcomes** — each case page has a `[bracketed]` line for a real number.
7. **OG image** — `public/og.svg` is a placeholder; export a 1200×630 PNG for best previews.
8. **Analytics** — add a privacy-light snippet (Vercel Analytics / Plausible).

## Accessibility / performance
Responsive, visible keyboard focus, skip links, semantic landmarks, alt text, and
`prefers-reduced-motion` honored (gradients/marquees/transitions calm down). Motion is
CSS-driven (cheap) — no WebGL, no per-frame layout reads.
