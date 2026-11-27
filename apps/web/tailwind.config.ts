import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07110e",
        pine: "#10241c",
        card: "#143026",
        lime: "#d6ff3f",
        sand: "#f4efe4",
        mute: "#a8b6ad",
        coral: "#ff5d6c",
        clay: "#ff7a45",
        tide: "#8fd0c4",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 16px 40px rgba(0,0,0,0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
