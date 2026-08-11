import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta quente, lembrando massa/molho, com bom contraste
        massa: {
          50: "#fdf7ee",
          100: "#f8e9d2",
          200: "#f0d0a3",
          300: "#e6b171",
          400: "#dc9147",
          500: "#d1762c",
          600: "#b65c22",
          700: "#93441f",
          800: "#77381f",
          900: "#622f1d",
        },
      },
      fontFamily: {
        sans: ["system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
