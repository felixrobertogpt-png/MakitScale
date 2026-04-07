// =============================================
// Proveedor Routes — CRUD
// =============================================

import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../auth";

export const proveedorRoutes = new Hono<{ Bindings: Env }>();
proveedorRoutes.use("*", authMiddleware);

proveedorRoutes.get("/", async (c) => {
  const empresaId = c.get("empresaId");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM proveedor WHERE empresa_id = ? ORDER BY razon_social"
  ).bind(empresaId).all();
  return c.json(results);
});

proveedorRoutes.get("/:id", async (c) => {
  const empresaId = c.get("empresaId");
  const id = parseInt(c.req.param("id"));
  const row = await c.env.DB.prepare(
    "SELECT * FROM proveedor WHERE id = ? AND empresa_id = ?"
  ).bind(id, empresaId).first();
  if (!row) return c.json({ message: "Proveedor no encontrado" }, 404);
  return c.json(row);
});

proveedorRoutes.post("/", async (c) => {
  const empresaId = c.get("empresaId");
  const body = await c.req.json<any>();
  const result = await c.env.DB.prepare(
    `INSERT INTO proveedor (rut, razon_social, contacto, email, telefono, empresa_id)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING *`
  ).bind(body.rut, body.razonSocial, body.contacto || null, body.email || null, body.telefono || null, empresaId).first();
  return c.json(result, 201);
});

proveedorRoutes.put("/:id", async (c) => {
  const empresaId = c.get("empresaId");
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json<any>();
  const result = await c.env.DB.prepare(
    `UPDATE proveedor SET rut=?, razon_social=?, contacto=?, email=?, telefono=?, activo=?
     WHERE id=? AND empresa_id=? RETURNING *`
  ).bind(
    body.rut, body.razonSocial, body.contacto || null, body.email || null, body.telefono || null,
    body.activo !== undefined ? (body.activo ? 1 : 0) : 1, id, empresaId
  ).first();
  if (!result) return c.json({ message: "Proveedor no encontrado" }, 404);
  return c.json(result);
});
