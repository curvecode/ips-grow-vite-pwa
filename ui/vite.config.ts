import { defineConfig, loadEnv } from "vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "");

  // Parse APP_PORT from environment, default to 5173 if not set
  const port = parseInt(env.APP_PORT || "5173", 10);

  return {
    resolve: {
      alias: {
        "@common": path.resolve(__dirname, "../common"),
      },
    },
    server: {
      port: port,
      open: true,
      hmr: {
        // Enable HMR for better development experience
        overlay: true,
      },
    },
    build: {
      outDir: "dist",
      // Enable code splitting using ES modules
      rollupOptions: {
        output: {
          // Manual chunks for code splitting
          manualChunks(id) {
            // Separate list page into its own chunk
            if (id.includes("pages/list")) {
              return "list-page";
            }
            // Separate vendor chunks
            if (id.includes("node_modules")) {
              return "vendor";
            }
          },
          // Use ES modules format
          format: "es",
        },
      },
      // Target ES modules
      target: "esnext",
      modulePreload: {
        polyfill: true,
      },
    },
    // Enable ES modules
    esbuild: {
      target: "esnext",
    },
    publicDir: "public",
    // Optimize dependencies for better HMR
    optimizeDeps: {
      include: [],
      exclude: ["src/pages/list.ts"], // Exclude list page from pre-bundling for lazy loading
    },
  };
});
