"use client";

import { useEffect, useState } from "react";
import { getProductos, getVentas, createVenta, formatCLP, formatNumber } from "@/lib/api";
import type { Producto, Venta } from "@/lib/types";
import { TipoProducto } from "@/lib/types";
import toast from "react-hot-toast";

interface LineaVenta {
  productoId: number;
  nombre: string;
  cantidad: string;
  precioVenta: string;
  cpp: number;
  stock: number;
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    numeroFactura: "",
    cliente: "",
    fechaVenta: "",
    tipoDocumento: "FACTURA",
    rebajaStock: true
  });
  const [lineas, setLineas] = useState<LineaVenta[]>([]);
  const [detailVenta, setDetailVenta] = useState<Venta | null>(null);

  async function fetchAll() {
    try {
      const [v, p] = await Promise.all([getVentas(), getProductos(TipoProducto.PRODUCTO_TERMINADO)]);
      setVentas(v);
      setProductos(p);
    } catch {
      console.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  function addLinea() {
    setLineas([...lineas, { productoId: 0, nombre: "", cantidad: "", precioVenta: "", cpp: 0, stock: 0 }]);
  }

  function removeLinea(i: number) {
    setLineas(lineas.filter((_, idx) => idx !== i));
  }

  function updateProducto(i: number, productoId: number) {
    const p = productos.find((x) => x.id === productoId);
    if (!p) return;
    const updated = [...lineas];
    updated[i] = { ...updated[i], productoId, nombre: p.nombre, cpp: p.costoPromedioPonderado, stock: p.stockActual };
    setLineas(updated);
  }

  function updateField(i: number, field: "cantidad" | "precioVenta", value: string) {
    const updated = [...lineas];
    updated[i] = { ...updated[i], [field]: value };
    setLineas(updated);
  }

  // Preview calculations
  const preview = lineas.map((l) => {
    const cant = parseFloat(l.cantidad) || 0;
    const pv = parseFloat(l.precioVenta) || 0;
    const subtotal = cant * pv;
    const costo = cant * l.cpp;
    const margen = subtotal - costo;
    const pct = subtotal > 0 ? (margen / subtotal) * 100 : 0;
    return { subtotal, costo, margen, pct };
  });
  const totalVenta = preview.reduce((s, p) => s + p.subtotal, 0);
  const totalCosto = preview.reduce((s, p) => s + p.costo, 0);
  const totalMargen = totalVenta - totalCosto;
  const totalPct = totalVenta > 0 ? (totalMargen / totalVenta) * 100 : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lineas.length === 0) { toast.error("Agrega al menos un producto"); return; }
    setSaving(true);
    try {
      await createVenta({
        numeroFactura: form.numeroFactura,
        cliente: form.cliente,
        tipoDocumento: form.tipoDocumento as any,
        rebajaStock: form.rebajaStock,
        fechaVenta: form.fechaVenta,
        detalles: lineas.map((l) => ({
          producto: { id: l.productoId } as Producto,
          cantidad: parseFloat(l.cantidad),
          precioVenta: parseFloat(l.precioVenta),
        })),
      });
      setShowModal(false);
      setForm({ numeroFactura: "", cliente: "", fechaVenta: "", tipoDocumento: "FACTURA", rebajaStock: true });
      setLineas([]);
      fetchAll();
      toast.success("Venta registrada exitosamente");
    } catch (err: any) {
      toast.error(err.message || "Error al registrar la venta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Ventas</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Facturas de venta con márgenes reales calculados automáticamente (CPP vs Precio Venta)
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setShowModal(true); if (lineas.length === 0) addLinea(); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Registrar Venta
        </button>
      </div>

      {/* Ventas Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Historial de Ventas</h2>
        </div>
        {loading ? (
          <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>Cargando...</div>
        ) : ventas.length === 0 ? (
          <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-30">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <p>No hay ventas registradas.</p>
            <p className="text-xs mt-1">Primero produce lotes para tener stock disponible.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total Venta</th>
                <th>Costo Real</th>
                <th>Margen</th>
                <th>% Margen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id}>
                  <td className="money font-medium" style={{ color: "var(--accent-cyan)" }}>{v.numeroFactura}</td>
                  <td style={{ color: "var(--text-primary)" }}>{v.cliente}</td>
                  <td className="money">{v.fechaVenta}</td>
                  <td className="money">{formatCLP(v.totalVenta || 0)}</td>
                  <td className="money" style={{ color: "var(--accent-rose)" }}>{formatCLP(v.costoRealTotal || 0)}</td>
                  <td className="money font-semibold" style={{ color: (v.margenBruto || 0) >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                    {formatCLP(v.margenBruto || 0)}
                  </td>
                  <td className="money font-semibold" style={{ color: (v.porcentajeMargen || 0) >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                    {(v.porcentajeMargen || 0).toFixed(1)}%
                  </td>
                  <td>
                    <button
                      className="text-xs"
                      style={{ color: "var(--accent-cyan)" }}
                      onClick={() => setDetailVenta(v)}
                    >
                      Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Panel */}
      {detailVenta && (
        <div className="glass-card overflow-hidden mt-6">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Detalle: {detailVenta.numeroFactura} — {detailVenta.cliente}
            </h2>
            <button className="text-xs" style={{ color: "var(--text-muted)" }} onClick={() => setDetailVenta(null)}>✕ Cerrar</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Venta</th>
                <th>CPP (costo real)</th>
                <th>Subtotal</th>
                <th>Costo Real</th>
                <th>Margen</th>
              </tr>
            </thead>
            <tbody>
              {detailVenta.detalles?.map((d, i) => (
                <tr key={i}>
                  <td style={{ color: "var(--text-primary)" }}>
                    {d.producto?.nombre || "—"}
                    {d.loteProduccion && (
                      <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                        <span className="opacity-70">Lote origen:</span> <span className="font-mono text-[10px]" style={{ color: "var(--accent-cyan)" }}>{d.loteProduccion.numeroLote}</span>
                      </div>
                    )}
                  </td>
                  <td className="money">{formatNumber(d.cantidad)}</td>
                  <td className="money">{formatCLP(d.precioVenta)}</td>
                  <td className="money" style={{ color: "var(--accent-amber)" }}>{formatCLP(d.cppAlVenta || 0)}</td>
                  <td className="money">{formatCLP(d.subtotalVenta || 0)}</td>
                  <td className="money" style={{ color: "var(--accent-rose)" }}>{formatCLP(d.costoReal || 0)}</td>
                  <td className="money font-semibold" style={{ color: (d.margenLinea || 0) >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                    {formatCLP(d.margenLinea || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-4 border-t grid grid-cols-3 gap-4" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
            <div>
              <p className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>Total Venta</p>
              <p className="text-lg font-bold money" style={{ color: "var(--text-primary)" }}>{formatCLP(detailVenta.totalVenta || 0)}</p>
            </div>
            <div>
              <p className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>Costo Real</p>
              <p className="text-lg font-bold money" style={{ color: "var(--accent-rose)" }}>{formatCLP(detailVenta.costoRealTotal || 0)}</p>
            </div>
            <div>
              <p className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>Margen ({(detailVenta.porcentajeMargen || 0).toFixed(1)}%)</p>
              <p className="text-lg font-bold money" style={{ color: "var(--accent-emerald)" }}>{formatCLP(detailVenta.margenBruto || 0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Registrar Venta Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: "780px", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-emerald-glow)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Registrar Venta</h2>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>El margen se calcula automáticamente con CPP</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-1">
                  <label className="input-label">Documento</label>
                  <select className="input-field" value={form.tipoDocumento}
                    onChange={(e) => setForm({ ...form, tipoDocumento: e.target.value })}>
                    <option value="FACTURA">Factura</option>
                    <option value="GUIA_DESPACHO">Guía de Despacho</option>
                    <option value="NOTA_VENTA">Nota Venta / Cot.</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="input-label">Nº Doc.</label>
                  <input className="input-field" placeholder="FV-001" value={form.numeroFactura}
                    onChange={(e) => setForm({ ...form, numeroFactura: e.target.value })} required />
                </div>
                <div className="col-span-1">
                  <label className="input-label">Cliente</label>
                  <input className="input-field" placeholder="Nombre del cliente" value={form.cliente}
                    onChange={(e) => setForm({ ...form, cliente: e.target.value })} required />
                </div>
                <div className="col-span-1">
                  <label className="input-label">Fecha</label>
                  <input className="input-field" type="date" value={form.fechaVenta}
                    onChange={(e) => setForm({ ...form, fechaVenta: e.target.value })} required />
                </div>
                <div className="col-span-1 flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded" 
                      style={{ accentColor: "var(--accent-cyan)" }}
                      checked={form.rebajaStock}
                      onChange={(e) => setForm({ ...form, rebajaStock: e.target.checked })}
                    />
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                      Descontar Stock
                    </span>
                  </label>
                </div>
              </div>

              {/* Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="input-label" style={{ marginBottom: 0 }}>📦 Productos</span>
                  <button type="button" className="text-xs font-medium" style={{ color: "var(--accent-cyan)" }} onClick={addLinea}>
                    + Agregar línea
                  </button>
                </div>
                <div className="grid grid-cols-12 gap-2 mb-1 px-1">
                  <span className="col-span-4 text-xs font-medium uppercase" style={{ color: "var(--text-muted)" }}>Producto</span>
                  <span className="col-span-2 text-xs font-medium uppercase" style={{ color: "var(--text-muted)" }}>Cantidad</span>
                  <span className="col-span-2 text-xs font-medium uppercase" style={{ color: "var(--text-muted)" }}>Precio Venta</span>
                  <span className="col-span-2 text-xs font-medium uppercase" style={{ color: "var(--text-muted)" }}>Margen</span>
                  <span className="col-span-1 text-xs font-medium uppercase" style={{ color: "var(--text-muted)" }}>%</span>
                  <span className="col-span-1"></span>
                </div>
                <div className="space-y-2">
                  {lineas.map((l, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                      <select className="input-field col-span-4" value={l.productoId}
                        onChange={(e) => updateProducto(i, Number(e.target.value))}>
                        <option value={0} disabled>Seleccionar...</option>
                        {productos.map((p) => (
                          <option key={p.id} value={p.id}>{p.codigo} — {p.nombre} (stock: {formatNumber(p.stockActual)})</option>
                        ))}
                      </select>
                      <input className="input-field col-span-2" type="number" step="0.01" placeholder="Cant."
                        value={l.cantidad} onChange={(e) => updateField(i, "cantidad", e.target.value)} />
                      <input className="input-field col-span-2" type="number" step="1" placeholder="$ Precio"
                        value={l.precioVenta} onChange={(e) => updateField(i, "precioVenta", e.target.value)} />
                      <div className="col-span-2 text-sm money px-2 font-medium"
                        style={{ color: preview[i]?.margen >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                        {preview[i]?.margen !== 0 ? formatCLP(preview[i].margen) : "—"}
                      </div>
                      <div className="col-span-1 text-xs money px-1"
                        style={{ color: preview[i]?.pct >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                        {preview[i]?.pct !== 0 ? preview[i].pct.toFixed(1) + "%" : "—"}
                      </div>
                      <button type="button" className="col-span-1 text-center" style={{ color: "var(--accent-rose)" }}
                        onClick={() => removeLinea(i)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Preview */}
              {totalVenta > 0 && (
                <div className="rounded-xl p-4 border" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
                  <p className="text-xs uppercase font-medium mb-3" style={{ color: "var(--text-muted)" }}>
                    💰 Vista previa de margen
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Venta</p>
                      <p className="text-lg font-bold money">{formatCLP(totalVenta)}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Costo Real (CPP)</p>
                      <p className="text-lg font-bold money" style={{ color: "var(--accent-rose)" }}>{formatCLP(totalCosto)}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Margen Bruto</p>
                      <p className="text-lg font-bold money" style={{ color: totalMargen >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                        {formatCLP(totalMargen)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>% Margen</p>
                      <p className="text-lg font-bold money" style={{ color: totalPct >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                        {totalPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
                  {saving ? "Registrando..." : "💾 Registrar Venta"}
                </button>
                <button type="button" className="btn-secondary flex-1 justify-center" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
