/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0e13",
        panel: "#121722",
        neon: "#ff6a00",
        cyan: "#4cc2ff"
      }
    }
  },
  plugins: []
};
