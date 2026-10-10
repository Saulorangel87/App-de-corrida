/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        passo: {
          orange: '#FF5A1F',
          dark: '#111827',
          gray: {
            100: '#F5F6F8', // fundo
            200: '#E5E7EB', // bordas
            400: '#94A3B8', // texto secundário/terciário
            500: '#64748B', // texto
            600: '#475569', // texto
            900: '#0F172A', // texto principal
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',  // 12px
        '2xl': '1rem',    // 16px
      }
    },
  },
  plugins: [],
}
