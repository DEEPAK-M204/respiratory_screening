/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
        sora: ['"Sora"', 'sans-serif'],
      },
      colors: {
        canvas: '#F6F8F7',
        ink: {
          primary: '#1F2E2C',
          secondary: '#5B6B68',
          muted: '#8C9B98',
        },
        breath: {
          teal: '#2F8F80',
          'teal-dark': '#247367',
          'teal-light': '#E6F4F2',
          sky: '#CFE8E4',
          'sky-light': '#EBF5F3',
        },
        caution: {
          amber: '#E8A33D',
          'amber-light': '#FDF5E8',
        },
        signal: {
          coral: '#D9634F',
          'coral-light': '#FBECE9',
        },
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(31, 46, 44, 0.04), 0 1px 3px rgba(31, 46, 44, 0.02)',
        'float': '0 10px 25px -5px rgba(47, 143, 128, 0.12), 0 8px 10px -6px rgba(47, 143, 128, 0.08)',
        'pulse-ring': '0 0 0 16px rgba(207, 232, 228, 0.45)',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(207, 232, 228, 0.6)' },
          '50%': { transform: 'scale(1.04)', boxShadow: '0 0 0 20px rgba(207, 232, 228, 0.2)' },
        },
        'breathe-slow': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.08)', opacity: '1' },
        },
      },
      animation: {
        breathe: 'breathe 4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'breathe-slow': 'breathe-slow 4.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};