import './styles/site.css'
import Lenis from 'lenis'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches

/* ---------- LOADER (home only) ----------
   the craft, spoken: words flip through the disciplines and land on the name
   as the bar fills — not a cliché 0–100 counter */
function runLoader(done) {
  const loader = document.getElementById('loader')
  if (!loader) return done()
  const word = document.getElementById('loaderWord')
  const bar = document.getElementById('loaderBar')
  const words = ['Product', 'Motion', 'Content', 'GTM', 'Vibe code', 'Anurag Gautam']
  const dur = reduced ? 280 : 1150
  const start = performance.now()
  let lastIdx = -1
  function step(now) {
    const t = Math.min((now - start) / dur, 1)
    const e = 1 - Math.pow(1 - t, 3)
    if (bar) bar.style.width = e * 100 + '%'
    const idx = Math.min(words.length - 1, Math.floor(e * words.length))
    if (word && idx !== lastIdx) {
      lastIdx = idx
      word.textContent = words[idx]
      word.classList.toggle('is-name', idx === words.length - 1)
      word.classList.remove('is-flip'); void word.offsetWidth; word.classList.add('is-flip')
    }
    if (t < 1) requestAnimationFrame(step)
    else { loader.classList.add('is-done'); setTimeout(done, reduced ? 0 : 380) }
  }
  requestAnimationFrame(step)
}

/* destination-aware label for the page-transition wipe */
function pageLabel(href) {
  try {
    const p = (new URL(href, location.origin).pathname).replace(/\/+$/, '') || '/'
    if (p === '/' || p.endsWith('/index.html')) return 'Home'
    if (p.startsWith('/work/')) return 'Case study'
    const name = p.split('/').pop().replace('.html', '')
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch { return '' }
}
function setFxLabel(href) {
  const sp = document.querySelector('#pageFx span')
  if (sp) sp.textContent = pageLabel(href)
}

/* ---------- PAGE TRANSITION ---------- */
let lenis
function initTransition() {
  const fx = document.getElementById('pageFx')
  if (fx) requestAnimationFrame(() => requestAnimationFrame(() => fx.classList.add('is-open')))
  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href')
    if (!href) return
    const isHash = href.startsWith('#')
    const isExternal = /^(https?:|mailto:|tel:)/.test(href)
    if (isExternal || a.target === '_blank') return
    a.addEventListener('click', (e) => {
      if (isHash) {
        const el = document.querySelector(href)
        if (el && lenis) { e.preventDefault(); lenis.scrollTo(el, { offset: -10 }); closeMenu() }
        return
      }
      if (e.metaKey || e.ctrlKey || e.shiftKey) return
      if (!fx || reduced) return
      e.preventDefault(); closeMenu()
      setFxLabel(href)
      fx.classList.remove('is-open')
      fx.style.transition = 'none'; fx.style.transform = 'translateY(100%)'
      void fx.offsetWidth
      fx.style.transition = ''; fx.style.transform = 'translateY(0)'
      setTimeout(() => { window.location.href = href }, 600)
    })
  })
}

/* ---------- SMOOTH SCROLL ---------- */
function initScroll() {
  if (reduced) return
  lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true })
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf) }
  requestAnimationFrame(raf)
}

/* ---------- HAND CURSOR ---------- */
function initCursor() {
  if (!finePointer) return
  const cur = document.getElementById('cursor')
  const label = document.getElementById('cursorLabel')
  if (!cur) return
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY }, { passive: true })
  addEventListener('pointerdown', () => cur.classList.add('is-down'))
  addEventListener('pointerup', () => cur.classList.remove('is-down'))
  ;(function loop() {
    cx += (x - cx) * 0.25; cy += (y - cy) * 0.25
    cur.style.left = cx + 'px'; cur.style.top = cy + 'px'
    requestAnimationFrame(loop)
  })()
  document.querySelectorAll('a, button, [data-cursor], .work-card, .proof__cell, .key').forEach((el) => {
    el.addEventListener('pointerenter', () => { cur.classList.add('is-hover'); if (label) label.textContent = el.getAttribute('data-cursor') || '' })
    el.addEventListener('pointerleave', () => { cur.classList.remove('is-hover'); if (label) label.textContent = '' })
  })
}

/* ---------- KEYBOARD PARALLAX TILT ----------
   Runs on every device. Fine-pointer adds cursor-follow; touch devices (no
   cursor) get a larger always-on idle sway so the slab still feels alive.
   Pauses when scrolled out of view to spare the battery on phones. */
