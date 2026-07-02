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
  // First visit of the session only — skip the loader on repeat / internal nav.
  let seen = false
  try { seen = sessionStorage.getItem('ag_loaded') === '1'; sessionStorage.setItem('ag_loaded', '1') } catch {}
  if (seen) { loader.remove(); return done() }
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
  const kbd = document.getElementById('kbd')
  if (!kbd) return
  // every key learns its own centre (kbd-local %, unitless) so the CSS can
  // compute per-cap specular parallax from the shared --lx/--ly light vars
  const keys = [...kbd.querySelectorAll('.key')]
  const setKeyPos = () => {
    const kw = kbd.offsetWidth || 1, kh = kbd.offsetHeight || 1
    keys.forEach((k) => {
      k.style.setProperty('--kx', ((k.offsetLeft + k.offsetWidth / 2) / kw * 100).toFixed(1))
      k.style.setProperty('--ky', ((k.offsetTop + k.offsetHeight / 2) / kh * 100).toFixed(1))
    })
  }
  setKeyPos()
  addEventListener('resize', setKeyPos)
  if (reduced) return // static board keeps the CSS default light position
  const baseX = 56, baseZ = -44
  let tx = 0, ty = 0, cxv = 0, cyv = 0
  let px = innerWidth * 0.7, py = innerHeight * 0.3 // light source (client px)
  let lx = 32, ly = 16 // smoothed light, kbd-local %
  if (finePointer) {
    addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth - 0.5)
      ty = (e.clientY / innerHeight - 0.5)
      px = e.clientX; py = e.clientY
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
      // light: cursor position mapped into the (transformed) board's box, plus
      // a slow drift so the sheet of light keeps living during idle sway.
      // Touch devices get a pure orbit — no cursor, but the glass still moves.
      let tlx, tly
      if (finePointer) {
        const r = kbd.getBoundingClientRect()
        tlx = ((px - r.left) / (r.width || 1)) * 100 + Math.sin(t * 0.5) * 6
        tly = ((py - r.top) / (r.height || 1)) * 100 + Math.cos(t * 0.42) * 6
      } else {
        tlx = 50 + Math.sin(t * 0.33) * 46
        tly = 26 + Math.cos(t * 0.26) * 30
      }
      tlx = Math.max(-50, Math.min(150, tlx)); tly = Math.max(-50, Math.min(150, tly))
      lx += (tlx - lx) * 0.08; ly += (tly - ly) * 0.08
      kbd.style.setProperty('--lx', lx.toFixed(1))
      kbd.style.setProperty('--ly', ly.toFixed(1))
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

/* ---------- TYPE ON THE KEYBOARD ----------
   The hero keyboard is a real input surface, not a prop: physical typing
   presses the matching keycaps in sync, and finishing a key's word ("gtm",
   "brand"…) or a page name ("work", "about"…) rides the page transition
   there. Only listens while the keyboard is on screen, and never steals
   keystrokes from form fields. */
function initTypeKeys() {
  const kbd = document.getElementById('kbd')
  if (!kbd) return
  const skills = [...kbd.querySelectorAll('.key--skill[data-href]')].map((k) => ({
    el: k, label: k.textContent.trim().toLowerCase(), href: k.getAttribute('data-href'),
  }))
  const symbols = new Map()
  kbd.querySelectorAll('.key--mute, .key--ghost').forEach((k) => {
    const ch = k.textContent.trim().toLowerCase()
    if (ch.length === 1) symbols.set(ch, k)
  })
  const pages = { work: '/work.html', about: '/about.html', contact: '/contact.html', resume: '/resume.html', capabilities: '/capabilities.html' }
  let visible = false
  new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0.2 }).observe(kbd)
  let buffer = '', timer = 0, navigating = false
  // longest prefix of `word` that the buffer currently ends with
  const prefixLen = (buf, word) => {
    for (let n = Math.min(buf.length, word.length); n > 0; n--) if (buf.endsWith(word.slice(0, n))) return n
    return 0
  }
  const tap = (el, hold) => {
    el.classList.add('is-press')
    setTimeout(() => el.classList.remove('is-press'), hold ? 620 : 150)
  }
  addEventListener('keydown', (e) => {
    if (!visible || navigating || e.metaKey || e.ctrlKey || e.altKey) return
    const t = e.target
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    const ch = e.key.toLowerCase()
    if (ch.length === 1 && symbols.has(ch)) { tap(symbols.get(ch)); return }
    if (!/^[a-z0-9]$/.test(ch)) { buffer = ''; return }
    clearTimeout(timer); timer = setTimeout(() => { buffer = '' }, 1400)
    buffer = (buffer + ch).slice(-14)
    let hit = null
    for (const s of skills) {
      const n = prefixLen(buffer, s.label)
      if (n === s.label.length) hit = s
      else if (n > 0) tap(s.el)
    }
    if (hit) {
      navigating = true
      tap(hit.el, true)
      setTimeout(() => navWithFx(hit.href), 430)
      return
    }
    for (const [word, href] of Object.entries(pages)) {
      if (buffer.endsWith(word)) { navigating = true; setTimeout(() => navWithFx(href), 200); return }
    }
  })
}

