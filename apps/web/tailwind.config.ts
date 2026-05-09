import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        loyal: "#16a34a",
        promiscuous: "#f59e0b",
        atRisk: "#dc2626",
        marginal: "#94a3b8",
      },
    },
  },
  plugins: [],
};

export default config;
