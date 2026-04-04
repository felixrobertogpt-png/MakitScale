"use client";

import { useEffect, useState } from "react";
import { getProductos, createVenta, formatCLP, formatNumber } from "@/lib/api";
import type { Producto } from "@/lib/types";
import { TipoProducto, TipoDocumento } from "@/lib/types";
import toast from "react-hot-toast";

interface LineaCotizacion {
  productoId: number;
  nombre: string;
  cantidad: string;
  cpp: number;
  stock: number;
  // User can either force a Precio de Venta OR a Porcentaje de Margen
  precioVenta: string; 
  margenObjetivo: string; 
}

export default function CotizadorPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lineas, setLineas] = useState<LineaCotizacion[]>([]);
  const [form, setForm] = useState({ cliente: "", numeroDoc: "" });

  async function fetchAll() {
    try {
      const p = await getProductos(TipoProducto.PRODUCTO_TERMINADO);
      setProductos(p);
    } catch {
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  function addLinea() {
    setLineas([
      ...lineas,
      { productoId: 0, nombre: "", cantidad: "1", cpp: 0, stock: 0, precioVenta: "0", margenObjetivo: "30" },
    ]);
  }

  function removeLinea(i: number) {
    setLineas(lineas.filter((_, idx) => idx !== i));
  }

  function updateProducto(i: number, productoId: number) {
    const p = productos.find((x) => x.id === productoId);
    if (!p) return;
    const updated = [...lineas];
    
    // Default config upon selection
    const newCpp = p.costoPromedioPonderado || 0;
    const defaultMargen = 30; // 30% default target
    // Price = cpp / (1 - 0.3)
    const suggestedPrice = newCpp > 0 ? newCpp / (1 - (defaultMargen / 100)) : 0;
    
    updated[i] = { 
      ...updated[i], 
      productoId, 
      nombre: p.nombre, 
      cpp: newCpp, 
      stock: p.stockActual,
      precioVenta: Math.round(suggestedPrice).toString(),
      margenObjetivo: defaultMargen.toString()
    };
    setLineas(updated);
  }

  function updateField(i: number, field: "cantidad" | "precioVenta" | "margenObjetivo", value: string) {
    const updated = [...lineas];
    const l = updated[i];
    
    if (field === "margenObjetivo") {
      l.margenObjetivo = value;
      // Recalculate PV based on Margin
      const mNum = parseFloat(value) || 0;
      if (mNum < 100) {
        const pv = l.cpp / (1 - (mNum / 100));
        l.precioVenta = Math.round(pv).toString();
      }
    } else if (field === "precioVenta") {
      l.precioVenta = value;
      // Recalculate Margin based on PV
      const pvNum = parseFloat(value) || 0;
      if (pvNum > 0) {
        const m = ((pvNum - l.cpp) / pvNum) * 100;
        l.margenObjetivo = m.toFixed(1);
      } else {
        l.margenObjetivo = "0";
      }
    } else {
      l[field] = value;
    }
    
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

  async function handleConvertirVenta() {
    if (lineas.length === 0) { toast.error("Agrega al menos un producto"); return; }
    if (!form.cliente) { toast.error("Ingresa el nombre del cliente"); return; }
    
    setSaving(true);
    try {
      await createVenta({
        numeroFactura: form.numeroDoc || `COT-${Date.now().toString().slice(-6)}`,
        cliente: form.cliente,
        tipoDocumento: TipoDocumento.NOTA_VENTA,
        rebajaStock: false, // Las cotizaciones / notas de venta NO rebajan stock físico hasta facturarse de verdad
        fechaVenta: new Date().toISOString().split("T")[0],
        detalles: lineas.map((l) => ({
          producto: { id: l.productoId } as Producto,
          cantidad: parseFloat(l.cantidad),
          precioVenta: parseFloat(l.precioVenta),
        })),
      });
      toast.success("Cotización guardada exitosamente como Nota de Venta");
      setLineas([]);
      setForm({ cliente: "", numeroDoc: "" });
    } catch (err: any) {
      toast.error(err.message || "Error al registrar la cotización");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Cotizador Ágil</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Ajusta márgenes dinámicamente sobre los Costos Reales (CPP) en tiempo real
          </p>
        </div>
      </div>

      <div className="glass-card p-6 overflow-hidden">
        {loading ? (
          <div className="text-center py-10" style={{ color: "var(--text-muted)" }}>Cargando productos...</div>
        ) : (
          <div className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Cliente / Prospecto</label>
                <input className="input-field" placeholder="Nombre de la empresa o cliente" 
                  value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})} />
              </div>
              <div>
                <label className="input-label">Nº Referencia (Opcional)</label>
                <input className="input-field" placeholder="COT-001" 
                  value={form.numeroDoc} onChange={e => setForm({...form, numeroDoc: e.target.value})} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Líneas de Cotización</h3>
                <button className="btn-secondary text-xs" onClick={addLinea} style={{ padding: "6px 12px" }}>
                  + Añadir Producto
                </button>
              </div>

              {lineas.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-xl" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  Pulsa en <span style={{ color: "var(--accent-cyan)" }}>+ Añadir Producto</span> para empezar a cotizar.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-3 px-2">
                    <div className="col-span-4 text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Producto</div>
                    <div className="col-span-1 text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Cant.</div>
                    <div className="col-span-2 text-xs font-semibold uppercase text-right" style={{ color: "var(--text-muted)" }}>Costo (CPP)</div>
                    <div className="col-span-2 text-xs font-semibold uppercase text-center text-emerald-400" >Margen %</div>
                    <div className="col-span-2 text-xs font-semibold uppercase text-right" style={{ color: "var(--text-muted)" }}>Precio Venta</div>
                    <div className="col-span-1"></div>
                  </div>

                  {lineas.map((l, i) => (
                    <div key={i} className="grid grid-cols-12 gap-3 items-center rounded-xl p-3 border" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
                      <div className="col-span-4 flex flex-col gap-1">
                        <select className="input-field py-1 px-2 text-sm" value={l.productoId}
                          onChange={(e) => updateProducto(i, Number(e.target.value))}>
                          <option value={0} disabled>Seleccionar...</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                          ))}
                        </select>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Stock actual: {l.stock > 0 ? formatNumber(l.stock) : "Sin stock"}</span>
                      </div>
                      
                      <div className="col-span-1">
                        <input className="input-field text-center py-1 px-2 text-sm" type="number" step="1" 
                          value={l.cantidad} onChange={(e) => updateField(i, "cantidad", e.target.value)} />
                      </div>

                      <div className="col-span-2 text-right">
                        <p className="text-sm font-medium money" style={{ color: "var(--accent-rose)" }}>{formatCLP(l.cpp)}</p>
                      </div>

                      <div className="col-span-2 relative">
                        <input className="input-field text-center py-1 px-2 text-sm font-bold" type="number" step="0.1"
                          style={{ color: "var(--accent-emerald)", borderColor: "var(--accent-emerald)" }}
                          value={l.margenObjetivo} onChange={(e) => updateField(i, "margenObjetivo", e.target.value)} />
                      </div>

                      <div className="col-span-2 relative">
                        <input className="input-field text-right py-1 px-2 text-sm font-bold money" type="number" step="1"
                          value={l.precioVenta} onChange={(e) => updateField(i, "precioVenta", e.target.value)} />
                      </div>

                      <div className="col-span-1 text-center border-l" style={{ borderColor: "var(--border)" }}>
                        <button type="button" className="text-xl" style={{ color: "var(--accent-rose)" }}
                          onClick={() => removeLinea(i)}>✕</button>
                      </div>
                      
                      {/* Subtotal Line Indicator */}
                      {parseFloat(l.cantidad) > 0 && parseFloat(l.precioVenta) > 0 && (
                        <div className="col-span-12 mt-1 flex justify-end pr-14 text-xs gap-4" style={{ color: "var(--text-muted)" }}>
                          <span>Subtotal: <strong className="money" style={{ color: "var(--text-primary)" }}>{formatCLP(preview[i].subtotal)}</strong></span>
                          <span>Costo Lote: <strong className="money" style={{ color: "var(--accent-rose)" }}>{formatCLP(preview[i].costo)}</strong></span>
                          <span>Beneficio: <strong className="money" style={{ color: "var(--accent-emerald)" }}>{formatCLP(preview[i].margen)}</strong></span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resume Ribbon */}
            {totalVenta > 0 && (
              <div className="rounded-2xl p-5 border shadow-xl" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <h3 className="font-semibold text-sm uppercase mb-4" style={{ color: "var(--text-muted)" }}>Resumen de Cotización</h3>
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Total Venta</p>
                    <p className="text-3xl font-bold money" style={{ color: "var(--text-primary)" }}>{formatCLP(totalVenta)}</p>
                  </div>
                  <div className="border-l pl-6" style={{ borderColor: "var(--border)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Costo Operativo (CPP)</p>
                    <p className="text-3xl font-bold money" style={{ color: "var(--accent-rose)" }}>{formatCLP(totalCosto)}</p>
                  </div>
                  <div className="border-l pl-6" style={{ borderColor: "var(--border)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Margen Global</p>
                    <p className="text-3xl font-bold money" style={{ color: totalMargen >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                      {formatCLP(totalMargen)}
                    </p>
                  </div>
                  <div className="border-l pl-6 pt-1" style={{ borderColor: "var(--border)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>% Rentabilidad</p>
                    <p className="text-4xl font-black money" style={{ color: totalPct >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                      {totalPct.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button className="btn-primary" onClick={handleConvertirVenta} disabled={saving}>
                    {saving ? "Procesando..." : "✅ Guardar como Nota de Venta"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
