'use client'

/**
 * PremiumBackground
 * --------------------------------------------------------------
 * Reusable dark premium background for the visitor app.
 * - Base color identity: #111827 (kept as the dominant tone)
 * - Layered: deep gradient → ambient blur glows (cyan / blue / purple)
 *   → animated floating mesh → grid sheen → SVG noise texture
 * - All decorative layers are pointer-events-none, GPU-friendly,
 *   and respect prefers-reduced-motion.
 * - Drop this once at the layout root behind <main>.
 */
export default function PremiumBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Base deep gradient — keeps #111827 as the dominant base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, #1a2335 0%, #131b2c 35%, #111827 70%, #0b1220 100%)',
        }}
      />

      {/* Subtle vignette to deepen the corners */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(80% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* Cyan glow — top right */}
      <div
        className="absolute -top-40 -right-40 h-[42rem] w-[42rem] rounded-full opacity-[0.22] blur-[120px] animate-glow-drift-a will-change-transform"
        style={{
          background:
            'radial-gradient(circle, rgba(34,211,238,0.55) 0%, rgba(34,211,238,0) 70%)',
        }}
      />

      {/* Electric blue glow — left bottom */}
      <div
        className="absolute -bottom-48 -left-32 h-[44rem] w-[44rem] rounded-full opacity-[0.20] blur-[130px] animate-glow-drift-b will-change-transform"
        style={{
          background:
            'radial-gradient(circle, rgba(59,130,246,0.55) 0%, rgba(59,130,246,0) 70%)',
        }}
      />

      {/* Soft purple accent — center back */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[36rem] w-[36rem] rounded-full opacity-[0.13] blur-[140px] animate-glow-drift-c will-change-transform"
        style={{
          background:
            'radial-gradient(circle, rgba(139,92,246,0.45) 0%, rgba(139,92,246,0) 70%)',
        }}
      />

      {/* Slow moving mesh / aurora layer */}
      <div
        className="absolute inset-0 opacity-[0.18] mix-blend-screen animate-mesh-shift will-change-[background-position]"
        style={{
          background:
            'radial-gradient(60% 40% at 20% 30%, rgba(34,211,238,0.35), transparent 60%), radial-gradient(50% 40% at 80% 70%, rgba(99,102,241,0.30), transparent 60%), radial-gradient(40% 30% at 50% 90%, rgba(56,189,248,0.25), transparent 60%)',
          backgroundSize: '200% 200%',
        }}
      />

      {/* Faint cyber grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(ellipse 70% 60% at 50% 30%, #000 40%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 60% at 50% 30%, #000 40%, transparent 80%)',
        }}
      />

      {/* SVG noise texture for premium depth */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* Top hairline accent — subtle cyan rim */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
    </div>
  )
}
