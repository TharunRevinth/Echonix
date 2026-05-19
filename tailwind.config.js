/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cassette-orange': '#FF6B35',
        'retro-silver': '#8EA8C3',
      }
    },
  },
  plugins: [],
}
