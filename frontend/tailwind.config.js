/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"]
      },
      colors: {
        surface: "#0d1b2a",
        accent: "#13b5a5",
        "accent-soft": "#9ff3df",
        neutral: "#dce6f2"
      },
      boxShadow: {
        glow: "0 20px 80px rgba(19, 181, 165, 0.2)"
      }
    }
  },
  plugins: []
};
