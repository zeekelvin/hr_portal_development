import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        tinash: {
          navy: "#0F4C81",
          accent: "#1B75D1",
          bg: "#F4F7FB",
          card: "#FFFFFF",
          border: "#D0D7E2",
          text: "#111827",
          muted: "#6B7280"
        }
      },
      borderRadius: {
        "2xl": "1rem"
      }
    }
  },
  plugins: []
};

export default config;
