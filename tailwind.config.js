/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#154375',
          'icon-bg': '#EEF2F6',
          selected: '#F0F4F8',
        },
        accent: {
          gold: '#C9A227',
        },
        muted: {
          label: '#6B7C93',
        },
      },
      fontFamily: {
        cairo: ['Cairo_400Regular'],
        'cairo-semibold': ['Cairo_600SemiBold'],
        'cairo-bold': ['Cairo_700Bold'],
      },
    },
  },
  plugins: [],
};
