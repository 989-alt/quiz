import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Party colors
        party: {
          ruling: '#5B8A4E',
          opposition: '#2E86AB',
          independent: '#8B8680',
        },
        // Primary palette
        navy: '#1A2B4C',
        mint: '#7FD8BE',
        coral: '#E76F51',
        cream: '#FAF8F3',
        slate: {
          deep: '#0F1729',
        },
        // Status colors
        pass: '#4CAF50',
        fail: '#E63946',
        alert: '#F4A261',
        neutral: '#6C757D',
      },
      fontFamily: {
        sans: ['var(--font-pretendard)', 'Pretendard', 'sans-serif'],
        display: ['var(--font-noto)', 'Noto Sans KR', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-xl': ['6rem', { lineHeight: '1.1' }],
        'display-l': ['4.5rem', { lineHeight: '1.1' }],
        'headline': ['2.25rem', { lineHeight: '1.2' }],
        'title-1': ['1.5rem', { lineHeight: '1.3' }],
        'title-2': ['1.125rem', { lineHeight: '1.4' }],
      },
      borderRadius: {
        card: '16px',
        lg: '12px',
      },
      animation: {
        'pulse-slow': 'pulse 1s ease-in-out infinite',
        'score-count': 'scoreCount 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'card-flip': 'cardFlip 0.6s ease-in-out',
        'stamp-in': 'stampIn 0.4s ease-out',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        stampIn: {
          '0%': { transform: 'rotate(-15deg) scale(0)', opacity: '0' },
          '70%': { transform: 'rotate(5deg) scale(1.1)' },
          '100%': { transform: 'rotate(-3deg) scale(1)', opacity: '1' },
        },
      },
    },
  },
  safelist: [
    { pattern: /^grid-cols-(2|3|4|5|6)$/, variants: ['sm', 'md'] },
  ],
  plugins: [],
}

export default config
