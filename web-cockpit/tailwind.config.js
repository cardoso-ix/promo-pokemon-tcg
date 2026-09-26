/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#070d17',
          surface: '#0d1527',
          card: '#111c35',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.05)',
        },
        water: {
          neon: '#00e5ff',
          deep: '#0284c7',
          subtle: 'rgba(0, 229, 255, 0.15)',
        },
        fire: {
          neon: '#f97316',
          deep: '#dc2626',
          subtle: 'rgba(249, 115, 22, 0.15)',
        },
        emerald: {
          neon: '#10b981',
          subtle: 'rgba(16, 185, 129, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