/* ---------- WORK FLOAT (cursor preview + hover-to-play video) ---------- */
function initWorkFloat() {
  if (!finePointer) return
  const float = document.getElementById('workFloat')
  if (!float) return
  const inner = float.querySelector('.work-float__inner')
  const tints = ['#7ecfa0', '#d7ecdf', '#3fa06e', '#dcecd8', '#6cc48f']
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

/* ---------- CHAPTER RAIL (home) ----------
   A mono "you are here" map down the left edge: the homepage reads as a
   build log (/00 thesis → /04 contact) and the rail tracks which chapter
   you're in. Fades in once you leave the hero; wide screens only (CSS). */
function initRail() {
  const rail = document.getElementById('rail')
  if (!rail) return
  const items = [...rail.querySelectorAll('.rail__item')]
  const secs = items.map((a) => document.querySelector(a.getAttribute('href')))
  const fill = document.getElementById('railFill')
  const update = () => {
    const probe = scrollY + innerHeight * 0.42
    let idx = -1
    secs.forEach((s, i) => { if (s && s.offsetTop <= probe) idx = i })
    items.forEach((a, i) => a.classList.toggle('is-active', i === idx))
    const max = document.documentElement.scrollHeight - innerHeight
    if (fill) fill.style.height = (max > 0 ? Math.min(1, scrollY / max) * 100 : 0) + '%'
    rail.classList.toggle('is-live', scrollY > innerHeight * 0.5)
  }
  addEventListener('scroll', update, { passive: true })
  addEventListener('resize', update)
  update()
}

/* ---------- STORY LINE (about) ----------
   The three-bets timeline draws a vertical line down its left edge as you
   read — the story literally progresses with you. Nodes light via is-in. */
function initStoryLine() {
  const flow = document.querySelector('.timeline__flow')
  const fill = document.getElementById('storyFill')
  if (!flow || !fill) return
  if (reduced) { fill.style.height = '100%'; return }
  const update = () => {
    const r = flow.getBoundingClientRect()
    const readLine = innerHeight * 0.7
    const p = Math.max(0, Math.min(1, (readLine - r.top) / (r.height || 1)))
    fill.style.height = (p * 100).toFixed(1) + '%'
  }
  addEventListener('scroll', update, { passive: true })
  addEventListener('resize', update)
  update()
}

/* ---------- COUNT-UP STATS ----------
   Outcome numbers earn their size by moving: on first sight they roll from
   zero to the real figure (prefix/suffix like "₹", "K+", "yrs" preserved).
   Skips ranges like "0→1" and sits out under reduced motion. */
function initCountUp() {
  if (reduced) return
  const els = [...document.querySelectorAll('.case-stats b, .about-stats b')]
  if (!els.length) return
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return
    io.unobserve(en.target)
    const el = en.target, txt = el.textContent
    if (txt.includes('→')) return
    const m = txt.match(/[0-9]+(?:\.[0-9]+)?/)
    if (!m) return
    const num = parseFloat(m[0])
    const pre = txt.slice(0, m.index), post = txt.slice(m.index + m[0].length)
    const dec = m[0].includes('.') ? 1 : 0
    const t0 = performance.now(), dur = 1100
    ;(function step(now) {
      const t = Math.min((now - t0) / dur, 1)
      const e = 1 - Math.pow(1 - t, 3)
      el.textContent = pre + (num * e).toFixed(dec) + post
      if (t < 1) requestAnimationFrame(step)
    })(t0)
  }), { threshold: 0.5 })
  els.forEach((el) => io.observe(el))
}

/* ---------- CAPABILITY RACK ----------
   The toolkit as hardware: five liquid-glass keys on a rack. Pressing one
   (click, tap, or the real 1–5 number keys / arrow keys) keeps it held
   down and swaps its discipline panel in below — description, tags, how
   to hire it, and a proof link. The rack doubles as a light rig, same as
   the hero keyboard. */
