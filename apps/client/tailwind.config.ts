import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
      colors: {
        navy: {
          DEFAULT: "#0F172A",
          deep: "#0B1220",
        },
        emerald: {
          DEFAULT: "#10B981",
          hover: "#0EA371",
          dark: "#059669",
          soft: "#D1FAE5",
        },
        slate: {
          500: "#64748B",
          700: "#334155",
        },
        fog: "#E2E8F0",
        cloud: "#F1F5F9",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
