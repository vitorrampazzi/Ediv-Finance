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
          bgMain: '#363C47',
          bgSec: '#404651',
          card: '#424852',
          border: '#545B66',
          green: '#82B7A0',
          red: '#E47E87',
          accent: '#9CC7C5',
          primary: '#28665F',
          primaryHover: '#34776F',
          textMain: '#F2F4F7',
          textSec: '#C1C7D0'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], 
      }
    },
  },
  plugins: [],
}
