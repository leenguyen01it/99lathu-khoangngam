// Tailwind cho landing. Sau khi sửa class trong index.html hoặc checkout.js,
// chạy `npm run landing:css` để dựng lại styles.css.
// Bảng màu và font giống hệt app 99lathu (tailwind.config.ts).
module.exports = {
  content: [__dirname + "/index.html", __dirname + "/checkout.js"],
  theme: {
    extend: {
      colors: {
        ink: "#16302f",
        deep: "#3e6658",
        paper: "#f7f0e2",
        gold: "#ecc98a",
        sage: "#bcd3bd",
        rose: "#dc9b86",
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', "system-ui", "sans-serif"],
        serif: ["Lora", "Georgia", "serif"],
        script: ['"Great Vibes"', "cursive"],
      },
    },
  },
};
