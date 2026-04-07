// =============================================
// Receta Routes — CRUD with ingredients
// =============================================

import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../auth";

export const recetaRoutes = new Hono<{ Bindings: Env }>();
recetaRoutes.use("*", authMiddleware);

recetaRoutes.get("/", async (c) => {
  const empresaId = c.get("empresaId");
  const { results: recetas } = await c.env.DB.prepare(
    `SELECT r.*, p.nombre as producto_resultante_nombre, p.codigo as producto_resultante_codigo
     FROM receta r JOIN producto p ON r.producto_resultante_id = p.id
     WHERE r.empresa_id = ? ORDER BY r.nombre`
  ).bind(empresaId).all();

  for (const receta of recetas as any[]) {
    const { results: detalles } = await c.env.DB.prepare(
      `SELECT dr.*, p.nombre as producto_nombre, p.codigo as producto_codigo, p.costo_promedio_ponderado as producto_cpp
       FROM detalle_receta dr JOIN producto p ON dr.producto_id = p.id
       WHERE dr.receta_id = ?`
    ).bind(receta.id).all();
    receta.detalles = detalles;
    receta.productoResultante = {
      id: receta.producto_resultante_id,
      nombre: receta.producto_resultante_nombre,
      codigo: receta.producto_resultante_codigo,
    };
  }

  return c.json(recetas);
});

recetaRoutes.get("/:id", async (c) => {
  const empresaId = c.get("empresaId");
  const id = parseInt(c.req.param("id"));
  const receta = await c.env.DB.prepare(
    `SELECT r.*, p.nombre as producto_resultante_nombre FROM receta r
     JOIN producto p ON r.producto_resultante_id = p.id WHERE r.id = ? AND r.empresa_id = ?`
  ).bind(id, empresaId).first<any>();
  if (!receta) return c.json({ message: "Receta no encontrada" }, 404);

  const { results: detalles } = await c.env.DB.prepare(
    `SELECT dr.*, p.nombre as producto_nombre, p.codigo as producto_codigo, p.costo_promedio_ponderado as producto_cpp
     FROM detalle_receta dr JOIN producto p ON dr.producto_id = p.id WHERE dr.receta_id = ?`
  ).bind(id).all();
  receta.detalles = detalles;
  receta.productoResultante = { id: receta.producto_resultante_id, nombre: receta.producto_resultante_nombre };

  return c.json(receta);
});

recetaRoutes.post("/", async (c) => {
  const empresaId = c.get("empresaId");
  const body = await c.req.json<any>();
  const productoId = body.productoResultante?.id || body.productoResultanteId;

  const recetaRow = await c.env.DB.prepare(
    `INSERT INTO receta (nombre, producto_resultante_id, cantidad_resultante, empresa_id)
     VALUES (?, ?, ?, ?) RETURNING id`
  ).bind(body.nombre, productoId, body.cantidadResultante, empresaId).first<any>();

  for (const det of body.detalles || []) {
    const prodId = det.producto?.id || det.productoId;
    await c.env.DB.prepare(
      "INSERT INTO detalle_receta (receta_id, producto_id, cantidad) VALUES (?, ?, ?)"
    ).bind(recetaRow.id, prodId, det.cantidad).run();
  }

  return c.json({ id: recetaRow.id, nombre: body.nombre }, 201);
});

recetaRoutes.put("/:id", async (c) => {
  const empresaId = c.get("empresaId");
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json<any>();
  const productoId = body.productoResultante?.id || body.productoResultanteId;

  await c.env.DB.prepare(
    `UPDATE receta SET nombre=?, producto_resultante_id=?, cantidad_resultante=?, activa=?, updated_at=datetime('now')
     WHERE id=? AND empresa_id=?`
  ).bind(body.nombre, productoId, body.cantidadResultante, body.activa !== undefined ? (body.activa ? 1 : 0) : 1, id, empresaId).run();

  // Replace detalles
  await c.env.DB.prepare("DELETE FROM detalle_receta WHERE receta_id = ?").bind(id).run();
  for (const det of body.detalles || []) {
    const prodId = det.producto?.id || det.productoId;
    await c.env.DB.prepare(
      "INSERT INTO detalle_receta (receta_id, producto_id, cantidad) VALUES (?, ?, ?)"
    ).bind(id, prodId, det.cantidad).run();
  }

  return c.json({ id, nombre: body.nombre });
});
