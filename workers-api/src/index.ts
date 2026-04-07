// =============================================
// MakitScale — Cloudflare Workers API
// Hono + D1 (SQLite) + jose (JWT)
// =============================================

import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { productoRoutes } from "./routes/productos";
import { proveedorRoutes } from "./routes/proveedores";
import { compraRoutes } from "./routes/compras";
import { recetaRoutes } from "./routes/recetas";
import { batchRoutes } from "./routes/batches";
import { ventaRoutes } from "./routes/ventas";

export type Env = {
  DB: D1Database;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
};

const app = new Hono<{ Bindings: Env }>();

// --- CORS ---
app.use("*", async (c, next) => {
  const origin = c.env.CORS_ORIGIN || "*";
  return cors({
    origin: [origin, "https://makit-scale.vercel.app", "http://localhost:3000", "http://localhost:3001"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Authorization"],
    credentials: true,
    maxAge: 3600,
  })(c, next);
});

// --- Health ---
app.get("/", (c) => c.json({ status: "ok", service: "MakitScale API", version: "1.0.0" }));
app.get("/api/health", (c) => c.json({ status: "ok" }));

// --- Routes ---
app.route("/api/auth", authRoutes);
app.route("/api/productos", productoRoutes);
app.route("/api/proveedores", proveedorRoutes);
app.route("/api/compras", compraRoutes);
app.route("/api/recetas", recetaRoutes);
app.route("/api/produccion", batchRoutes);
app.route("/api/ventas", ventaRoutes);

export default app;
