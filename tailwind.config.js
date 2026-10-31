/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        tajawal: ['Tajawal', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36abf6',
          500: '#0c8ee7',
          600: '#0270c5',
          700: '#03599f',
          800: '#074b83',
          900: '#0c3f6e',
          950: '#082849',
        },
        lawyer: {
          gold: '#c59b27',
          navy: '#12263a',
          burgundy: '#5c1d24',
          gray: '#f8fafc',
          border: '#e2e8f0',
        }
      }
    },
  },
  plugins: [],
}
