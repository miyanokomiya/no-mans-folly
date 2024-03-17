import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = resolve(__dirname, "src", "pages");
const outDir = resolve(__dirname, "dist");

// https://vitejs.dev/config/
export default defineConfig({
  root,
  build: {
    outDir,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "src", "pages", "index.html"),
        "auth-retrieved": resolve(__dirname, "src", "pages", "auth-retrieved", "index.html"),
      },
    },
  },
  plugins: [react()],
  define: {
    "process.env.APP_VERSION": JSON.stringify(process.env.npm_package_version),
    "process.env.CONTACT_FORM_URL": JSON.stringify(process.env.CONTACT_FORM_URL),
    "process.env.ASSETS_PATH": JSON.stringify(process.env.ASSETS_PATH ?? "https://assets.no-mans-folly.com/"),
    "process.env.API_HOST": JSON.stringify(process.env.API_HOST ?? "https://workers.no-mans-folly.com/"),
    // Dev project: https://console.cloud.google.com/apis/dashboard?project=test-no-mans-folly
    "process.env.GOOGLE_CLIENT_ID": JSON.stringify(
      process.env.GOOGLE_CLIENT_ID ?? "523071152184-qoep1r9m6erdtr75tc31faorivohrpok.apps.googleusercontent.com",
    ),
    "process.env.GOOGLE_API_KEY": JSON.stringify(
      process.env.GOOGLE_API_KEY ?? "AIzaSyAAl4rKH1gNhAFcmW_KUqw2oGcgZgfAi34",
    ),
  },
});
