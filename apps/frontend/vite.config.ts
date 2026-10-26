import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { version } from "./package.json";

const coreData = path.resolve(__dirname, "../../packages/core/data");

/** Default script whose data ships in the precache, so text works offline from the first visit. */
const PRECACHED_SCRIPT = "qpc-hafs";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      // Ask before reloading so an update never interrupts reading or recitation.
      registerType: "prompt",
      injectRegister: false,
      manifest: {
        name: "Qiraa — Quran",
        short_name: "Qiraa",
        description:
          "Read, listen and memorise the Quran. Accurate mushaf fonts, works offline.",
        theme_color: "#faf6ef",
        background_color: "#faf6ef",
        display: "standalone",
        start_url: "/",
        scope: "/",
        categories: ["education", "lifestyle", "books"],
        icons: [72, 96, 128, 144, 152, 192, 384, 512]
          .map((size) => ({
            src: `/icons/icon-${size}x${size}.png`,
            sizes: `${size}x${size}`,
            type: "image/png",
            purpose: "any",
          }))
          .concat(
            [192, 512].map((size) => ({
              src: `/icons/icon-maskable-${size}x${size}.png`,
              sizes: `${size}x${size}`,
              type: "image/png",
              purpose: "maskable",
            })),
          ),
        shortcuts: [
          { name: "Quran", url: "/quran" },
          { name: "Prayer times", url: "/prayer" },
        ],
      },
      injectManifest: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,webmanifest}",
          "assets/*.woff2",
          "fonts/quran/hafs/uthmanic_hafs/*.woff2",
          "fonts/quran/hafs/nastaleeq/**/*.woff2",
          "fonts/quran/surah-names/**/*.woff2",
        ],
        // Quran data chunks are cached on use (sw.ts); only the default script is precached.
        manifestTransforms: [
          async (entries) => ({
            manifest: entries.filter(
              (entry) =>
                !entry.url.startsWith("assets/data/") ||
                entry.url.startsWith(`assets/data/${PRECACHED_SCRIPT}-`),
            ),
            warnings: [],
          }),
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Consume workspace packages from source: no separate build step needed.
      "@template/ui": path.resolve(__dirname, "../../packages/ui/src/index.ts"),
      "@quran-data": coreData,
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
        // Name Quran data chunks after their script (assets/data/qcf-v2-p001-<hash>.js)
        // so the service worker can tell them apart.
        chunkFileNames: (chunk) => {
          const id = chunk.facadeModuleId ?? "";
          if (!id.startsWith(coreData)) return "assets/[name]-[hash].js";
          const relative = path.relative(coreData, id).replace(/\.json$/, "");
          const name = relative
            .replace(/^scripts\//, "")
            .replace(/[\\/]/g, "-");
          return `assets/data/${name}-[hash].js`;
        },
      },
    },
  },
});
