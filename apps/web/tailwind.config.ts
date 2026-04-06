import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cortex: {
          primary: "#005f73",
          accent: "#ca6702",
          surface: "#fffdf9",
        },
      },
    },
  },
  plugins: [],
};

export default config;
