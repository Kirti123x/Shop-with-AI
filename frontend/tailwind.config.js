/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        myntra: {
          pink: "#FF3F6C",
          "pink-dark": "#E62E58",
          orange: "#FF905A",
          dark: "#282C3F",
          gray: "#94969F",
          bg: "#F5F5F6",
          teal: "#14958F",
        },
        gamify: {
          gold: "#FFC300",
          purple: "#7C3AED",
          "purple-dark": "#5B21B6",
        },
      },
      fontFamily: {
        display: ["'Poppins'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(40,44,63,0.08), 0 1px 2px rgba(40,44,63,0.06)",
        pop: "0 8px 24px rgba(255,63,108,0.25)",
      },
      keyframes: {
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(255,63,108,0.4)" },
          "50%": { boxShadow: "0 0 0 10px rgba(255,63,108,0)" },
        },
        floatUp: {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-40px)", opacity: "0" },
        },
        popIn: {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2s infinite",
        floatUp: "floatUp 1s ease-out forwards",
        popIn: "popIn 0.2s ease-out",
        slideInRight: "slideInRight 0.25s ease-out",
      },
    },
  },
  plugins: [],
}