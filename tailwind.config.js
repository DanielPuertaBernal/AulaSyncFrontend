/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        '3xl': '1600px',
      },
      colors: {
        primary: { DEFAULT: '#1d4ed8', dark: '#1e3a8a', light: '#3b82f6' },
        accent: { DEFAULT: '#f59e0b', dark: '#d97706' },
        danger: '#dc2626',
        success: '#16a34a',
      },
    },
  },
  plugins: [],
};
