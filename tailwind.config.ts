import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1A1F2E',
          light: '#252B3B',
          hover: '#2D3448',
        },
        brand: {
          green: '#22c55e',
          orange: '#f97316',
          red: '#ef4444',
          blue: '#3b82f6',
        },
        surface: {
          DEFAULT: '#F5F7FA',
          card: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
