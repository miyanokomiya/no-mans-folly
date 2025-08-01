import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import handlebars from "vite-plugin-handlebars";
import { VitePWA } from "vite-plugin-pwa";

const root = resolve(__dirname, "src", "pages");
const outDir = resolve(__dirname, "dist");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  root,
  build: {
    outDir,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "src", "pages", "index.html"),
        "auth-result": resolve(__dirname, "src", "pages", "auth-result", "index.html"),
        "privacy-policy": resolve(__dirname, "src", "pages", "terms", "privacy-policy", "index.html"),
      },
    },
  },
  resolve: {
    alias:
      mode === "production"
        ? {
            "y-indexeddb": resolve(__dirname, "src", "stubs", "y-indexeddb.ts"),
          }
        : {},
  },
  publicDir: resolve(__dirname, "public"),
  plugins: [
    react(),
    handlebars({
      partialDirectory: resolve(__dirname, "src", "partials"),
      context: {
        title: "No-man's folly",
      },
    }),
    VitePWA({
      workbox: {
        globPatterns: ["**/*"],
      },
      includeAssets: ["**/*"],
      manifest: {
        theme_color: "#bfbfbf",
        background_color: "#bfbfbf",
        display: "standalone",
        orientation: "landscape",
        scope: "/",
        start_url: "/",
        name: "No-man's folly",
        short_name: "No-man's folly",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-256x256.png",
            sizes: "256x256",
            type: "image/png",
          },
          {
            src: "/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  define: {
    "process.env.APP_VERSION": JSON.stringify(process.env.npm_package_version),
    "process.env.CONTACT_FORM_URL": JSON.stringify(process.env.CONTACT_FORM_URL ?? "example.com"),
    "process.env.BUYMEACOFFEE_URL": JSON.stringify(process.env.BUYMEACOFFEE_URL ?? "example.com"),
    "process.env.ASSETS_PATH": JSON.stringify(process.env.ASSETS_PATH ?? "https://assets.no-mans-folly.com/"),
    "process.env.DOC_PATH": JSON.stringify(process.env.DOC_PATH ?? "https://doc.no-mans-folly.com/"),
    "process.env.API_HOST": JSON.stringify(process.env.API_HOST ?? "http://localhost:8787/"),
    // Dev project: https://console.cloud.google.com/apis/dashboard?project=test-no-mans-folly
    "process.env.GOOGLE_CLIENT_ID": JSON.stringify(
      process.env.GOOGLE_CLIENT_ID ?? "523071152184-qoep1r9m6erdtr75tc31faorivohrpok.apps.googleusercontent.com",
    ),
    "process.env.GOOGLE_API_KEY": JSON.stringify(
      process.env.GOOGLE_API_KEY ?? "AIzaSyAAl4rKH1gNhAFcmW_KUqw2oGcgZgfAi34",
    ),
  },
}));