function initRack() {
  const rack = document.getElementById('rack')
  const stage = document.getElementById('rackStage')
  if (!rack || !stage) return
  const keys = [...rack.querySelectorAll('.rack-key')]
  const panels = [...stage.querySelectorAll('.cap-panel')]
  const select = (id, focusKey) => {
    keys.forEach((k) => {
      const on = k.dataset.cap === id
      k.classList.toggle('is-on', on)
      k.setAttribute('aria-selected', String(on))
      k.tabIndex = on ? 0 : -1
      if (on) {
        stage.style.setProperty('--kc', getComputedStyle(k).getPropertyValue('--kc'))
        if (focusKey) k.focus()
      }
    })
    panels.forEach((p) => {
      const on = p.dataset.cap === id
      if (on) { p.classList.remove('is-live'); void p.offsetWidth; p.classList.add('is-live') }
      p.classList.toggle('is-on', on)
      p.setAttribute('aria-hidden', String(!on))
    })
  }
  keys.forEach((k) => {
    k.addEventListener('click', () => { select(k.dataset.cap); k.blur() })
  })
  // physical keys: 1–5 select directly, arrows walk the rack
  let visible = false
  new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0.15 }).observe(rack)
  addEventListener('keydown', (e) => {
    if (!visible || e.metaKey || e.ctrlKey || e.altKey) return
    const t = e.target
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    const n = parseInt(e.key, 10)
    if (n >= 1 && n <= keys.length) { select(keys[n - 1].dataset.cap); return }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const cur = keys.findIndex((k) => k.classList.contains('is-on'))
      const next = (cur + (e.key === 'ArrowRight' ? 1 : keys.length - 1)) % keys.length
      select(keys[next].dataset.cap, true)
      e.preventDefault()
    }
  })
  // light rig for the rack's caps
  rack.addEventListener('pointermove', (e) => {
    const r = rack.getBoundingClientRect()
    rack.style.setProperty('--lx', ((e.clientX - r.left) / (r.width || 1) * 100).toFixed(1))
    rack.style.setProperty('--ly', ((e.clientY - r.top) / (r.height || 1) * 100).toFixed(1))
  }, { passive: true })
  select('design')
}

/* ---------- CONTACT COMPOSER (the last key) ----------
   The contact page is one giant keycap away from an email. Picking an
   intent chip types the matching draft into the terminal (typewriter, with
   the [placeholders] highlighted); pressing the giant SEND key — or the
   real Enter key — crushes the cap and opens the draft in the visitor's
   mail app. ?role/?sprint/?gtm deep links pre-select the intent. The
   send-stage doubles as a light rig: pointer position feeds --lx/--ly so
   the glass caps' rims and speculars track the cursor, and the floating
   keys parallax at their own depths (--fd). */
