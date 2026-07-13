/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        glow: "0 20px 80px rgba(15, 23, 42, 0.18)",
      },
    },
  },
  plugins: [],
};
