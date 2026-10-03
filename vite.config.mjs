import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: "local-api",
      configureServer(server) {
        Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
        server.middlewares.use("/api", async (req, res) => {
          try {
            req.url = `/api${req.url}`;
            const { default: handler } = await import("./server/handler.mjs");
            await handler(req, res);
          } catch (error) {
            console.error(error);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({ error: "Unable to process this request." }),
            );
          }
        });
      },
    },
  ],
  server: { port: 5173, strictPort: true },
}));