function initComposer() {
  const stage = document.getElementById('sendStage')
  const key = document.getElementById('sendKey')
  const subjEl = document.getElementById('termSubject')
  const bodyEl = document.getElementById('termBody')
  if (!stage || !key || !subjEl || !bodyEl) return
  const MAIL = 'anuraggautamsharma@gmail.com'
  const drafts = {
    role: { subject: 'Hiring: [role] at [company]', body: "Hi Anurag,\n\nWe're hiring a [role] at [company] and your profile fits.\nSharing the JD — would love to talk.\n\n[Your name]" },
    sprint: { subject: '0→1 Launch Sprint: [project]', body: "Hi Anurag,\n\nI want to take [idea] from zero to in-market —\ndesigned, built and launched. Can we scope a sprint?\n\n[Your name]" },
    gtm: { subject: 'GTM help: [company]', body: "Hi Anurag,\n\nWe need pipeline at [company] — our ICP is roughly [who].\nCan we talk GTM?\n\n[Your name]" },
    other: { subject: 'Hello from [your name]', body: "Hi Anurag,\n\n[Whatever's on your mind — I read everything.]\n\n[Your name]" },
  }
  const CARET = '<span class="term__caret" aria-hidden="true"></span>'
  const hl = (t) => t.replace(/\[([^\]]*)\]/g, '<b class="hl">[$1]</b>')
  let current = 'role', timer = 0
  const render = (id) => {
    current = id
    document.querySelectorAll('[data-intent-chips] .intent__chip').forEach((c) => c.classList.toggle('is-on', c.dataset.intent === id))
    const d = drafts[id]
    clearInterval(timer)
    subjEl.innerHTML = hl(d.subject)
    if (reduced) { bodyEl.innerHTML = hl(d.body) + CARET; return }
    let i = 0
    bodyEl.innerHTML = CARET
    timer = setInterval(() => {
      i += 2
      bodyEl.innerHTML = hl(d.body.slice(0, i)) + CARET
      if (i >= d.body.length) clearInterval(timer)
    }, 22)
  }
  document.querySelectorAll('[data-intent-chips] .intent__chip').forEach((c) => {
    // blur after picking so a follow-up Enter fires the SEND key (the flow
    // the hint promises), not a re-click of the still-focused chip
    c.addEventListener('click', () => { render(c.dataset.intent); c.blur() })
  })
  const send = () => {
    key.classList.add('is-press')
    setTimeout(() => key.classList.remove('is-press'), 420)
    const d = drafts[current]
    setTimeout(() => {
      window.location.href = `mailto:${MAIL}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`
    }, reduced ? 0 : 340)
  }
  key.addEventListener('click', send)
  key.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); send() } })
  addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.metaKey || e.ctrlKey || e.altKey) return
    const t = e.target
    if (t && (t.tagName === 'A' || t.tagName === 'BUTTON' || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SUMMARY' || t.isContentEditable)) return
    send()
  })
  // light rig + parallax
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect()
    stage.style.setProperty('--lx', ((e.clientX - r.left) / (r.width || 1) * 100).toFixed(1))
    stage.style.setProperty('--ly', ((e.clientY - r.top) / (r.height || 1) * 100).toFixed(1))
  }, { passive: true })
  if (finePointer && !reduced) {
    addEventListener('pointermove', (e) => {
      stage.style.setProperty('--px', ((e.clientX / innerWidth - 0.5) * 24).toFixed(1) + 'px')
      stage.style.setProperty('--py', ((e.clientY / innerHeight - 0.5) * 18).toFixed(1) + 'px')
    }, { passive: true })
  }
  const q = location.search.toLowerCase()
  render(q.includes('sprint') ? 'sprint' : q.includes('gtm') ? 'gtm' : q.includes('role') ? 'role' : 'role')
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
  // process keys press like keycaps on every device (tap included)
  document.querySelectorAll('.process__key').forEach((k) => {
    k.addEventListener('pointerdown', () => k.classList.add('is-down'))
    k.addEventListener('pointerup', () => k.classList.remove('is-down'))
    k.addEventListener('pointerleave', () => k.classList.remove('is-down'))
  })
  if (!finePointer || reduced) return
  document.querySelectorAll('a.work-card, .service, .process__key, .about-portrait').forEach((card) => {
    const tilt = card.classList.contains('work-card') || card.classList.contains('about-portrait')
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

/* ---------- PROCESS SELF-DEMO ----------
   the method demos itself: the first time the process grid scrolls into
   view, the three keys press themselves in order — 01, 02, 03 — like a
   hand walking the keyboard. Runs once; sits out under reduced motion. */
function initProcessDemo() {
  if (reduced) return
  const keys = [...document.querySelectorAll('.process__key')]
  if (!keys.length) return
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return
    io.disconnect()
    keys.forEach((k, i) => {
      setTimeout(() => k.classList.add('is-down'), 450 + i * 360)
      setTimeout(() => k.classList.remove('is-down'), 450 + i * 360 + 240)
    })
  }, { threshold: 0.55 })
  io.observe(keys[0].parentElement)
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
/* ---------- COVER IMAGES ----------
   Graceful, drop-in project covers: any element with data-cover preloads that
   image; only if it actually loads do we apply it. Drop a file at the path and
   it lights up on next visit — no broken images, no markup churn if it's absent.
   work cards get a background + scrim; case-study heroes get a real <img> (alt). */
function initCovers() {
  document.querySelectorAll('[data-cover]').forEach((el) => {
    const src = el.getAttribute('data-cover')
    if (!src) return
    const probe = new Image()
    probe.onload = () => {
      if (el.classList.contains('case-cover')) {
        const img = document.createElement('img')
        img.className = 'case-cover__img'
        img.src = src
        img.alt = el.getAttribute('data-alt') || ''
        el.appendChild(img)
        el.classList.add('has-cover')
      } else if (el.classList.contains('frame')) {
        el.style.backgroundImage = `url("${src}")`
        el.classList.add('has-cover')
        const wrap = el.closest('[data-frames]'); if (wrap) wrap.hidden = false
      } else {
        el.style.backgroundImage = `url("${src}")`
        el.classList.add('work-card--cover')
      }
    }
    probe.src = src
  })
}

function boot() {
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear()
  initScroll(); initTransition(); initKeyboard(); initKeycaps(); initTypeKeys(); initRail(); initStoryLine(); initCountUp(); initWorkFloat(); initScrollFill(); initMarquees(); initReveals(); initNav(); initCopyMail(); initComposer(); initRack(); initGlassCards(); initProcessDemo(); initMagnetic(); initCovers()
}
addEventListener('DOMContentLoaded', () => { runLoader(boot) })
