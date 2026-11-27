import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07110e",
        pine: "#10241c",
        card: "#163228",
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
        card: "0 18px 40px rgba(0,0,0,0.32)",
        glow: "0 0 24px rgba(214,255,63,0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
