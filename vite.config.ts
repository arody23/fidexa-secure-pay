import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { notifyAdminLocalPlugin } from "./vite-plugin-notify-admin";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    mode === "development" && notifyAdminLocalPlugin(),
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: "auto",
      devOptions: {
        enabled: true,
        type: "module",
      },
      includeAssets: [
        "assets/icons/Favicon.png",
        "assets/icons/icon-192.png",
        "assets/icons/icon-512.png",
        "assets/icons/app-icon-192.png",
        "assets/icons/app-icon-512.png",
        "assets/icons/apple-touch-icon.jpg",
        "assets/icons/apple-touch-icon.png",
        "assets/icons/splash-icon.png",
        "assets/logo/fidexapay-mark.png",
      ],
      manifest: {
        name: "FidexaPay",
        short_name: "FidexaPay",
        description: "Paiements sécurisés en escrow pour prestataires africains",
        theme_color: "#0b3b78",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/dashboard",
        icons: [
          {
            src: "/assets/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/assets/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/assets/icons/app-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/assets/icons/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        globIgnores: ["**/assets/logo/Logo.png"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
