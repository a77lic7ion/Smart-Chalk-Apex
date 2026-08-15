/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './{components,context,services,utils}/**/*.{ts,tsx}',
    './*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      colors: {
        'brand-yellow': 'var(--smartchalk-yellow)',
        'brand-black': 'var(--smartchalk-black)',
        'brand-paper': 'var(--smartchalk-paper)',
        'brand-charcoal': 'var(--smartchalk-text)',
      },
    },
  },
  plugins: [],
};
