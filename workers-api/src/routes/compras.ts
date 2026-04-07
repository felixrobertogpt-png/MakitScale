// =============================================
// Compra Routes — CRUD + CPP Recalculation
// Ported from CompraService.java
// =============================================

import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../auth";

export const compraRoutes = new Hono<{ Bindings: Env }>();
compraRoutes.use("*", authMiddleware);

compraRoutes.get("/", async (c) => {
  const empresaId = c.get("empresaId");
  const { results: compras } = await c.env.DB.prepare(
    `SELECT c.*, p.razon_social as proveedor_razon_social, p.rut as proveedor_rut
     FROM compra c JOIN proveedor p ON c.proveedor_id = p.id
     WHERE c.empresa_id = ? ORDER BY c.fecha_compra DESC`
  ).bind(empresaId).all();

  // Load detalles for each compra
  for (const compra of compras as any[]) {
    const { results: detalles } = await c.env.DB.prepare(
      `SELECT dc.*, pr.nombre as producto_nombre, pr.codigo as producto_codigo
       FROM detalle_compra dc JOIN producto pr ON dc.producto_id = pr.id
       WHERE dc.compra_id = ?`
    ).bind(compra.id).all();
    compra.detalles = detalles;
    compra.proveedor = { id: compra.proveedor_id, razonSocial: compra.proveedor_razon_social, rut: compra.proveedor_rut };
  }

  return c.json(compras);
});

compraRoutes.get("/:id", async (c) => {
  const empresaId = c.get("empresaId");
  const id = parseInt(c.req.param("id"));
  const compra = await c.env.DB.prepare(
    `SELECT c.*, p.razon_social as proveedor_razon_social FROM compra c
     JOIN proveedor p ON c.proveedor_id = p.id WHERE c.id = ? AND c.empresa_id = ?`
  ).bind(id, empresaId).first<any>();
  if (!compra) return c.json({ message: "Compra no encontrada" }, 404);

  const { results: detalles } = await c.env.DB.prepare(
    `SELECT dc.*, pr.nombre as producto_nombre FROM detalle_compra dc
     JOIN producto pr ON dc.producto_id = pr.id WHERE dc.compra_id = ?`
  ).bind(id).all();
  compra.detalles = detalles;
  compra.proveedor = { id: compra.proveedor_id, razonSocial: compra.proveedor_razon_social };

  return c.json(compra);
});

/**
 * Register a purchase invoice.
 * For each line: calculates subtotal, updates stock, recalculates CPP.
 * Exact port of CompraService.registrarCompra()
 */
compraRoutes.post("/", async (c) => {
  const empresaId = c.get("empresaId");
  const body = await c.req.json<any>();

  const proveedorId = body.proveedor?.id || body.proveedorId;
  let totalFactura = 0;

  // Insert compra header
  const compraRow = await c.env.DB.prepare(
    `INSERT INTO compra (numero_factura, proveedor_id, fecha_compra, total, empresa_id)
     VALUES (?, ?, ?, 0, ?) RETURNING id`
  ).bind(body.numeroFactura, proveedorId, body.fechaCompra, empresaId).first<any>();

  const compraId = compraRow.id;

  // Process each detail line
  for (const det of body.detalles || []) {
    const productoId = det.producto?.id || det.productoId;
    const cantidad = det.cantidad;
    const precioUnitario = det.precioUnitario;
    const subtotal = cantidad * precioUnitario;
    totalFactura += subtotal;

    // Insert detalle
    await c.env.DB.prepare(
      `INSERT INTO detalle_compra (compra_id, producto_id, cantidad, precio_unitario, numero_lote_proveedor, subtotal)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(compraId, productoId, cantidad, precioUnitario, det.numeroLoteProveedor || null, subtotal).run();

    // Update stock + CPP (exact port of ProductoService.actualizarCostoPromedioPonderado)
    const prod = await c.env.DB.prepare("SELECT * FROM producto WHERE id = ?").bind(productoId).first<any>();
    if (prod) {
      const stockAnterior = prod.stock_actual;
      const cppAnterior = prod.costo_promedio_ponderado;
      const valorExistente = stockAnterior * cppAnterior;
      const valorNuevo = cantidad * precioUnitario;
      const nuevoStock = stockAnterior + cantidad;
      const nuevoCpp = nuevoStock > 0 ? (valorExistente + valorNuevo) / nuevoStock : 0;

      await c.env.DB.prepare(
        `UPDATE producto SET stock_actual = ?, costo_promedio_ponderado = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(nuevoStock, nuevoCpp, productoId).run();
    }
  }

  // Update total
  await c.env.DB.prepare("UPDATE compra SET total = ? WHERE id = ?").bind(totalFactura, compraId).run();

  // Return full compra
  const result = await c.env.DB.prepare("SELECT * FROM compra WHERE id = ?").bind(compraId).first();
  return c.json(result, 201);
});
