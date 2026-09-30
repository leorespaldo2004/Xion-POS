/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#090d16",
        card: "#111827",
        border: "#1f2937",
        primary: {
          DEFAULT: "#6366f1",
          foreground: "#ffffff"
        },
        accent: {
          DEFAULT: "#3b82f6",
          foreground: "#ffffff"
        },
        success: {
          DEFAULT: "#10b981",
          foreground: "#ffffff"
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#ffffff"
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff"
        },
        muted: {
          DEFAULT: "#1f2937",
          foreground: "#9ca3af"
        }
      }
    }
  },
  plugins: []
};
