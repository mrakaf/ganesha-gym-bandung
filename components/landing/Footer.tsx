'use client'

import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, Facebook, Instagram, Youtube, Dumbbell, Heart, Clock, Navigation, ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-primary-dark via-primary to-primary-light text-white py-12 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="md:col-span-1 animate-fade-in-up">
            <div className="flex items-center space-x-3 mb-4">
              <Image
                src="/images/logoganesha.jpeg"
                alt="Ganesha Gym Logo"
                width={50}
                height={50}
                className="rounded-lg shadow-lg group-hover:scale-110 transition-transform"
              />
              <div>
                <h3 className="font-display font-bold text-lg">GANESHA GYM</h3>
                <p className="text-xs text-gray-300">Fitness Center</p>
              </div>
            </div>
            <p className="text-gray-300 text-xs mb-2 font-medium">
              DARE TO BE GREAT
            </p>
            <p className="text-gray-400 text-xs leading-relaxed mb-4">
              Fitness center terbaik dengan fasilitas lengkap dan alat gym import berkualitas tinggi.
            </p>
            <div className="flex items-center space-x-2 text-xs text-gray-300 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
              <Clock className="w-3 h-3 text-accent animate-pulse" />
              <span>10:00 - 21:00 WIB (Selasa - Minggu)</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <h4 className="font-bold text-base mb-4 flex items-center space-x-2">
              <Dumbbell className="w-4 h-4 text-accent" />
              <span>Navigasi</span>
            </h4>
            <ul className="space-y-2">
              {[
                { href: "#features", label: "Fasilitas" },
                { href: "#gallery", label: "Galeri" },
                { href: "#pricing", label: "Paket Harga" },
                { href: "#about", label: "Tentang Kami" },
                { href: "/visitor/payment", label: "Daftar Member", external: true },
              ].map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-accent transition-colors duration-300 text-sm flex items-center space-x-2 group animate-fade-in-up"
                    style={{ animationDelay: `${0.1 + (index * 0.05)}s` }}
                  >
                    <span className="w-0 group-hover:w-2 h-0.5 bg-accent transition-all duration-300" />
                    <span>{link.label}</span>
                    {link.external && <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h4 className="font-bold text-base mb-4 flex items-center space-x-2">
              <Phone className="w-4 h-4 text-accent" />
              <span>Kontak & Lokasi</span>
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <div className="bg-accent/20 p-2 rounded-lg">
                  <MapPin className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <div className="text-xs text-gray-300 mb-1 font-medium">Alamat</div>
                  <div className="text-xs text-gray-200 leading-relaxed">
                    Jl. Aceh No.50, Merdeka, Kec. Sumur Bandung, Kota Bandung, Jawa Barat 40111
                  </div>
                </div>
              </li>
              <li className="flex items-center space-x-3 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <div className="bg-accent/20 p-2 rounded-lg">
                  <Phone className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <div className="text-xs text-gray-300 mb-1 font-medium">Telepon</div>
                  <a 
                    href="tel:081224484664"
                    className="text-sm text-accent hover:text-accent-light transition-colors font-bold flex items-center space-x-1 group"
                  >
                    <span>081224484664</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </div>
              </li>
              <li className="flex items-center space-x-3 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                <div className="bg-accent/20 p-2 rounded-lg">
                  <Mail className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <div className="text-xs text-gray-300 mb-1 font-medium">Email</div>
                  <a 
                    href="mailto:info@ganeshagym.com"
                    className="text-xs text-gray-200 hover:text-accent transition-colors flex items-center space-x-1 group"
                  >
                    <span>info@ganeshagym.com</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </div>
              </li>
            </ul>
          </div>

          {/* Social Media & Info */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <h4 className="font-bold text-base mb-4 flex items-center space-x-2">
              <Heart className="w-4 h-4 text-accent animate-pulse" />
              <span>Ikuti Kami</span>
            </h4>
            <div className="flex space-x-3 mb-4">
              {[
                { icon: Facebook, href: "#", label: "Facebook", color: "hover:bg-blue-500" },
                { icon: Instagram, href: "#", label: "Instagram", color: "hover:bg-pink-500" },
                { icon: Youtube, href: "#", label: "YouTube", color: "hover:bg-red-500" },
              ].map((social, index) => {
                const Icon = social.icon
                return (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 group animate-scale-in ${social.color}`}
                    aria-label={social.label}
                    style={{ animationDelay: `${0.3 + (index * 0.1)}s` }}
                  >
                    <Icon className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                  </a>
                )
              })}
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-4 h-4 text-accent" />
                <div className="text-xs text-gray-300 font-medium">Jam Operasional</div>
              </div>
              <div className="text-xs text-white">
                <div>Selasa - Minggu</div>
                <div>Senin Tutup</div>
                <div className="font-bold text-accent">10:00 - 21:00 WIB</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 pt-6 mt-8 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
            <p className="text-gray-400 text-xs text-center md:text-left">
              &copy; {new Date().getFullYear()} Ganesha Gym. All rights reserved.
            </p>
            <div className="flex items-center space-x-2 text-gray-400 text-xs">
              <span>Made with</span>
              <Heart className="w-3 h-3 text-accent fill-current animate-pulse" />
              <span>for fitness enthusiasts</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
