/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        evo: {
          bgMain: "#292D34",
          bgSec: "#25292F",
          bgInset: "#20252C",
          card: "#2D3138",
          border: "#4F5967",
          green: "#95CCB4",
          red: "#F298A0",
          accent: "#A9D9D1",
          primary: "#28665F",
          primaryHover: "#34776F",
          textMain: "#F6F7F9",
          textSec: "#D5DBE5",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.25rem" }],
      },
    },
  },
  plugins: [],
};