function initKeyboard() {
  if (reduced) return
  const kbd = document.getElementById('kbd')
  if (!kbd) return
  const baseX = 56, baseZ = -44
  let tx = 0, ty = 0, cxv = 0, cyv = 0
  if (finePointer) {
    addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth - 0.5)
      ty = (e.clientY / innerHeight - 0.5)
    }, { passive: true })
  }
  const amp = finePointer ? 1 : 1.7 // touch has no cursor — sway harder
  let visible = true
  new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 }).observe(kbd)
  const t0 = performance.now()
  function loop(now) {
    if (visible) {
      const t = (now - t0) / 1000
      cxv += (tx - cxv) * 0.1
      cyv += (ty - cyv) * 0.1
      const swayX = (Math.sin(t * 0.7) * 1.5 + Math.sin(t * 0.27) * 0.8) * amp
      const swayZ = (Math.cos(t * 0.55) * 1.7 + Math.sin(t * 0.19) * 0.9) * amp
      const float = Math.sin(t * 0.9) * 6 * amp
      const rx = baseX - cyv * 12 + swayX
      const rz = baseZ + cxv * 12 + swayZ
      kbd.style.transform = `rotateX(${rx}deg) rotateZ(${rz}deg) translate3d(${cxv * 34}px, ${cyv * 30 + float}px, 0)`
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

/* ---------- INTERACTIVE KEYCAPS ---------- */
function navWithFx(href) {
  const fx = document.getElementById('pageFx')
  if (!fx || reduced) { window.location.href = href; return }
  setFxLabel(href)
  fx.classList.remove('is-open')
  fx.style.transition = 'none'; fx.style.transform = 'translateY(100%)'
  void fx.offsetWidth
  fx.style.transition = ''; fx.style.transform = 'translateY(0)'
  setTimeout(() => { window.location.href = href }, 600)
}
function initKeycaps() {
  document.querySelectorAll('.key[data-href]').forEach((k) => {
    k.addEventListener('pointerdown', () => k.classList.add('is-press'))
    k.addEventListener('pointerup', () => k.classList.remove('is-press'))
    k.addEventListener('pointerleave', () => k.classList.remove('is-press'))
    k.addEventListener('click', () => navWithFx(k.getAttribute('data-href')))
  })
}

/* ---------- WORK FLOAT (cursor preview + hover-to-play video) ---------- */
function initWorkFloat() {
  if (!finePointer) return
  const float = document.getElementById('workFloat')
  if (!float) return
  const inner = float.querySelector('.work-float__inner')
  const tints = ['#c2f23c', '#dff5a0', '#a6d62e', '#e7eec0', '#cfe72e']
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, active = false
  document.querySelectorAll('a.work-card').forEach((card, i) => {
    card.addEventListener('pointerenter', () => {
      const v = card.dataset.video, m = card.dataset.media
      const label = (card.querySelector('.work-card__name')?.firstChild?.textContent || '').trim()
      inner.innerHTML = v
        ? `<video src="${v}" muted loop autoplay playsinline></video>`
        : m ? `<img src="${m}" alt="">` : `<span class="label">${label}</span>`
      inner.style.background = (v || m) ? '#000' : tints[i % tints.length]
      float.classList.add('is-visible'); active = true
    })
    card.addEventListener('pointerleave', () => {
      float.classList.remove('is-visible'); active = false
      setTimeout(() => { if (!active) inner.innerHTML = '' }, 320)
    })
  })
  addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY }, { passive: true })
  ;(function loop() {
    x += (tx - x) * 0.16; y += (ty - y) * 0.16
    float.style.left = x + 'px'; float.style.top = y + 'px'
    requestAnimationFrame(loop)
  })()
}

/* ---------- MARQUEES ---------- */
function initMarquees() {
  const tracks = document.querySelectorAll('.marquee__track')
  if (!tracks.length || reduced) return
  let vel = 0
  if (lenis) lenis.on('scroll', ({ velocity }) => { vel = velocity })
  tracks.forEach((track) => {
    track.innerHTML += track.innerHTML
    let x = 0, last = 0, period = 0
    // exact tile period = start-to-start of the two copies. This includes the
    // flex gap between them; scrollWidth/2 split that single seam gap in half
    // and made the loop jump ~gap/2 px every cycle. Re-measure on resize and
    // once web fonts land (a late font swap changes the text width).
    const measure = () => {
      const a = track.children[0], b = track.children[1]
      period = b ? b.offsetLeft - a.offsetLeft : track.scrollWidth / 2
    }
    measure()
    addEventListener('resize', measure)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure)
    const dir = track.dataset.dir === 'rev' ? 1 : -1
    function loop(now) {
      requestAnimationFrame(loop)
      if (!last) last = now           // first frame: dt = 0, no startup jump
      const dt = Math.min((now - last) / 16.67, 3); last = now
      x += dir * (0.6 + Math.abs(vel) * 0.25) * dt
      if (period) { if (x <= -period) x += period; if (x >= 0) x -= period }
      track.style.transform = `translate3d(${x}px,0,0)`
    }
    requestAnimationFrame(loop)
  })
}

