import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import viteCompression from "vite-plugin-compression";

// 嘗試讀取環境變數，若不存在則回傳 false
let isDockerCompose = process?.env.DOCKER_COMPOSE === "true"; // eslint-disable-line no-undef

const serverConfig = isDockerCompose
  ? {
      // Docker Compose override config
      headers: { 'X-Robots-Tag': 'noindex, nofollow' },
      host: "0.0.0.0",
      port: 80, // 如有需要可變更 port
      proxy: {
        "/api/dev": {
          target: "http://dashboard-be:8080",
          changeOrigin: true,
          rewrite: (path) => path.replace("/dev", "/v1")
        }
      },
      // Filesystem options
      fs: {
        strict: false, // Setting this to false can help with file system event handling in Docker.
                       // It makes Vite less strict about file serving paths and can improve watcher reliability.
      },
      // Watch options
      watch: {
        usePolling: true,
        interval: 300,        // Slightly faster polling interval
        binaryInterval: 500,  // Slightly faster polling for binary files
        // We are relying on Vite's default behavior to watch `publicDir`.
        // `usePolling: true` applies to this default watching.
        // `fs.strict = false` might further help ensure events are picked up.
        // No explicit `ignored` or `paths` here to avoid overriding default `publicDir` watch logic.
      }
    }
  : {
      headers: { 'X-Robots-Tag': 'noindex, nofollow' },
      host: "0.0.0.0",
      port: 80,
      proxy: {
        "/api": {
          target: "https://citydashboard.taipei/api/v1",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "")
        },
        "/geo_server": {
          target: "https://citydashboard.taipei/geo_server/",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/geo_server/, "")
        }
      }
    };

export default defineConfig({
  plugins: [vue(), viteCompression()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return id
              .toString()
              .split("node_modules/")[1]
              .split("/")[0]
              .toString();
          }
        },
      },
    },
    chunkSizeWarningLimit: 1600,
  },
  base: "/",
  // Ensure publicDir is explicitly set. Vite watches this directory by default.
  publicDir: 'public',
  server: serverConfig,
});