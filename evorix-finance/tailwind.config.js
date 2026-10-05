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
          bgMain: '#0C0E0F',
          bgSec: '#131617',
          card: '#1A1E20',
          border: '#2A3032',
          green: '#79A88E',
          red: '#E47780',
          accent: '#91A99C',
          primary: '#343A38',
          primaryHover: '#454C49',
          textMain: '#F1F2F0',
          textSec: '#A7AEAA'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], 
      }
    },
  },
  plugins: [],
}
