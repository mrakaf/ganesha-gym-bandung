'use client'

import Image from 'next/image'
import { Dumbbell, ShowerHead, Lock, Car, Coffee, UserCheck, CheckCircle2, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function Features() {
  const [visibleCards, setVisibleCards] = useState<number[]>([])
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0')
            setVisibleCards((prev) => [...prev, index])
          }
        })
      },
      { threshold: 0.1 }
    )

    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card)
    })

    return () => {
      cardsRef.current.forEach((card) => {
        if (card) observer.unobserve(card)
      })
    }
  }, [])

  const features = [
    {
      title: "Alat Gym Import",
      description: "Alat gym berkualitas tinggi import dari luar negeri untuk hasil latihan maksimal",
      icon: Dumbbell,
      image: "/images/ganesha2.jpg",
      color: "from-accent to-accent-light",
      benefits: ["100+ alat gym", "Brand internasional", "Maintenance rutin"],
    },
    {
      title: "Kamar Mandi Bersih",
      description: "Kamar mandi bersih dan terawat dengan standar kebersihan tinggi",
      icon: ShowerHead,
      image: "/images/ganesha3.jpg",
      color: "from-blue-500 to-blue-600",
      benefits: ["Air panas & dingin", "Bersih setiap hari", "Tersedia sabun"],
    },
    {
      title: "Loker Tersedia",
      description: "Loker aman dan nyaman untuk menyimpan barang pribadi Anda",
      icon: Lock,
      image: "/images/ganesha4.jpg",
      color: "from-neutral to-neutral-dark",
      benefits: ["Kunci pribadi", "Ukuran besar", "Aman & nyaman"],
    },
    {
      title: "Parkiran Luas",
      description: "Area parkir yang luas dan aman untuk kendaraan Anda",
      icon: Car,
      image: "/images/ganesha5.jpg",
      color: "from-green-500 to-green-600",
      benefits: ["Parkir gratis", "Area luas", "Keamanan 24/7"],
    },
    {
      title: "Smoking Area",
      description: "Tempat nongkrong smoking area yang nyaman",
      icon: Coffee,
      image: "/images/ganesha6.jpg",
      color: "from-amber-500 to-amber-600",
      benefits: ["Area tertutup", "Tempat duduk", "Ventilasi baik"],
    },
    {
      title: "Personal Trainer",
      description: "Layanan personal trainer profesional untuk bimbingan latihan",
      icon: UserCheck,
      image: "/images/ganesha7.jpg",
      color: "from-secondary to-secondary-light",
      benefits: ["Trainer berpengalaman", "Program custom", "Harga terjangkau"],
    },
  ]

  return (
    <section id="features" className="py-16 md:py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header with Icon */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 mb-4 animate-slide-down-fade">
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            <span className="text-accent font-bold text-sm uppercase tracking-wider">Fasilitas</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary mb-4 mt-2 animate-slide-up-fade">
            Fasilitas <span className="gradient-text">Unggulan</span>
          </h2>
          <p className="text-base text-neutral leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Nikmati fasilitas terbaik untuk pengalaman fitness yang maksimal. 
            Setiap fasilitas dirancang untuk kenyamanan dan kepuasan member.
          </p>
        </div>
        
        {/* Features Grid with Intersection Observer Animation */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const isVisible = visibleCards.includes(index)
            return (
              <div
                key={index}
                ref={(el) => {
                  cardsRef.current[index] = el
                }}
                data-index={index}
                className={`group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 ${
                  isVisible 
                    ? 'animate-flip-in opacity-100' 
                    : 'opacity-0 translate-y-10'
                }`}
                style={{ 
                  transitionDelay: `${index * 0.1}s`,
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {/* Image with Hover Effect */}
                <div className="relative h-40 overflow-hidden">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`} />
                  <div className="absolute top-3 right-3">
                    <div className={`bg-gradient-to-br ${feature.color} p-2.5 rounded-full shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon className={`w-5 h-5 text-transparent bg-gradient-to-br ${feature.color} bg-clip-text`} />
                    <h3 className="text-lg font-bold text-primary group-hover:text-accent transition-colors">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-sm text-neutral mb-4 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  {/* Benefits List with Animation */}
                  <div className="space-y-2">
                    {feature.benefits.map((benefit, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center space-x-2 ${
                          isVisible ? 'animate-slide-in-left' : 'opacity-0'
                        }`}
                        style={{ animationDelay: `${(index * 0.1) + (idx * 0.05) + 0.3}s` }}
                      >
                        <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                        <span className="text-xs text-neutral">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
