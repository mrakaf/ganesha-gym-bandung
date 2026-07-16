export const dynamic = 'force-dynamic';
import Header from '@/components/landing/Header'
import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import Gallery from '@/components/landing/Gallery'
import Pricing from '@/components/landing/Pricing'
import About from '@/components/landing/About'
import Footer from '@/components/landing/Footer'
import LandingBackground from '@/components/landing/LandingBackground'
import ScrollReveal from '@/components/landing/ScrollReveal'

export default function Home() {
  return (
    <div className="landing-area relative min-h-screen text-white">
      <LandingBackground />
      <ScrollReveal />
      <Header />
      <main className="relative">
        <Hero />
        <Features />
        <Gallery />
        <Pricing />
        <About />
      </main>
      <Footer />
    </div>
  )
}
