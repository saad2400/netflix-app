import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        netflix: {
          red: "#e50914",
          dark: "#141414",
          gray: "#222222",
        },
      },
    },
  },
  plugins: [],
};

export default config;
