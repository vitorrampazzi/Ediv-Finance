/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        evo: {
          bgMain: "var(--ediv-canvas)",
          bgSec: "var(--ediv-inset)",
          bgInset: "var(--ediv-deep)",
          card: "var(--ediv-surface)",
          border: "var(--ediv-border)",
          green: "var(--ediv-green)",
          red: "var(--ediv-red)",
          accent: "var(--ediv-accent)",
          primary: "var(--ediv-primary)",
          primaryHover: "var(--ediv-primary-hover)",
          textMain: "var(--ediv-text)",
          textSec: "var(--ediv-muted)",
        },
      },
      fontFamily: {
        sans: ["var(--ediv-font-sans)"],
        serif: ["var(--ediv-font-sans)"],
        mono: ["var(--ediv-font-sans)"],
      },
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.25rem" }],
      },
    },
  },
  plugins: [],
};
