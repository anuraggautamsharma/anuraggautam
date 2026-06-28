import './styles/main.css'
import Lenis from 'lenis'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches

/* ---------- LOADER ---------- */
function runLoader(onDone) {
  const loader = document.getElementById('loader')
  const count = document.getElementById('loaderCount')
  const bar = document.getElementById('loaderBar')
  if (!loader) return onDone()
  const dur = reduced ? 250 : 900
  const start = performance.now()
  function step(now) {
    const t = Math.min((now - start) / dur, 1)
    const n = Math.floor((1 - Math.pow(1 - t, 3)) * 100)
    count.textContent = n
    bar.style.width = n + '%'
    if (t < 1) requestAnimationFrame(step)
    else { loader.classList.add('is-done'); setTimeout(onDone, reduced ? 0 : 350) }
  }
  requestAnimationFrame(step)
}

/* ---------- SMOOTH SCROLL ---------- */
let lenis
function initScroll() {
  if (reduced) return
  lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true })
  const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf) }
  requestAnimationFrame(raf)
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href')
      if (id === '#' || id.length < 2) return
      const el = document.querySelector(id)
      if (!el) return
      e.preventDefault(); lenis.scrollTo(el, { offset: -10 }); closeMenu()
    })
  })
}

/* ---------- REVEALS ---------- */
function initReveals() {
  const ro = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target) } })
  }, { threshold: 0.14, rootMargin: '0px 0px -7% 0px' })
  document.querySelectorAll('[data-reveal], .reveal-mask').forEach((el) => ro.observe(el))
}

/* ---------- HERO TITLE: gentle line-by-line rise ---------- */
function heroIntro() {
  const title = document.querySelector('[data-hero-title]')
  if (!title || reduced) { title && (title.style.opacity = 1); return }
  // wrap into a single mask and rise
  title.style.opacity = '0'
  title.style.transform = 'translateY(24px)'
  title.style.transition = 'opacity 1.1s var(--ease), transform 1.1s var(--ease)'
  requestAnimationFrame(() => requestAnimationFrame(() => {
    title.style.opacity = '1'; title.style.transform = 'none'
  }))
}

/* ---------- WORK: cursor-following thumbnail ---------- */
function initWorkFloat() {
  if (!hasFinePointer) return
  const float = document.getElementById('workFloat')
  const inner = document.getElementById('workFloatInner')
  if (!float) return
  let x = 0, y = 0, tx = 0, ty = 0, active = false

  document.querySelectorAll('.work__row[data-img]').forEach((row) => {
    row.addEventListener('pointerenter', () => {
      const label = row.getAttribute('data-label') || ''
      const color = row.getAttribute('data-color') || '#999'
      const img = row.getAttribute('data-imgsrc')
      // real image if provided, else a tasteful colour block with the name
      inner.innerHTML = img
        ? `<img src="${img}" alt="">`
        : `<span class="work-float__label">${label}</span>`
      inner.parentElement.style.background = img ? 'none' : color
      float.classList.add('is-visible'); active = true
    })
    row.addEventListener('pointerleave', () => { float.classList.remove('is-visible'); active = false })
  })
  window.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY }, { passive: true })
  function loop() {
    x += (tx - x) * 0.12; y += (ty - y) * 0.12
    if (active || float.classList.contains('is-visible')) float.style.left = x + 'px', float.style.top = y + 'px'
    requestAnimationFrame(loop)
  }
  loop()
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
    nav.classList.toggle('is-scrolled', yPos > 40)
    if (yPos > lastY && yPos > 500) nav.classList.add('is-hidden')
    else nav.classList.remove('is-hidden')
    lastY = yPos
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

/* ---------- COPY EMAIL ---------- */
function initCopyMail() {
  const mail = document.querySelector('.contact__mail')
  mail?.addEventListener('click', (e) => {
    if (!navigator.clipboard) return
    e.preventDefault()
    navigator.clipboard.writeText('anuraggautamsharma@gmail.com').then(() => {
      const old = mail.textContent
      mail.textContent = 'Copied to clipboard ✓'
      setTimeout(() => { mail.textContent = old }, 1400)
    }).catch(() => { window.location.href = mail.getAttribute('href') })
  })
}

/* ---------- BOOT ---------- */
function boot() {
  document.getElementById('year').textContent = new Date().getFullYear()
  initScroll(); initReveals(); initWorkFloat(); initNav(); initCopyMail()
}
window.addEventListener('DOMContentLoaded', () => {
  runLoader(() => { boot(); heroIntro() })
})
