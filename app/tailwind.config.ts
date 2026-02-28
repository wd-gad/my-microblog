import type { Config } from "tailwindcss";

const config: Config = {
  // ★ここがポイントです（配列ではなく文字列）
  darkMode: "class",

  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {},
  },

  plugins: [],
};

export default config;