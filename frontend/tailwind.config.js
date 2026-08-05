/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "slate-blue": "#3B5772",
        "teal-green": "#1F9C86",
      },
    },
  },
  plugins: [],
};