/* ---------- SCROLL-FILL THESIS ---------- */
function initScrollFill() {
  const el = document.querySelector('.intro__text')
  if (!el) return
  const words = [...el.querySelectorAll('.w')]
  if (reduced) { words.forEach((w) => w.classList.add('is-on')); return }
  function update() {
    const r = el.getBoundingClientRect()
    const readLine = innerHeight * 0.72
    const p = Math.max(0, Math.min(1, (readLine - r.top) / (r.height || 1)))
    const n = Math.round(p * words.length)
    for (let i = 0; i < words.length; i++) words[i].classList.toggle('is-on', i < n)
  }
  if (lenis) lenis.on('scroll', update); else addEventListener('scroll', update, { passive: true })
  addEventListener('resize', update)
  update()
}

/* ---------- REVEALS ---------- */
function initReveals() {
  const els = [...document.querySelectorAll('[data-reveal]')]
  const ro = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target) }
  }), { threshold: 0.12, rootMargin: '0px 0px -7% 0px' })
  els.forEach((el) => ro.observe(el))
  // safety net: if the observer never fires (e.g. odd device/headless), make
  // sure nothing stays invisible after a few seconds
  setTimeout(() => els.forEach((el) => el.classList.add('is-in')), 4000)
}

/* ---------- NAV ---------- */
const nav = document.getElementById('nav')
const mobileMenu = document.getElementById('mobileMenu')
function closeMenu() {
  nav?.classList.remove('is-open'); mobileMenu?.classList.remove('is-open')
  document.getElementById('navToggle')?.setAttribute('aria-expanded', 'false')
}
function initNav() {
  let lastY = 0
  const onScroll = (yPos) => {
    nav?.classList.toggle('is-scrolled', yPos > 24)
    if (yPos > lastY && yPos > 500) nav?.classList.add('is-hidden')
    else nav?.classList.remove('is-hidden')
    lastY = yPos
  }
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll))
  else addEventListener('scroll', () => onScroll(scrollY), { passive: true })
  const toggle = document.getElementById('navToggle')
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open')
    mobileMenu?.classList.toggle('is-open', open)
    toggle.setAttribute('aria-expanded', String(open))
  })
  document.getElementById('backTop')?.addEventListener('click', () => {
    if (lenis) lenis.scrollTo(0); else scrollTo({ top: 0, behavior: 'smooth' })
  })
}

/* ---------- COPY EMAIL ---------- */
function initCopyMail() {
  document.querySelectorAll('[data-copy-mail]').forEach((mail) => {
    mail.addEventListener('click', (e) => {
      if (!navigator.clipboard) return
      e.preventDefault()
      const addr = mail.getAttribute('data-copy-mail')
      navigator.clipboard.writeText(addr).then(() => {
        const old = mail.textContent
        mail.textContent = 'Copied ✓'
        setTimeout(() => { mail.textContent = old }, 1300)
      }).catch(() => { window.location.href = 'mailto:' + addr })
    })
  })
}

/* ---------- POINTER-REACTIVE GLASS CARDS ----------
   shares the hero keyboard's DNA: work cards tilt in 3D toward the cursor and
   their glass reflection follows the pointer; service cards get a lime
   spotlight that tracks the cursor. Pointer position is published as --mx/--my
   (percent) and consumed by the card's ::before in CSS. */
function initGlassCards() {
  if (!finePointer || reduced) return
  document.querySelectorAll('a.work-card, .service').forEach((card) => {
    const tilt = card.classList.contains('work-card')
    let raf = 0, mx = 50, my = 50, rx = 0, ry = 0
    function apply() {
      raf = 0
      card.style.setProperty('--mx', mx.toFixed(1) + '%')
      card.style.setProperty('--my', my.toFixed(1) + '%')
      if (tilt) card.style.transform = `perspective(1000px) rotateY(${rx.toFixed(2)}deg) rotateX(${ry.toFixed(2)}deg) translateY(-8px)`
    }
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      mx = px * 100; my = py * 100
      if (tilt) { rx = (px - 0.5) * 9; ry = -(py - 0.5) * 9 }
      if (!raf) raf = requestAnimationFrame(apply)
    }, { passive: true })
    card.addEventListener('pointerleave', () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0 }
      card.style.setProperty('--mx', '28%'); card.style.setProperty('--my', '10%')
      if (tilt) card.style.transform = ''
    })
  })
}

/* ---------- MAGNETIC ELEMENTS ----------
   subtly lean toward the cursor while hovered (footer email, primary CTAs) */
function initMagnetic() {
  if (!finePointer || reduced) return
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    let raf = 0, tx = 0, ty = 0
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect()
      tx = (e.clientX - (r.left + r.width / 2)) * 0.3
      ty = (e.clientY - (r.top + r.height / 2)) * 0.3
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)` })
    }, { passive: true })
    el.addEventListener('pointerleave', () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0 }
      el.style.transform = ''
    })
  })
}

/* ---------- BOOT ---------- */
function boot() {
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear()
  initScroll(); initTransition(); initKeyboard(); initKeycaps(); initWorkFloat(); initScrollFill(); initMarquees(); initReveals(); initNav(); initCopyMail(); initGlassCards(); initMagnetic()
}
addEventListener('DOMContentLoaded', () => { runLoader(boot) })
