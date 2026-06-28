import './styles/main.css'
import Lenis from 'lenis'
import gsap from 'gsap'
import { initHero } from './three/hero.js'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches

/* ============================================================
   LOADER  — brutalist count to 100, then reveal
   ============================================================ */
function runLoader(onDone) {
  const loader = document.getElementById('loader')
  const count = document.getElementById('loaderCount')
  const bar = document.getElementById('loaderBar')
  if (!loader) return onDone()

  let n = 0
  const dur = reduced ? 300 : 1100
  const start = performance.now()
  function step(now) {
    const t = Math.min((now - start) / dur, 1)
    n = Math.floor((1 - Math.pow(1 - t, 3)) * 100)
    count.textContent = String(n).padStart(3, '0')
    bar.style.width = n + '%'
    if (t < 1) requestAnimationFrame(step)
    else {
      loader.classList.add('is-done')
      setTimeout(onDone, reduced ? 0 : 450)
    }
  }
  requestAnimationFrame(step)
}

/* ============================================================
   SMOOTH SCROLL (Lenis)
   ============================================================ */
let lenis
function initScroll() {
  if (reduced) return
  lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true })
  function raf(time) { lenis.raf(time); requestAnimationFrame(raf) }
  requestAnimationFrame(raf)

  // anchor links go through Lenis
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href')
      if (id === '#' || id.length < 2) return
      const el = document.querySelector(id)
      if (!el) return
      e.preventDefault()
      lenis.scrollTo(el, { offset: -20 })
      closeMenu()
    })
  })
}

/* ============================================================
   CUSTOM CURSOR
   ============================================================ */
