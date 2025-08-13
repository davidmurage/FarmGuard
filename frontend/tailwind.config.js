/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#1B5E20", light: "#2E7D32", dark: "#0B3D0B" }
      }
    }
  },
  plugins: []
};
