// =============================================
// Producto Routes — CRUD + CPP
// =============================================

import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../auth";

export const productoRoutes = new Hono<{ Bindings: Env }>();
productoRoutes.use("*", authMiddleware);

// LIST all productos for tenant
productoRoutes.get("/", async (c) => {
  const empresaId = c.get("empresaId");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM producto WHERE empresa_id = ? ORDER BY nombre"
  ).bind(empresaId).all();
  return c.json(results);
});

// LIST by tipo
productoRoutes.get("/tipo/:tipo", async (c) => {
  const empresaId = c.get("empresaId");
  const tipo = c.req.param("tipo");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM producto WHERE empresa_id = ? AND tipo_producto = ? ORDER BY nombre"
  ).bind(empresaId, tipo).all();
  return c.json(results);
});

// GET by id
productoRoutes.get("/:id", async (c) => {
  const empresaId = c.get("empresaId");
  const id = parseInt(c.req.param("id"));
  const row = await c.env.DB.prepare(
    "SELECT * FROM producto WHERE id = ? AND empresa_id = ?"
  ).bind(id, empresaId).first();
  if (!row) return c.json({ message: "Producto no encontrado" }, 404);
  return c.json(row);
});

// CREATE
productoRoutes.post("/", async (c) => {
  const empresaId = c.get("empresaId");
  const body = await c.req.json<any>();
  const result = await c.env.DB.prepare(
    `INSERT INTO producto (codigo, nombre, tipo_producto, unidad_medida, stock_actual, costo_promedio_ponderado, empresa_id)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`
  ).bind(
    body.codigo, body.nombre, body.tipoProducto,
    body.unidadMedida?.nombre || body.unidadMedida || null,
    body.stockActual || 0, body.costoPromedioPonderado || 0, empresaId
  ).first();
  return c.json(result, 201);
});

// UPDATE
productoRoutes.put("/:id", async (c) => {
  const empresaId = c.get("empresaId");
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json<any>();
  const result = await c.env.DB.prepare(
    `UPDATE producto SET codigo=?, nombre=?, tipo_producto=?, unidad_medida=?, activo=?, updated_at=datetime('now')
     WHERE id=? AND empresa_id=? RETURNING *`
  ).bind(
    body.codigo, body.nombre, body.tipoProducto,
    body.unidadMedida?.nombre || body.unidadMedida || null,
    body.activo !== undefined ? (body.activo ? 1 : 0) : 1,
    id, empresaId
  ).first();
  if (!result) return c.json({ message: "Producto no encontrado" }, 404);
  return c.json(result);
});
