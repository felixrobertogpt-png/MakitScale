"use client";

import { useEffect, useState } from "react";
import { getRecetas, getBatches, producirBatch, getProductos, formatCLP, formatNumber } from "@/lib/api";
import type { Receta, BatchProduccion, Producto } from "@/lib/types";
import { TipoProducto } from "@/lib/types";
import toast from "react-hot-toast";

export default function ProduccionPage() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [batches, setBatches] = useState<BatchProduccion[]>([]);
  const [empaquesData, setEmpaquesData] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [producing, setProducing] = useState(false);
  
  const [form, setForm] = useState({
    recetaId: 0,
    multiplicador: "1",
    costosOcultos: "0",
    tipoContencion: "GRANEL",
  });
  const [empaques, setEmpaques] = useState<{productoId: number, cantidad: string}[]>([]);
  const [lastResult, setLastResult] = useState<BatchProduccion | null>(null);

  async function fetchAll() {
    try {
      const [r, b, emp] = await Promise.all([getRecetas(), getBatches(), getProductos(TipoProducto.EMPAQUE_INSUMO)]);
      setRecetas(r);
      setBatches(b);
      setEmpaquesData(emp);
    } catch {
      console.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleProducir(e: React.FormEvent) {
    e.preventDefault();
    setProducing(true);
    try {
      const result = await producirBatch({
        recetaId: form.recetaId,
        multiplicador: parseFloat(form.multiplicador),
        costosOcultos: parseFloat(form.costosOcultos) || 0,
        tipoContencion: form.tipoContencion,
        empaques: form.tipoContencion === "ENVASADO" 
          ? empaques.map(e => ({ productoId: e.productoId, cantidad: parseFloat(e.cantidad) || 0 }))
          : undefined,
      });
      setLastResult(result);
      setShowModal(false);
      setForm({ recetaId: 0, multiplicador: "1", costosOcultos: "0", tipoContencion: "GRANEL" });
      setEmpaques([]);
      fetchAll();
      toast.success("Lote producido exitosamente");
    } catch (err: any) {
      toast.error(err.message || "Error al producir lote");
    } finally {
      setProducing(false);
    }
  }

  const selectedReceta = recetas.find((r) => r.id === form.recetaId);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Producción
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Lotes de producción con trazabilidad completa y costos ocultos
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Producir Lote
        </button>
      </div>

      {/* Last Result Alert */}
      {lastResult && (
        <div
          className="rounded-xl p-4 mb-6 border"
          style={{ background: "var(--accent-emerald-glow)", borderColor: "var(--accent-emerald)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--accent-emerald)" }}>
                ✅ Lote {lastResult.numeroLote} producido exitosamente
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                {formatNumber(lastResult.cantidadProducida)} unidades de {lastResult.productoResultante?.nombre}
                {" · "}Costo unitario: <span className="money">{formatCLP(lastResult.costoUnitario)}</span>
              </p>
            </div>
            <button
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
              onClick={() => setLastResult(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Batch History */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Historial de Lotes
          </h2>
        </div>
        {loading ? (
          <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>Cargando...</div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-30">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <p>No hay lotes de producción registrados.</p>
            <p className="text-xs mt-1">Crea una receta primero, luego produce un lote.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Receta</th>
                <th>Producido / Tipo</th>
                <th>Costo Materias</th>
                <th>C. Ocultos</th>
                <th>Costo Total</th>
                <th>C. Unitario</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td className="money font-medium" style={{ color: "var(--accent-cyan)" }}>
                    {b.numeroLote}
                  </td>
                  <td style={{ color: "var(--text-primary)" }}>
                    {b.receta?.nombre || "—"}
                  </td>
                  <td className="money">
                    {formatNumber(b.cantidadProducida)} <br/>
                    <span className="text-xs opacity-60 font-normal lowercase">{b.tipoContencion || "granel"}</span>
                  </td>
                  <td className="money">
                    {formatCLP(b.costoMaterias)}
                  </td>
                  <td className="money" style={{ color: b.costosOcultos > 0 ? "var(--accent-amber)" : "var(--text-muted)" }}>
                    {b.costosOcultos > 0 ? formatCLP(b.costosOcultos) : "—"}
                  </td>
                  <td className="money" style={{ color: "var(--accent-rose)" }}>
                    {formatCLP(b.costoTotal)}
                  </td>
                  <td className="money font-medium" style={{ color: "var(--accent-emerald)" }}>
                    {formatCLP(b.costoUnitario)}
                  </td>
                  <td>
                    <span className="badge badge-emerald">{b.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Producir Lote Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-emerald-glow)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Producir Lote</h2>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Selecciona receta, cantidad y costos ocultos</p>
              </div>
            </div>

            <form onSubmit={handleProducir} className="space-y-4">
              <div>
                <label className="input-label">Receta Base</label>
                <select
                  className="input-field"
                  value={form.recetaId}
                  onChange={(e) => setForm({ ...form, recetaId: Number(e.target.value) })}
                  required
                >
                  <option value={0} disabled>Seleccionar receta...</option>
                  {recetas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} (rinde {formatNumber(r.cantidadResultante)} un.)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="input-label">Multiplicador</label>
                  <input
                    className="input-field"
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="1.0 = receta base"
                    value={form.multiplicador}
                    onChange={(e) => setForm({ ...form, multiplicador: e.target.value })}
                    required
                  />
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    1.0 = base, 2.0 = doble
                  </p>
                </div>
                <div>
                  <label className="input-label">Costos Ocultos ($)</label>
                  <input
                    className="input-field"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.costosOcultos}
                    onChange={(e) => setForm({ ...form, costosOcultos: e.target.value })}
                  />
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Gastos extra (opcional)
                  </p>
                </div>
                <div>
                  <label className="input-label">Envasado</label>
                  <select 
                    className="input-field"
                    value={form.tipoContencion}
                    onChange={(e) => setForm({ ...form, tipoContencion: e.target.value })}
                  >
                    <option value="GRANEL">A Granel</option>
                    <option value="ENVASADO">Envasado</option>
                  </select>
                </div>
              </div>

              {form.tipoContencion === "ENVASADO" && (
                <div className="rounded-xl border p-3 mt-4" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="input-label" style={{ marginBottom: 0 }}>📦 Insumos de Empaque</span>
                    <button type="button" className="text-xs font-medium" style={{ color: "var(--accent-cyan)" }} 
                      onClick={() => setEmpaques([...empaques, { productoId: 0, cantidad: "" }])}>
                      + Agregar Empaque
                    </button>
                  </div>
                  {empaques.length === 0 && <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Añade envases, etiquetas, tapas, etc. (se descontarán del stock).</p>}
                  <div className="space-y-2">
                    {empaques.map((emp, i) => (
                      <div key={i} className="flex gap-2 relative">
                        <select className="input-field flex-1" value={emp.productoId} 
                          onChange={(e) => {
                            const newE = [...empaques];
                            newE[i].productoId = Number(e.target.value);
                            setEmpaques(newE);
                          }}>
                          <option value={0} disabled>Seleccionar empaque...</option>
                          {empaquesData.map(p => <option key={p.id} value={p.id}>{p.nombre} (Libre: {p.stockActual})</option>)}
                        </select>
                        <input className="input-field w-24" type="number" step="1" placeholder="Cant." value={emp.cantidad}
                          onChange={(e) => {
                            const newE = [...empaques];
                            newE[i].cantidad = e.target.value;
                            setEmpaques(newE);
                          }}/>
                        <button type="button" className="text-xs px-2 rounded" style={{ color: "var(--accent-rose)" }} 
                          onClick={() => setEmpaques(empaques.filter((_, idx) => idx !== i))}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              {selectedReceta && (
                <div className="rounded-xl p-3 border" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
                  <p className="text-xs uppercase font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                    Vista Previa
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Producirá: <strong style={{ color: "var(--text-primary)" }}>
                      {formatNumber(selectedReceta.cantidadResultante * parseFloat(form.multiplicador || "1"))}
                    </strong> unidades de {selectedReceta.productoResultante?.nombre || "producto"}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Receta: {selectedReceta.detalles?.length || 0} ingredientes × multiplicador {form.multiplicador}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={producing}>
                  {producing ? "Produciendo..." : "⚡ Producir Lote"}
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
