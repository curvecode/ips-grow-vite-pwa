import { defineConfig, loadEnv } from "vite";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import obfuscator from 'rollup-plugin-obfuscator';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, __dirname, "");
  console.log("Mode:", mode);
  console.log("Loading env from:", __dirname);

  // Parse APP_PORT from environment, default to 5173 if not set
  const port = parseInt(process.env.APP_PORT || env.APP_PORT || "5173", 10);

  return {
    plugins: [
      visualizer({
        open: false, // Keep bundle report generation silent in CI
        filename: "dist/stats.html", // Bundle report output
        gzipSize: true, // Surface gzip size
        brotliSize: true, // Surface brotli size
      }),

    ],
    // Inline build-time constants for app code
    define: {
      __APP_VERSION__: JSON.stringify(env.APP_VERSION || "dev"),
    },
    resolve: {
      alias: {
        "@common": path.resolve(__dirname, "../common"),
      },
    },
    server: {
      port: port,
      open: true,
      hmr: {
        overlay: true,
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true, // Emit sourcemaps for easier debugging
      reportCompressedSize: true, // Show gzip/brotli sizes in output logs
      minify: "terser", // Fast minifier suitable for Vite
      terserOptions: {
        compress: {
          drop_console: true, // Remove console.log
          drop_debugger: true, // Remove debugger statements
          pure_funcs: ["console.log", "console.info"], // Remove specific functions
        },
        mangle: {
          toplevel: true, // Mangle top-level variable names
        },
        format: {
          comments: false, // Remove all comments
        },
      },
      cssCodeSplit: true, // Split CSS per-entry to trim unused styles
      assetsInlineLimit: 4096, // Inline small assets as data URIs 4kib
      emptyOutDir: true, // Clean dist/ before rebuild
      // Enable code splitting using ES modules
      rollupOptions: {
        plugins: [
          obfuscator({
            compact: true,
            controlFlowFlattening: true,
            deadCodeInjection: true,
            stringArray: true,
            stringArrayThreshold: 0.75,
          }),
        ],
        output: {
          entryFileNames: "assets/[name].ips.[hash].js",
          chunkFileNames: "assets/[name].ips.[hash].js", // Stable chunk naming
          assetFileNames: "assets/[name].[hash][extname]", // Static asset naming
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
