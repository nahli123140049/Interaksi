import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef5ff',
          100: '#dceafe',
          200: '#bfd8fd',
          300: '#92befa',
          400: '#5e9af4',
          500: '#2f76e8',
          600: '#1d5fd0',
          700: '#184ca8',
          800: '#143f86',
          900: '#12376f',
          950: '#0a1b3a'
        }
      },
      boxShadow: {
        soft: '0 20px 60px -24px rgba(11, 27, 58, 0.38)',
        card: '0 12px 32px -18px rgba(15, 23, 42, 0.35)'
      },
      backgroundImage: {
        'grid-fade': 'linear-gradient(to bottom right, rgba(255,255,255,0.12), rgba(255,255,255,0))'
      }
    }
  },
  plugins: []
};

export default config;