// =============================================
// Batch Producción Routes — Production with traceability
// Exact port of BatchProduccionService.producir()
// =============================================

import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../auth";

export const batchRoutes = new Hono<{ Bindings: Env }>();
batchRoutes.use("*", authMiddleware);

batchRoutes.get("/", async (c) => {
  const empresaId = c.get("empresaId");
  const { results: batches } = await c.env.DB.prepare(
    `SELECT b.*, r.nombre as receta_nombre, p.nombre as producto_resultante_nombre, p.codigo as producto_resultante_codigo
     FROM batch_produccion b
     JOIN receta r ON b.receta_id = r.id
     JOIN producto p ON b.producto_resultante_id = p.id
     WHERE b.empresa_id = ? ORDER BY b.created_at DESC`
  ).bind(empresaId).all();

  for (const batch of batches as any[]) {
    const { results: consumos } = await c.env.DB.prepare(
      `SELECT dbc.*, p.nombre as producto_nombre, p.codigo as producto_codigo
       FROM detalle_batch_consumo dbc JOIN producto p ON dbc.producto_id = p.id
       WHERE dbc.batch_id = ?`
    ).bind(batch.id).all();
    batch.consumos = consumos;
    batch.receta = { id: batch.receta_id, nombre: batch.receta_nombre };
    batch.productoResultante = {
      id: batch.producto_resultante_id,
      nombre: batch.producto_resultante_nombre,
      codigo: batch.producto_resultante_codigo,
    };
  }

  return c.json(batches);
});

batchRoutes.get("/:id", async (c) => {
  const empresaId = c.get("empresaId");
  const id = parseInt(c.req.param("id"));
  const batch = await c.env.DB.prepare(
    `SELECT b.*, r.nombre as receta_nombre, p.nombre as producto_resultante_nombre
     FROM batch_produccion b JOIN receta r ON b.receta_id = r.id
     JOIN producto p ON b.producto_resultante_id = p.id
     WHERE b.id = ? AND b.empresa_id = ?`
  ).bind(id, empresaId).first<any>();
  if (!batch) return c.json({ message: "Lote no encontrado" }, 404);

  const { results: consumos } = await c.env.DB.prepare(
    `SELECT dbc.*, p.nombre as producto_nombre FROM detalle_batch_consumo dbc
     JOIN producto p ON dbc.producto_id = p.id WHERE dbc.batch_id = ?`
  ).bind(id).all();
  batch.consumos = consumos;
  batch.receta = { id: batch.receta_id, nombre: batch.receta_nombre };
  batch.productoResultante = { id: batch.producto_resultante_id, nombre: batch.producto_resultante_nombre };

  return c.json(batch);
});

/**
 * Produce a batch — exact port of BatchProduccionService.producir()
 *
 * Body: { recetaId, multiplicador, costosOcultos, tipoContencion, empaques }
 *
 * Steps:
 * 1. Load recipe and calculate quantity
 * 2. For each ingredient: verify stock, snapshot CPP, deduct stock
 * 3. Process packaging if ENVASADO
 * 4. Calculate batch costs (materias + ocultos)
 * 5. Add finished product to inventory with updated CPP
 */
