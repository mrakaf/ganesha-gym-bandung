'use client'

/**
 * LandingBackground
 * --------------------------------------------------------------
 * Full-page premium animated background untuk landing page.
 * Layered:
 *  1) Base deep gradient (kept #111827 as identity)
 *  2) Animated radial gradient overlay (slow ease-in-out)
 *  3) Floating ambient blobs (cyan / blue / purple) — blur-[120px]
 *  4) Subtle particle canvas (lazy, vanilla JS, GPU-friendly)
 *  5) Faint grid + SVG noise for depth
 *  6) Top hairline cyan accent
 *
 * Pointer-events-none, fixed inset-0, behind everything.
 */
export default function LandingBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* (1) Base deep gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, #1e293b 0%, #131b2c 35%, #111827 70%, #0b1220 100%)',
        }}
      />

      {/* (2) Animated radial overlay — slow shifting */}
      <div
        className="absolute inset-0 opacity-[0.55] mix-blend-screen animate-landing-mesh will-change-[background-position]"
        style={{
          background:
            'radial-gradient(60% 45% at 20% 25%, rgba(34,211,238,0.18), transparent 60%), radial-gradient(50% 40% at 80% 70%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(45% 35% at 50% 95%, rgba(168,85,247,0.14), transparent 60%)',
          backgroundSize: '220% 220%',
        }}
      />

      {/* (3) Floating ambient blobs */}
      <div
        className="absolute -top-48 -right-48 h-[44rem] w-[44rem] rounded-full opacity-[0.22] blur-[120px] animate-landing-blob-a will-change-transform"
        style={{
          background:
            'radial-gradient(circle, rgba(34,211,238,0.55) 0%, rgba(34,211,238,0) 70%)',
        }}
      />
      <div
        className="absolute -bottom-56 -left-40 h-[46rem] w-[46rem] rounded-full opacity-[0.20] blur-[130px] animate-landing-blob-b will-change-transform"
        style={{
          background:
            'radial-gradient(circle, rgba(59,130,246,0.55) 0%, rgba(59,130,246,0) 70%)',
        }}
      />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[38rem] w-[38rem] rounded-full opacity-[0.13] blur-[140px] animate-landing-blob-c will-change-transform"
        style={{
          background:
            'radial-gradient(circle, rgba(168,85,247,0.45) 0%, rgba(168,85,247,0) 70%)',
        }}
      />

      {/* (5a) Faint cyber grid */}
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage:
            'radial-gradient(ellipse 75% 65% at 50% 25%, #000 40%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 75% 65% at 50% 25%, #000 40%, transparent 80%)',
        }}
      />

      {/* (5b) SVG noise texture */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* (6) Top hairline cyan accent */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

      {/* Bottom soft fade */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0b1220] to-transparent" />
    </div>
  )
}
