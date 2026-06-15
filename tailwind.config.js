/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': '#121212',
        'bg-highlight': '#1a1a1a',
        'bg-press': '#000',
        'bg-elevated-base': '#242424',
        'bg-elevated-highlight': '#2a2a2a',
        'text-base': '#fff',
        'text-subdued': '#a7a7a7',
        'text-bright-accent': '#1ed760',
        'accent-purple': '#9D50FF',
        'essential-base': '#fff',
        'essential-subdued': '#727272',
        'card-hover': '#282828',
      }
    },
  },
}
