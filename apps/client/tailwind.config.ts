import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        accent: "hsl(var(--accent))",
        background: "hsl(var(--background))",
        border: "hsl(var(--border))",
        foreground: "hsl(var(--foreground))",
        input: "hsl(var(--input))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))"
      },
      fontFamily: {
        body: [
          "var(--font-body)"
        ],
        display: [
          "var(--font-display)"
        ],
        sans: [
          "var(--font-body)",
          "ui-sans-serif",
          "system-ui",
          "Microsoft YaHei",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
} satisfies Config;
