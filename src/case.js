import './styles/case.css'
import Lenis from 'lenis'

/* Lighter entry for case-study pages: smooth scroll, cursor, scramble, reveals.
   No Three.js — keeps these pages fast. */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches

function initScroll() {
  if (reduced) return
  const lenis = new Lenis({ duration: 1.1, smoothWheel: true })
  function raf(t) { lenis.raf(t); requestAnimationFrame(raf) }
  requestAnimationFrame(raf)
}

function initCursor() {
  if (!hasFinePointer) return
  const cur = document.getElementById('cursor')
  const label = document.getElementById('cursorLabel')
  if (!cur) return
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY }, { passive: true })
  ;(function loop() {
    cx += (x - cx) * 0.2; cy += (y - cy) * 0.2
    cur.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`
    requestAnimationFrame(loop)
  })()
  document.querySelectorAll('[data-cursor]').forEach((el) => {
    el.addEventListener('pointerenter', () => { cur.classList.add('is-hover'); label.textContent = el.getAttribute('data-cursor') || '' })
    el.addEventListener('pointerleave', () => { cur.classList.remove('is-hover'); label.textContent = '' })
  })
}

const GLYPHS = '█▓▒░<>/\\[]{}=+*#@%&01'
function scramble(el) {
  if (reduced) return
  const final = el.textContent
  let frame = 0
  const total = 16
  const reveal = final.split('').map(() => Math.floor(Math.random() * total))
  const id = setInterval(() => {
    el.textContent = final.split('').map((ch, i) => {
      if (ch === ' ') return ' '
      if (frame >= reveal[i]) return ch
      return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
    }).join('')
    frame++
    if (frame > total) { clearInterval(id); el.textContent = final }
  }, 30)
}

function initReveals() {
  const ro = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target) }
  }), { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
  document.querySelectorAll('[data-reveal]').forEach((el) => ro.observe(el))

  const so = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { scramble(e.target); so.unobserve(e.target) }
  }), { threshold: 0.5 })
  document.querySelectorAll('[data-scramble]').forEach((el) => so.observe(el))
}

function initMagnetic() {
  if (!hasFinePointer) return
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect()
      el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.35}px,${(e.clientY - (r.top + r.height / 2)) * 0.35}px)`
    })
    el.addEventListener('pointerleave', () => { el.style.transform = '' })
  })
}

addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear()
  initScroll(); initCursor(); initReveals(); initMagnetic()
})
