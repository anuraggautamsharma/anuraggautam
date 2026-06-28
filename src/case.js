import './styles/case.css'
import Lenis from 'lenis'

/* Light entry for case-study pages: smooth scroll + gentle reveals. */
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function initScroll() {
  if (reduced) return
  const lenis = new Lenis({ duration: 1.15, smoothWheel: true })
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf) }
  requestAnimationFrame(raf)
}

function initReveals() {
  const ro = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target) }
  }), { threshold: 0.14, rootMargin: '0px 0px -7% 0px' })
  document.querySelectorAll('[data-reveal]').forEach((el) => ro.observe(el))
}

addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear()
  initScroll(); initReveals()
})
