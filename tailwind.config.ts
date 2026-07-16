import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Ganesha Gym Color Scheme (berdasarkan logo)
        primary: {
          DEFAULT: "#1f2937", // Abu-abu gelap dari logo
          light: "#374151",
          dark: "#111827",
        },
        accent: {
          DEFAULT: "#d97706", // Emas/Orange untuk aksen
          light: "#f59e0b",
          dark: "#b45309",
        },
        secondary: {
          DEFAULT: "#991b1b", // Merah marun untuk energi
          light: "#dc2626",
          dark: "#7f1d1d",
        },
        neutral: {
          DEFAULT: "#6b7280", // Abu-abu netral
          light: "#9ca3af",
          dark: "#4b5563",
        },
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-oswald)', 'var(--font-bebas)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
        montserrat: ['var(--font-montserrat)', 'sans-serif'],
        poppins: ['var(--font-poppins)', 'sans-serif'],
        oswald: ['var(--font-oswald)', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in-out',
        'fade-in-up': 'fadeInUp 0.8s ease-out',
        'fade-in-down': 'fadeInDown 0.8s ease-out',
        'slide-in-left': 'slideInLeft 0.8s ease-out',
        'slide-in-right': 'slideInRight 0.8s ease-out',
        'scale-in': 'scaleIn 0.5s ease-out',
        'bounce-slow': 'bounce 3s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-up-fade': 'slideUpFade 0.8s ease-out',
        'slide-down-fade': 'slideDownFade 0.8s ease-out',
        'zoom-in': 'zoomIn 0.6s ease-out',
        'rotate-in': 'rotateIn 0.8s ease-out',
        'bounce-in': 'bounceIn 0.8s ease-out',
        'flip-in': 'flipIn 0.8s ease-out',
        'slide-in-up': 'slideInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-down': 'slideInDown 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'typing': 'typing 3.5s steps(40, end), blink-caret 0.75s step-end infinite',
        'typing-slow': 'typing 4s steps(40, end), blink-caret 0.75s step-end infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-50px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(50px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        slideUpFade: {
          '0%': { opacity: '0', transform: 'translateY(50px) scale(0.9)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        slideDownFade: {
          '0%': { opacity: '0', transform: 'translateY(-50px) scale(0.9)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        zoomIn: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        rotateIn: {
          '0%': { opacity: '0', transform: 'rotate(-180deg) scale(0.5)' },
          '100%': { opacity: '1', transform: 'rotate(0deg) scale(1)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        flipIn: {
          '0%': { opacity: '0', transform: 'rotateY(-90deg)' },
          '100%': { opacity: '1', transform: 'rotateY(0deg)' },
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(100px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInDown: {
          '0%': { opacity: '0', transform: 'translateY(-100px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        typing: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
        'blink-caret': {
          '0%, 50%': { borderColor: 'transparent' },
          '51%, 100%': { borderColor: 'currentColor' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gym-pattern': "url('/images/ganesha1.jpg')",
      },
      boxShadow: {
        'glow': '0 0 20px rgba(217, 119, 6, 0.3)',
        'glow-lg': '0 0 40px rgba(217, 119, 6, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(217, 119, 6, 0.2)',
      },
    },
  },
  plugins: [],
};
export default config;

