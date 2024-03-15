import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.APP_VERSION": JSON.stringify(process.env.npm_package_version),
    "process.env.CONTACT_FORM_URL": JSON.stringify(process.env.CONTACT_FORM_URL),
    "process.env.ASSETS_PATH": JSON.stringify(process.env.ASSETS_PATH ?? "https://assets.no-mans-folly.com/"),
    "process.env.API_HOST": JSON.stringify(process.env.API_HOST ?? "http://localhost:8787/"),
    "process.env.GOOGLE_CLIENT_ID": JSON.stringify(
      process.env.GOOGLE_CLIENT_ID ?? "443651764160-4klkt2fdo9eahdhoeg2ia5tsnsj5tk13.apps.googleusercontent.com",
    ),
    "process.env.GOOGLE_API_KEY": JSON.stringify(
      process.env.GOOGLE_API_KEY ?? "AIzaSyDen1FgZbOBII7KYbYITNm7GZOsS1Ax-NM",
    ),
  },
});
