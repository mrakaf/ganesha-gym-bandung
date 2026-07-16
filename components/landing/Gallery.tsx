'use client'

import Image from 'next/image'
import { Camera, ZoomIn, Grid3x3 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export default function Gallery() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [visibleImages, setVisibleImages] = useState<number[]>([])
  const imagesRef = useRef<(HTMLDivElement | null)[]>([])
  
  const images = [
    '/images/ganesha1.jpg',
    '/images/ganesha2.jpg',
    '/images/ganesha3.jpg',
    '/images/ganesha4.jpg',
    '/images/ganesha5.jpg',
    '/images/ganesha6.jpg',
    '/images/ganesha7.jpg',
  ]

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0')
            setVisibleImages((prev) => [...prev, index])
          }
        })
      },
      { threshold: 0.1 }
    )

    imagesRef.current.forEach((img) => {
      if (img) observer.observe(img)
    })

    return () => {
      imagesRef.current.forEach((img) => {
        if (img) observer.unobserve(img)
      })
    }
  }, [])

  return (
    <section id="gallery" className="py-16 md:py-20 bg-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-accent/5 rounded-full blur-2xl animate-float" />
      <div className="absolute bottom-10 left-10 w-40 h-40 bg-secondary/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 mb-4 animate-slide-down-fade">
            <Camera className="w-5 h-5 text-accent animate-pulse" />
            <span className="text-accent font-bold text-sm uppercase tracking-wider">Galeri</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary mb-3 animate-slide-up-fade">
            Suasana <span className="gradient-text">Ganesha Gym</span>
          </h2>
          <p className="text-base text-neutral max-w-xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Lihat suasana dan fasilitas Ganesha Gym yang nyaman dan modern
          </p>
        </div>

        {/* Gallery Grid with Stagger Animation */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((src, index) => {
            const isVisible = visibleImages.includes(index)
            return (
              <div
                key={index}
                ref={(el) => {
                  imagesRef.current[index] = el
                }}
                data-index={index}
                className={`group relative aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer ${
                  isVisible 
                    ? 'animate-zoom-in opacity-100 scale-100' 
                    : 'opacity-0 scale-0'
                }`}
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  transitionDelay: `${index * 0.1}s`
                }}
                onClick={() => setSelectedImage(src)}
              >
                <Image
                  src={src}
                  alt={`Ganesha Gym ${index + 1}`}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
                {/* Overlay with Icon */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:scale-100 scale-90">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full border border-white/30">
                      <ZoomIn className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                {/* Image Number */}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-white text-xs font-bold">{index + 1}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Info Badge */}
        <div className="mt-8 text-center animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          <div className="inline-flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
            <Grid3x3 className="w-4 h-4 text-accent" />
            <span className="text-sm text-neutral">Klik gambar untuk melihat lebih detail</span>
          </div>
        </div>
      </div>

      {/* Modal for Full Image View */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full animate-zoom-in">
            <Image
              src={selectedImage}
              alt="Ganesha Gym Full View"
              width={1200}
              height={800}
              className="object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm p-3 rounded-full hover:bg-white/30 transition-all duration-300 hover:scale-110"
            >
              <ZoomIn className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
