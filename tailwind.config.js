/** Config de generación de Tailwind (uso de desarrollo; el CSS resultante se commitea). */
module.exports = {
  content: [
    "./registros/templates/**/*.html",
    "./registros/static/registros/js/**/*.js",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "sans-serif"],
      },
      colors: {
        app: {
          ink: "#0f1f1b",
          mint: "#9cc9b1",
          leaf: "#1f5f48",
          clay: "#7a461f",
          cream: "#ece8dc",
        },
      },
      boxShadow: {
        card: "0 18px 36px -24px rgba(10, 26, 21, 0.55)",
      },
    },
  },
  plugins: [],
};
