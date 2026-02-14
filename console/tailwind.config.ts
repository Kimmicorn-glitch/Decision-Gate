import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#050912",
        panel: "rgba(17, 25, 40, 0.58)",
        line: "rgba(96, 165, 250, 0.25)",
        text: "#dbe8ff",
        muted: "#94a3b8",
        approve: "#22c55e",
        revise: "#f59e0b",
        block: "#ef4444",
        accent: "#3b82f6"
      },
      boxShadow: {
        glass: "0 20px 45px rgba(2, 6, 23, 0.45)",
        signal: "0 0 30px rgba(59, 130, 246, 0.35)"
      },
      backdropBlur: {
        xs: "2px"
      }
    }
  },
  plugins: []
};

export default config;
