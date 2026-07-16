'use client'

import { useEffect } from 'react'

/**
 * ScrollReveal
 * Auto-add `.is-visible` ke semua `.reveal` saat masuk viewport.
 * Pakai IntersectionObserver, ringan dan tidak ada listener scroll.
 */
export default function ScrollReveal() {
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (prefersReduced) {
      document
        .querySelectorAll<HTMLElement>('.reveal')
        .forEach((el) => el.classList.add('is-visible'))
      return
    }

    const els = document.querySelectorAll<HTMLElement>('.reveal')
    if (!els.length) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )

    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return null
}
