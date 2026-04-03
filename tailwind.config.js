/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './index.tsx', './App.tsx', './components/**/*.{ts,tsx}', './contexts/**/*.{ts,tsx}', './services/**/*.{ts,tsx}', './types/**/*.{ts,tsx}'],
  theme: {
    /* Clamp ALL rounded-* utilities to 0.5 rem (pill shapes keep full) */
    borderRadius: {
      none:    '0',
      sm:      '0.5rem',
      DEFAULT: '0.5rem',
      md:      '0.5rem',
      lg:      '0.5rem',
      xl:      '0.5rem',
      '2xl':   '0.5rem',
      '3xl':   '0.5rem',
      full:    '9999px',
    },
    extend: {
      colors: {
        background: '#ffffff',
        surface: '#f8fafc',
        foreground: '#0f172a',
        brand: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          accent: '#06b6d4',
          dark: '#1e1b4b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-hover': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        glow: '0 0 20px rgba(99, 102, 241, 0.3)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        blob: 'blob 10s infinite',
        scroll: 'scroll 30s linear infinite',
        'scroll-reverse': 'scroll-reverse 30s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        scroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'scroll-reverse': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
