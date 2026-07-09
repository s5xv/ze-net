/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // CRITICAL: This enables the light/dark toggle
  theme: {
    extend: {},
  },
  plugins: [],
}
