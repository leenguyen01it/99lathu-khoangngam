import type { Config } from "tailwindcss";

// Bảng màu nhận diện Khoảng Ngẫm (phương án B, xanh nâng sáng).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16302f", // nền chủ đạo
        deep: "#3e6658", // quầng sáng nền, mảng phụ
        paper: "#f7f0e2", // chữ chính, nền lá thư
        gold: "#ecc98a", // nhấn
        sage: "#bcd3bd", // chữ phụ, nhãn
        rose: "#dc9b86", // nhấn cho ý tổn thương, dùng ít
      },
      fontFamily: {
        sans: ["var(--font-be-vietnam-pro)", "system-ui", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
