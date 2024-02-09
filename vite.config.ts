import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.APP_VERSION": JSON.stringify(process.env.npm_package_version),
    "process.env.CONTACT_FORM_URL": JSON.stringify(process.env.CONTACT_FORM_URL),
    "process.env.ASSETS_PATH": JSON.stringify(process.env.ASSETS_PATH ?? "https://assets.no-mans-folly.com/"),
  },
});
