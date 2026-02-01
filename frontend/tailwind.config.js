/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'perf-red': '#ff4444',
        'perf-orange': '#ff9944',
        'perf-yellow': '#ffcc44',
        'perf-lime': '#aadd44',
        'perf-green': '#44dd44',
      },
    },
  },
  plugins: [],
};
