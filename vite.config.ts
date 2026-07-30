import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
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
        "assets/icons/apple-touch-icon.jpg",
        "assets/icons/apple-touch-icon.png",
      ],
      manifest: {
        name: "FidexaPay",
        short_name: "FidexaPay",
        description: "Paiements sécurisés en escrow pour prestataires africains",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/dashboard",
        icons: [
          {
            src: "/assets/icons/apple-touch-icon.jpg",
            sizes: "180x180",
            type: "image/jpeg",
            purpose: "any",
          },
          {
            src: "/assets/icons/apple-touch-icon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/assets/icons/Favicon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/assets/icons/Favicon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
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
