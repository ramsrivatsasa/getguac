/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1e3a8a', light: '#2563eb', dark: '#1e3a8a' }
      }
    }
  },
  plugins: []
}