batchRoutes.post("/", async (c) => {
  const empresaId = c.get("empresaId");
  const body = await c.req.json<any>();
  const { recetaId, multiplicador = 1, costosOcultos = 0, tipoContencion = "GRANEL", empaques } = body;

  // Load recipe with detalles
  const receta = await c.env.DB.prepare(
    "SELECT * FROM receta WHERE id = ?"
  ).bind(recetaId).first<any>();
  if (!receta) return c.json({ message: "Receta no encontrada" }, 404);

  const { results: detallesReceta } = await c.env.DB.prepare(
    "SELECT * FROM detalle_receta WHERE receta_id = ?"
  ).bind(recetaId).all<any>();

  const cantidadProducida = receta.cantidad_resultante * multiplicador;

  // Generate lot number
  const countResult = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM batch_produccion").first<any>();
  const lotNum = (countResult?.cnt || 0) + 1;
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const numeroLote = `LOT-${today}-${String(lotNum).padStart(3, "0")}`;

  // Insert batch
  const batchRow = await c.env.DB.prepare(
    `INSERT INTO batch_produccion (numero_lote, receta_id, producto_resultante_id, cantidad_producida,
     costos_ocultos, tipo_contencion, estado, empresa_id)
     VALUES (?, ?, ?, ?, ?, ?, 'COMPLETADO', ?) RETURNING id`
  ).bind(numeroLote, recetaId, receta.producto_resultante_id, cantidadProducida, costosOcultos, tipoContencion, empresaId).first<any>();

  let costoMaterias = 0;

  // Process each ingredient
  for (const det of detallesReceta) {
    const prod = await c.env.DB.prepare("SELECT * FROM producto WHERE id = ?").bind(det.producto_id).first<any>();
    if (!prod) continue;

    const cantidadConsumo = det.cantidad * multiplicador;

    // Verify stock
    if (prod.stock_actual < cantidadConsumo) {
      return c.json({
        message: `Stock insuficiente de '${prod.nombre}': disponible=${prod.stock_actual.toFixed(4)}, requerido=${cantidadConsumo.toFixed(4)}`
      }, 400);
    }

    const cppSnapshot = prod.costo_promedio_ponderado;
    const costoLinea = cantidadConsumo * cppSnapshot;
    costoMaterias += costoLinea;

    // Deduct stock
    await c.env.DB.prepare(
      "UPDATE producto SET stock_actual = stock_actual - ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(cantidadConsumo, det.producto_id).run();

    // Record consumption
    await c.env.DB.prepare(
      `INSERT INTO detalle_batch_consumo (batch_id, producto_id, cantidad, cpp_al_consumo, costo_linea)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(batchRow.id, det.producto_id, cantidadConsumo, cppSnapshot, costoLinea).run();
  }

  // Process packaging (ENVASADO)
  if (tipoContencion === "ENVASADO" && empaques) {
    for (const [prodId, qty] of Object.entries(empaques)) {
      const emp = await c.env.DB.prepare("SELECT * FROM producto WHERE id = ?").bind(parseInt(prodId)).first<any>();
      if (!emp) continue;
      const cantConsumo = qty as number;
      if (emp.stock_actual < cantConsumo) {
        return c.json({
          message: `Stock insuficiente de empaque '${emp.nombre}': disponible=${emp.stock_actual.toFixed(4)}, requerido=${cantConsumo.toFixed(4)}`
        }, 400);
      }
      const cppSnap = emp.costo_promedio_ponderado;
      const costoLn = cantConsumo * cppSnap;
      costoMaterias += costoLn;

      await c.env.DB.prepare("UPDATE producto SET stock_actual = stock_actual - ? WHERE id = ?").bind(cantConsumo, parseInt(prodId)).run();
      await c.env.DB.prepare(
        "INSERT INTO detalle_batch_consumo (batch_id, producto_id, cantidad, cpp_al_consumo, costo_linea) VALUES (?, ?, ?, ?, ?)"
      ).bind(batchRow.id, parseInt(prodId), cantConsumo, cppSnap, costoLn).run();
    }
  }

  // Calculate costs
  const costoTotal = costoMaterias + costosOcultos;
  const costoUnitario = cantidadProducida > 0 ? costoTotal / cantidadProducida : 0;

  await c.env.DB.prepare(
    "UPDATE batch_produccion SET costo_materias=?, costo_total=?, costo_unitario=? WHERE id=?"
  ).bind(costoMaterias, costoTotal, costoUnitario, batchRow.id).run();

  // Add finished product to inventory with updated CPP
  const prodTerminado = await c.env.DB.prepare(
    "SELECT * FROM producto WHERE id = ?"
  ).bind(receta.producto_resultante_id).first<any>();

  if (prodTerminado) {
    const stockAnterior = prodTerminado.stock_actual;
    const cppAnterior = prodTerminado.costo_promedio_ponderado;
    const nuevoStock = stockAnterior + cantidadProducida;
    const nuevoCPP = nuevoStock > 0
      ? (stockAnterior * cppAnterior + cantidadProducida * costoUnitario) / nuevoStock
      : costoUnitario;

    await c.env.DB.prepare(
      "UPDATE producto SET stock_actual=?, costo_promedio_ponderado=?, updated_at=datetime('now') WHERE id=?"
    ).bind(nuevoStock, nuevoCPP, receta.producto_resultante_id).run();
  }

  // Return full batch
  const result = await c.env.DB.prepare("SELECT * FROM batch_produccion WHERE id = ?").bind(batchRow.id).first();
  return c.json(result, 201);
});
