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
          bg: '#070d1e',
          surface: '#0d1527',
          surfaceHover: '#131e36',
          card: '#0a1226',
          border: 'rgba(255, 255, 255, 0.08)',
          borderHighlight: 'rgba(255, 255, 255, 0.16)',
          hover: 'rgba(255, 255, 255, 0.05)',
        },
        gold: {
          neon: '#fbbf24',
          deep: '#d97706',
          subtle: 'rgba(251, 191, 36, 0.12)',
          glow: 'rgba(251, 191, 36, 0.35)',
        },
        cyan: {
          neon: '#00e5ff',
          deep: '#0284c7',
          subtle: 'rgba(0, 229, 255, 0.12)',
          glow: 'rgba(0, 229, 255, 0.35)',
        },
        water: {
          neon: '#00e5ff',
          deep: '#0284c7',
          subtle: 'rgba(0, 229, 255, 0.12)',
        },
        fire: {
          neon: '#f97316',
          deep: '#dc2626',
          subtle: 'rgba(249, 115, 22, 0.12)',
        },
        emerald: {
          neon: '#10b981',
          deep: '#059669',
          subtle: 'rgba(16, 185, 129, 0.12)',
          glow: 'rgba(16, 185, 129, 0.35)',
        }
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'Outfit', 'sans-serif'],
        heading: ['Outfit', 'Inter', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-gold': '0 0 25px -4px rgba(251, 191, 36, 0.35)',
        'glow-cyan': '0 0 25px -4px rgba(0, 229, 255, 0.35)',
        'glow-emerald': '0 0 25px -4px rgba(16, 185, 129, 0.35)',
        'cockpit-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
      }
    },
  },
  plugins: [],
}