function initCursor() {
  if (!hasFinePointer) return
  const cur = document.getElementById('cursor')
  const label = document.getElementById('cursorLabel')
  let x = window.innerWidth / 2, y = window.innerHeight / 2
  let cx = x, cy = y
  window.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY }, { passive: true })
  function loop() {
    cx += (x - cx) * 0.2; cy += (y - cy) * 0.2
    cur.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`
    requestAnimationFrame(loop)
  }
  loop()

  document.querySelectorAll('[data-cursor]').forEach((el) => {
    el.addEventListener('pointerenter', () => {
      const txt = el.getAttribute('data-cursor')
      cur.classList.add('is-hover')
      label.textContent = txt || ''
    })
    el.addEventListener('pointerleave', () => {
      cur.classList.remove('is-hover')
      label.textContent = ''
    })
  })
}

/* ============================================================
   MAGNETIC BUTTONS
   ============================================================ */
function initMagnetic() {
  if (!hasFinePointer) return
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = 0.35
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect()
      const mx = e.clientX - (r.left + r.width / 2)
      const my = e.clientY - (r.top + r.height / 2)
      el.style.transform = `translate(${mx * strength}px, ${my * strength}px)`
    })
    el.addEventListener('pointerleave', () => { el.style.transform = '' })
  })
}

/* ============================================================
   SCRAMBLE TEXT on reveal
   ============================================================ */
const GLYPHS = '█▓▒░<>/\\[]{}=+*#@%&01'
function scramble(el) {
  if (reduced) return
  const targets = el.querySelectorAll('span, em')
  const nodes = targets.length ? targets : [el]
  nodes.forEach((node) => {
    const final = node.textContent
    if (!final.trim()) return
    let frame = 0
    const total = 14 + Math.floor(Math.random() * 8)
    const reveal = final.split('').map(() => Math.floor(Math.random() * total))
    const id = setInterval(() => {
      node.textContent = final.split('').map((ch, i) => {
        if (ch === ' ') return ' '
        if (frame >= reveal[i]) return ch
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      }).join('')
      frame++
      if (frame > total) { clearInterval(id); node.textContent = final }
    }, 30)
  })
}

/* ============================================================
   REVEAL + SCRAMBLE OBSERVERS
   ============================================================ */
function initReveals() {
  const ro = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target) }
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
  document.querySelectorAll('[data-reveal]').forEach((el) => ro.observe(el))

  const so = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { scramble(e.target); so.unobserve(e.target) }
    })
  }, { threshold: 0.4 })
  document.querySelectorAll('[data-scramble]').forEach((el) => so.observe(el))
}

/* ============================================================
   HERO INTRO
   ============================================================ */
function heroIntro() {
  const lines = document.querySelectorAll('.hero__title .line > span')
  if (!lines.length) return
  gsap.set(lines, { yPercent: 110 })
  gsap.to(lines, {
    yPercent: 0, duration: reduced ? 0.01 : 1.1, ease: 'expo.out', stagger: 0.09, delay: 0.1,
  })
  gsap.from('.hero__eyebrow, .hero__sub, .hero__cta, .hero__scroll', {
    opacity: 0, y: 24, duration: reduced ? 0.01 : 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.4,
  })
}

/* ============================================================
   KINETIC MARQUEES (proof bar + studio bg) tied to scroll
   ============================================================ */
function initMarquees() {
  const proof = document.querySelector('.proof__track')
  const bg = document.querySelector('[data-marquee]')
  let proofX = 0, bgX = 0, last = 0, vel = 0
  if (lenis) lenis.on('scroll', ({ velocity }) => { vel = velocity })

  function loop(now) {
    const dt = Math.min((now - last) / 16.67, 3) || 1
    last = now
    const base = reduced ? 0 : 0.6
    const extra = Math.abs(vel) * 0.25
    if (proof) {
      proofX -= (base + extra) * dt
      const half = proof.scrollWidth / 2
      if (-proofX >= half) proofX += half
      proof.style.transform = `translate3d(${proofX}px,0,0)`
    }
    if (bg) {
      bgX -= (base * 0.7 + extra * 0.6) * dt
      const w = bg.scrollWidth / 2
      if (-bgX >= w) bgX += w
      bg.style.transform = `translate3d(${bgX}px,0,0)`
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

/* ============================================================
   NAV  — hide on scroll down, show on up + mobile menu
   ============================================================ */
const nav = document.getElementById('nav')
const mobileMenu = document.getElementById('mobileMenu')
function closeMenu() {
  nav?.classList.remove('is-open')
  mobileMenu?.classList.remove('is-open')
  document.getElementById('navToggle')?.setAttribute('aria-expanded', 'false')
}
function initNav() {
  let lastY = 0
  const onScroll = (y) => {
    if (y > lastY && y > 400) nav.classList.add('is-hidden')
    else nav.classList.remove('is-hidden')
    lastY = y
  }
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll))
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true })

  const toggle = document.getElementById('navToggle')
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open')
    mobileMenu.classList.toggle('is-open', open)
    toggle.setAttribute('aria-expanded', String(open))
  })
  mobileMenu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu))

  document.getElementById('backTop')?.addEventListener('click', () => {
    if (lenis) lenis.scrollTo(0); else window.scrollTo({ top: 0, behavior: 'smooth' })
  })
}

/* ============================================================
   TILT on featured thumbs
   ============================================================ */
function initTilt() {
  if (!hasFinePointer) return
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width - 0.5
      const py = (e.clientY - r.top) / r.height - 0.5
      el.style.transform = `perspective(700px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg)`
    })
    el.addEventListener('pointerleave', () => { el.style.transform = '' })
  })
}

/* ============================================================
   COPY EMAIL on click of contact mail
   ============================================================ */
function initCopyMail() {
  const mail = document.querySelector('.contact__mail')
  mail?.addEventListener('click', (e) => {
    if (!navigator.clipboard) return
    e.preventDefault()
    navigator.clipboard.writeText('anuraggautamsharma@gmail.com').then(() => {
      const old = mail.textContent
      mail.textContent = 'Copied ✓'
      setTimeout(() => { mail.textContent = old }, 1400)
    }).catch(() => { window.location.href = mail.getAttribute('href') })
  })
}

/* ============================================================
   BOOT
   ============================================================ */
function boot() {
  document.getElementById('year').textContent = new Date().getFullYear()
  initScroll()
  initCursor()
  initMagnetic()
  initReveals()
  initTilt()
  initNav()
  initMarquees()
  initCopyMail()
  if (!window.__NOGL__) {
    const destroyHero = initHero(document.getElementById('heroCanvas'))
    window.addEventListener('beforeunload', () => destroyHero && destroyHero())
  }
}

window.addEventListener('DOMContentLoaded', () => {
  runLoader(() => { boot(); heroIntro() })
})
