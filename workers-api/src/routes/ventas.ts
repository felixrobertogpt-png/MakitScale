// =============================================
// Venta Routes — Sales with real margin calculation
// Exact port of VentaService.registrarVenta()
// =============================================

import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../auth";

export const ventaRoutes = new Hono<{ Bindings: Env }>();
ventaRoutes.use("*", authMiddleware);

ventaRoutes.get("/", async (c) => {
  const empresaId = c.get("empresaId");
  const { results: ventas } = await c.env.DB.prepare(
    "SELECT * FROM venta WHERE empresa_id = ? ORDER BY fecha_venta DESC"
  ).bind(empresaId).all();

  for (const venta of ventas as any[]) {
    const { results: detalles } = await c.env.DB.prepare(
      `SELECT dv.*, p.nombre as producto_nombre, p.codigo as producto_codigo
       FROM detalle_venta dv JOIN producto p ON dv.producto_id = p.id
       WHERE dv.venta_id = ?`
    ).bind(venta.id).all();
    venta.detalles = detalles;
  }

  return c.json(ventas);
});

ventaRoutes.get("/:id", async (c) => {
  const empresaId = c.get("empresaId");
  const id = parseInt(c.req.param("id"));
  const venta = await c.env.DB.prepare(
    "SELECT * FROM venta WHERE id = ? AND empresa_id = ?"
  ).bind(id, empresaId).first<any>();
  if (!venta) return c.json({ message: "Venta no encontrada" }, 404);

  const { results: detalles } = await c.env.DB.prepare(
    `SELECT dv.*, p.nombre as producto_nombre FROM detalle_venta dv
     JOIN producto p ON dv.producto_id = p.id WHERE dv.venta_id = ?`
  ).bind(id).all();
  venta.detalles = detalles;

  return c.json(venta);
});

/**
 * Register a sale with real margin calculation.
 * Exact port of VentaService.registrarVenta()
 *
 * For each line:
 *   1. Get current CPP (real cost snapshot)
 *   2. subtotalVenta = cantidad × precioVenta
 *   3. costoReal = cantidad × CPP
 *   4. margenLinea = subtotalVenta - costoReal
 *   5. Deduct stock (if rebajaStock = true)
 */
ventaRoutes.post("/", async (c) => {
  const empresaId = c.get("empresaId");
  const body = await c.req.json<any>();

  const rebajaStock = body.rebajaStock !== undefined ? body.rebajaStock : true;

  // Insert venta header
  const ventaRow = await c.env.DB.prepare(
    `INSERT INTO venta (numero_factura, rut_cliente, cliente, tipo_documento, rebaja_stock, fecha_venta, empresa_id)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    body.numeroFactura, body.rutCliente, body.cliente,
    body.tipoDocumento || "FACTURA", rebajaStock ? 1 : 0,
    body.fechaVenta, empresaId
  ).first<any>();

  let totalVenta = 0;
  let costoRealTotal = 0;

  for (const det of body.detalles || []) {
    const productoId = det.producto?.id || det.productoId;
    const prod = await c.env.DB.prepare("SELECT * FROM producto WHERE id = ?").bind(productoId).first<any>();
    if (!prod) continue;

    const cantidad = det.cantidad;
    const precioVenta = det.precioVenta;

    // Verify stock
    if (prod.stock_actual < cantidad) {
      return c.json({
        message: `Stock insuficiente de '${prod.nombre}': disponible=${prod.stock_actual.toFixed(4)}, requerido=${cantidad.toFixed(4)}`
      }, 400);
    }

    // Snapshot CPP
    const cppSnapshot = prod.costo_promedio_ponderado;
    const subtotalVenta = cantidad * precioVenta;
    const costoReal = cantidad * cppSnapshot;
    const margenLinea = subtotalVenta - costoReal;

    totalVenta += subtotalVenta;
    costoRealTotal += costoReal;

    // Insert detail
    await c.env.DB.prepare(
      `INSERT INTO detalle_venta (venta_id, producto_id, batch_produccion_id, cantidad, precio_venta,
       cpp_al_venta, subtotal_venta, costo_real, margen_linea)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ventaRow.id, productoId, det.loteProduccion?.id || det.batchProduccionId || null,
      cantidad, precioVenta, cppSnapshot, subtotalVenta, costoReal, margenLinea
    ).run();

    // Deduct stock
    if (rebajaStock) {
      await c.env.DB.prepare(
        "UPDATE producto SET stock_actual = stock_actual - ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(cantidad, productoId).run();
    }
  }

  // Calculate margin
  const margenBruto = totalVenta - costoRealTotal;
  const porcentajeMargen = costoRealTotal > 0
    ? (margenBruto / costoRealTotal) * 100
    : (totalVenta > 0 ? 100 : 0);

  // Update venta totals
  await c.env.DB.prepare(
    `UPDATE venta SET total_venta=?, costo_real_total=?, margen_bruto=?, porcentaje_margen=? WHERE id=?`
  ).bind(totalVenta, costoRealTotal, margenBruto, porcentajeMargen, ventaRow.id).run();

  const result = await c.env.DB.prepare("SELECT * FROM venta WHERE id = ?").bind(ventaRow.id).first();
  return c.json(result, 201);
});
