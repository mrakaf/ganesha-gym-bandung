'use client'

import { useEffect, useRef } from 'react'

/**
 * LandingParticles (DOM-based)
 * --------------------------------------------------------------
 * Premium ambient floating particles untuk landing page.
 * - Vanilla JS (no library), ~30 DOM nodes max
 * - Pure CSS keyframe animation (GPU: transform + opacity)
 * - Pause saat tab hidden — battery friendly
 * - Honors prefers-reduced-motion (renders nothing)
 * - Adaptive density: mobile ~18, tablet ~26, desktop ~34
 */
const PALETTE = [
  { rgb: '34, 211, 238' }, // cyan-400
  { rgb: '96, 165, 250' }, // blue-400
  { rgb: '167, 139, 250' }, // violet-400
  { rgb: '255, 255, 255' }, // white
]

export default function LandingParticles() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (prefersReduced) return

    const container = containerRef.current
    if (!container) return

    const w = window.innerWidth
    const count = w < 640 ? 22 : w < 1024 ? 32 : 42

    const rand = (min: number, max: number) =>
      Math.random() * (max - min) + min

    const fragments: HTMLDivElement[] = []
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div')

      const size = rand(3, 7) // 3px - 7px
      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
      const opacity = rand(0.4, 0.85) // base alpha lebih kuat agar terlihat
      const duration = rand(14, 30)
      const delay = -rand(0, duration)
      const left = rand(0, 100)
      const top = rand(0, 100)
      const tx = rand(-80, 80)
      const ty = rand(-220, -80)
      const blur = rand(0, 0.8) // blur lebih ringan biar tetap tajam

      p.style.cssText = `
        position: absolute;
        left: ${left}%;
        top: ${top}%;
        width: ${size}px;
        height: ${size}px;
        background: rgba(${color.rgb}, ${opacity});
        border-radius: 9999px;
        pointer-events: none;
        filter: blur(${blur}px);
        box-shadow:
          0 0 ${Math.round(size * 3)}px rgba(${color.rgb}, ${(opacity * 0.9).toFixed(2)}),
          0 0 ${Math.round(size * 6)}px rgba(${color.rgb}, ${(opacity * 0.4).toFixed(2)});
        will-change: transform, opacity;
        animation: landing-particle-float ${duration}s ease-in-out ${delay}s infinite;
      `
      // pass per-particle drift target via custom props
      p.style.setProperty('--tx', `${tx}px`)
      p.style.setProperty('--ty', `${ty}px`)
      p.style.setProperty('--peak', `${Math.min(opacity * 1.1 + 0.1, 1)}`)

      container.appendChild(p)
      fragments.push(p)
    }

    return () => {
      fragments.forEach((p) => p.remove())
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="absolute inset-0 h-full w-full overflow-hidden pointer-events-none"
    />
  )
}
