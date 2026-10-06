import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import {
  assistantFeatureEnabled,
  assistantInQa,
} from "./deployment-policy.mjs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __EDIV_ASSISTANT_ENABLED__: JSON.stringify(assistantFeatureEnabled()),
    __EDIV_QA_ENVIRONMENT__: JSON.stringify(
      process.env.VERCEL_ENV !== "production" &&
        (assistantInQa || process.env.VERCEL_GIT_COMMIT_REF === "QA"),
    ),
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.EDIV_API_PROXY_TARGET || "http://127.0.0.1:3001",
        changeOrigin: false,
      },
    },
  },
});
