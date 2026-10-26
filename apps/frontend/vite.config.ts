import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
      manifest: {
        name: "Noor - Your Quran Companion",
        short_name: "Noor",
        description:
          "A beautiful Quran app for reading, listening, and memorizing with offline support.",
        theme_color: "#D97B2A",
        background_color: "#FAF7F2",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        lang: "en",
        categories: ["education", "lifestyle", "books"],
        icons: [
          {
            src: "/icons/icon-72x72.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-96x96.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-144x144.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-152x152.png",
            sizes: "152x152",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-maskable-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icons/icon-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Continue Reading",
            short_name: "Read",
            description: "Continue from where you left off",
            url: "/quran",
          },
          {
            name: "Prayer Times",
            short_name: "Prayer",
            description: "View today's prayer times",
            url: "/prayer-times",
          },
        ],
      },
      injectManifest: {
        // Keep precache focused on app-shell files so SW updates remain reliable.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
        type: "classic",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Consume the UI package from source: no separate build step needed.
      "@template/ui": path.resolve(__dirname, "../../packages/ui/src/index.ts"),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Database layer
            if (id.includes("dexie")) return "db";
            // Data fetching + React core (kept together to avoid circular deps)
            if (
              id.includes("@tanstack") ||
              id.includes("react-dom") ||
              id.includes("react-router")
            )
              return "vendor-react";
            // Animations
            if (id.includes("framer-motion")) return "animations";
            // Auth
            if (id.includes("@clerk")) return "clerk";
            // Sanitization
            if (id.includes("dompurify")) return "dompurify";
          }
        },
      },
    },
  },
});
