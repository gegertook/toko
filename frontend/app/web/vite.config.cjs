const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

module.exports = defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "REACT_APP_"],
});
