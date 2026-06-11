/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#080809',
        'bg-card': '#111112',
        'accent-purple': '#9D50FF',
        'accent-blue': '#0085FF',
        'accent-teal': '#00F0FF',
        'warm-red': '#FF4D4D',
        'cassette-orange': '#FF8A00',
        'text-primary': '#FFFFFF',
        'text-secondary': '#8E8E93',
      }
    },
  },
  plugins: [],
}