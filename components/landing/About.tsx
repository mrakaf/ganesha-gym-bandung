'use client'

import { Target, Award, Users, Heart, Clock, MapPin, Phone, Info, CheckCircle2, Sparkles, Dumbbell } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function About() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const stats = [
    { icon: Target, value: "10+", label: "Alat Gym", color: "from-accent to-accent-light" },
    { icon: Users, value: "100+", label: "Member Aktif", color: "from-blue-500 to-blue-600" },
  ]

  return (
    <section id="about" className="py-16 md:py-20 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header with Icon */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <div className={`inline-flex items-center space-x-2 mb-4 transition-all duration-700 ${isVisible ? 'animate-slide-down-fade opacity-100' : 'opacity-0 -translate-y-10'}`}>
            <Info className="w-5 h-5 text-accent animate-pulse" />
            <span className="text-accent font-bold text-sm uppercase tracking-wider">Tentang Kami</span>
          </div>
          <h2 className={`text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary mb-4 mt-2 transition-all duration-700 ${isVisible ? 'animate-slide-up-fade opacity-100' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '0.2s' }}>
            Tentang <span className="gradient-text">Ganesha Gym</span>
          </h2>
          <p className={`text-base text-neutral leading-relaxed transition-all duration-700 ${isVisible ? 'animate-fade-in-up opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '0.4s' }}>
            Komitmen kami adalah membantu Anda mencapai tujuan fitness dengan fasilitas terbaik dan lingkungan yang nyaman.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
          {/* Decorative Card with Icons */}
          <div className={`relative order-2 md:order-1 transition-all duration-800 ${isVisible ? 'animate-slide-in-right opacity-100 translate-x-0' : 'opacity-0 translate-x-20'}`} style={{ transitionDelay: '0.6s' }}>
            <div className="relative h-64 md:h-80 rounded-xl overflow-hidden shadow-xl bg-gradient-to-br from-primary via-primary-light to-accent/20 p-8 flex flex-col justify-center items-center border-2 border-accent/20">
              {/* Decorative Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 left-4 w-20 h-20 border-2 border-accent/30 rounded-full" />
                <div className="absolute bottom-4 right-4 w-16 h-16 border-2 border-secondary/30 rounded-full" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-accent/20 rounded-full" />
              </div>
              
              {/* Icon Grid */}
              <div className="relative z-10 grid grid-cols-3 gap-6 w-full">
                {[Dumbbell, Award, Target, Heart, Users, Sparkles].map((Icon, idx) => (
                  <div 
                    key={idx}
                    className="flex flex-col items-center space-y-2 animate-float"
                    style={{ animationDelay: `${idx * 0.2}s` }}
                  >
                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-full border border-white/20 group-hover:bg-accent transition-all duration-300 hover:scale-110">
                      <Icon className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Text Overlay */}
              <div className="absolute bottom-4 left-4 right-4 text-center z-10">
                <p className="text-white/80 text-sm font-medium">Fitness Excellence</p>
              </div>
            </div>
          </div>
          
          {/* Content with Animation */}
          <div className={`order-1 md:order-2 transition-all duration-800 ${isVisible ? 'animate-slide-in-left opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'}`} style={{ transitionDelay: '0.8s' }}>
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="w-5 h-5 text-accent" />
              <h3 className="text-2xl font-bold text-primary">
                Visi & Misi Kami
              </h3>
            </div>
            <p className="text-base text-neutral mb-4 leading-relaxed">
              Ganesha Gym adalah fitness center yang didedikasikan untuk membantu Anda 
              mencapai tujuan fitness terbaik. Dengan fasilitas modern dan alat gym 
              berkualitas tinggi import dari luar negeri, kami menyediakan lingkungan 
              yang optimal untuk latihan Anda.
            </p>
            <p className="text-base text-neutral mb-6 leading-relaxed">
              Kami memahami bahwa pengalaman fitness tidak hanya tentang latihan, 
              tetapi juga tentang kenyamanan. Itulah mengapa kami menyediakan kamar 
              mandi yang bersih, loker yang aman, parkiran yang luas, dan area 
              nongkrong yang nyaman.
            </p>
            
            <div className="mb-6">
              <h4 className="text-lg font-bold text-primary mb-3 flex items-center space-x-2">
                <Target className="w-5 h-5 text-accent" />
                <span>Mengapa Pilih Ganesha Gym?</span>
              </h4>
              <ul className="space-y-2">
                {[
                  "Alat gym import berkualitas tinggi dari brand internasional",
                  "Fasilitas lengkap dan terawat dengan standar kebersihan tinggi",
                  "Layanan personal trainer profesional dan berpengalaman",
                  "Lingkungan yang nyaman, aman, dan kondusif untuk latihan",
                ].map((item, index) => (
                  <li 
                    key={index} 
                    className={`flex items-start space-x-2 transition-all duration-500 ${isVisible ? 'animate-slide-in-left opacity-100' : 'opacity-0 -translate-x-10'}`}
                    style={{ transitionDelay: `${1 + (index * 0.1)}s` }}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <span className="text-sm text-neutral leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Stats Grid with Animation */}
        <div className="grid grid-cols-2 gap-4 mb-12 max-w-2xl mx-auto">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div
                key={index}
                className={`bg-white rounded-xl p-5 shadow-md border border-gray-100 text-center hover:shadow-lg transition-all duration-300 hover:scale-105 ${
                  isVisible ? 'animate-zoom-in opacity-100' : 'opacity-0 scale-0'
                }`}
                style={{ 
                  transitionDelay: `${1.4 + (index * 0.1)}s`,
                  animationDelay: `${1.4 + (index * 0.1)}s`
                }}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} mb-3 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-xs text-neutral font-medium">{stat.label}</div>
              </div>
            )
          })}
        </div>

        {/* Contact Info Card with Icons and Animation */}
        <div className={`bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-8 text-white transition-all duration-800 ${isVisible ? 'animate-slide-in-up opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`} style={{ transitionDelay: '1.8s' }}>
          <div className="flex items-center justify-center space-x-2 mb-6">
            <MapPin className="w-6 h-6 text-accent" />
            <h3 className="text-2xl font-bold">Informasi Kontak & Lokasi</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-full mb-3 group-hover:scale-110 transition-transform">
                <MapPin className="w-7 h-7 text-accent" />
              </div>
              <h4 className="font-bold mb-2">Alamat</h4>
              <p className="text-sm text-gray-200 leading-relaxed">
                Jl. Aceh No.50, Merdeka, Kec. Sumur Bandung, Kota Bandung, Jawa Barat 40111
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-full mb-3 group-hover:scale-110 transition-transform">
                <Phone className="w-7 h-7 text-accent" />
              </div>
              <h4 className="font-bold mb-2">Telepon</h4>
              <a 
                href="tel:081224484664"
                className="text-sm text-accent hover:text-accent-light font-bold block transition-colors"
              >
                081224484664
              </a>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-full mb-3 group-hover:scale-110 transition-transform">
                <Clock className="w-7 h-7 text-accent" />
              </div>
              <h4 className="font-bold mb-2">Jam Operasional</h4>
              <p className="text-sm text-gray-200">
                Selasa - Minggu<br />
                Senin Tutup<br />
                <span className="font-bold text-accent">10:00 - 21:00 WIB</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
