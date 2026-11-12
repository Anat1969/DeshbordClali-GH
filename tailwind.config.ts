import type { Config } from 'tailwindcss'

// עיצוב: לבן, דיו רך, כחול נייבי כצבע אקטיבי. משקלים 300/400/600 בלבד
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#2E2E2B',
        navy: '#1A2B4A',
        soft: '#F3F4F6',
        mute: '#6B6F76',
        line: '#E6E8EC',
        bad: '#B3392F',
        good: '#2E7D5B',
        mark: '#FFF1A8',
      },
      fontFamily: {
        sans: ['Heebo', 'system-ui', 'sans-serif'],
        num: ['Inter', 'Heebo', 'sans-serif'],
      },
      boxShadow: {
        btn: '0 1px 2px rgba(26,43,74,.10), 0 2px 8px rgba(26,43,74,.06)',
        pop: '0 8px 32px rgba(26,43,74,.16)',
      },
    },
  },
  plugins: [],
} satisfies Config
