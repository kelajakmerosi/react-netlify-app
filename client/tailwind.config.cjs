/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{tsx,ts,jsx,js}'],
  corePlugins: {
    // Disable preflight to avoid conflicts with existing global CSS resets
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
