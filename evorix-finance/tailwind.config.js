/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        evo: {
          bgMain: '#070F0E',
          bgSec: '#0B1715',
          card: '#10201E',
          border: '#1F3834',
          green: '#63D7A8',
          red: '#F26B7A',
          blueMain: '#167F82',
          blueSec: '#12696D',
          textMain: '#F4F8F6',
          textSec: '#A1B6B1'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], 
      }
    },
  },
  plugins: [],
}
