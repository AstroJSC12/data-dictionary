// postcss.config.cjs
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},   // ← use the new package name here
    autoprefixer: {},
  },
}