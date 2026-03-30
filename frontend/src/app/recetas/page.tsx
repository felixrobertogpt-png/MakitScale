"use client";

import { useEffect, useState, useMemo } from "react";
import { getProductos, getRecetas, createReceta, costearReceta, formatCLP, formatNumber } from "@/lib/api";
import type { Producto, Receta } from "@/lib/types";
import { TipoProducto } from "@/lib/types";

interface Ingrediente {
  productoId: number;
  nombre: string;
  cantidad: string;
  cpp: number;
}

interface CosteoData {
  recetaId: number;
  recetaNombre: string;
  cantidadResultante: number;
  costoTotal: number;
  costoUnitario: number;
  detallesCosto: Array<{
    productoId: number;
    productoNombre: string;
    cantidad: number;
    cppVigente: number;
    costoLinea: number;
  }>;
}

export default function RecetasPage() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [materiasPrimas, setMateriasPrimas] = useState<Producto[]>([]);
  const [prodTerminados, setProdTerminados] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  // Costeo
  const [costeo, setCosteo] = useState<CosteoData | null>(null);
  const [costeando, setCosteando] = useState(false);

  // RecipeBuilder
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderForm, setBuilderForm] = useState({
    nombre: "",
    productoResultanteId: 0,
    cantidadResultante: "",
  });
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [saving, setSaving] = useState(false);

  async function fetchAll() {
    try {
      const [rec, mp, pt] = await Promise.all([
        getRecetas(),
        getProductos(TipoProducto.MATERIA_PRIMA),
        getProductos(TipoProducto.PRODUCTO_TERMINADO),
      ]);
      setRecetas(rec);
      setMateriasPrimas(mp);
      setProdTerminados(pt);
    } catch {
      console.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  // ========== COSTEO ==========
  async function handleCostear(id: number) {
    setCosteando(true);
    setCosteo(null);
    try {
      const data = await costearReceta(id);
      setCosteo(data as unknown as CosteoData);
    } catch (err) {
      alert("Error: " + (err as Error).message);
    } finally {
      setCosteando(false);
    }
  }

  // ========== RECIPE BUILDER ==========
  function addIngrediente() {
    setIngredientes([...ingredientes, { productoId: 0, nombre: "", cantidad: "", cpp: 0 }]);
  }

  function removeIngrediente(i: number) {
    setIngredientes(ingredientes.filter((_, idx) => idx !== i));
  }

  function updateIngrediente(i: number, productoId: number) {
    const mp = materiasPrimas.find((p) => p.id === productoId) || prodTerminados.find((p) => p.id === productoId);
    if (!mp) return;
    const updated = [...ingredientes];
    updated[i] = { ...updated[i], productoId, nombre: mp.nombre, cpp: mp.costoPromedioPonderado };
    setIngredientes(updated);
  }

  function updateCantidad(i: number, cantidad: string) {
    const updated = [...ingredientes];
    updated[i] = { ...updated[i], cantidad };
    setIngredientes(updated);
  }

  // Live cost preview
  const costoPreview = useMemo(() => {
    let total = 0;
    const lineas = ingredientes.map((ing) => {
      const cant = parseFloat(ing.cantidad) || 0;
      const costo = cant * ing.cpp;
      total += costo;
      return { ...ing, costoLinea: costo, cantNum: cant };
    });
    const cantRes = parseFloat(builderForm.cantidadResultante) || 0;
    const unitario = cantRes > 0 ? total / cantRes : 0;
    return { lineas, total, unitario };
  }, [ingredientes, builderForm.cantidadResultante]);

  async function handleSaveReceta(e: React.FormEvent) {
    e.preventDefault();
    if (ingredientes.length === 0) {
      alert("Agrega al menos un ingrediente");
      return;
    }
    setSaving(true);
    try {
      await createReceta({
        nombre: builderForm.nombre,
        productoResultante: { id: builderForm.productoResultanteId } as Producto,
        cantidadResultante: parseFloat(builderForm.cantidadResultante),
        activa: true,
        detalles: ingredientes.map((ing) => ({
          producto: { id: ing.productoId } as Producto,
          cantidad: parseFloat(ing.cantidad),
        })),
      });
      setShowBuilder(false);
      setBuilderForm({ nombre: "", productoResultanteId: 0, cantidadResultante: "" });
      setIngredientes([]);
      fetchAll();
    } catch (err) {
      alert("Error: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function openBuilder() {
    setShowBuilder(true);
    setCosteo(null);
    if (ingredientes.length === 0) addIngrediente();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Recetas & Costeo
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Construye recetas y costea en tiempo real con CPP vigente
          </p>
        </div>
        <button className="btn-primary" onClick={openBuilder}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nueva Receta
        </button>
      </div>

      {/* Recipe Builder Modal */}
      {showBuilder && (
        <div className="modal-overlay" onClick={() => setShowBuilder(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: "780px", maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Builder Header */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--accent-cyan-glow)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  RecipeBuilder
                </h2>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Constructor visual de recetas de producción
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveReceta} className="space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="input-label">Nombre de la Receta</label>
                  <input
                    className="input-field"
                    placeholder="Ej: Limpiador Industrial"
                    value={builderForm.nombre}
                    onChange={(e) => setBuilderForm({ ...builderForm, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-1">
                  <label className="input-label">Producto Resultante</label>
                  <select
                    className="input-field"
                    value={builderForm.productoResultanteId}
                    onChange={(e) => setBuilderForm({ ...builderForm, productoResultanteId: Number(e.target.value) })}
                    required
                  >
                    <option value={0} disabled>Seleccionar...</option>
                    {prodTerminados.map((p) => (
                      <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="input-label">Cantidad Resultante</label>
                  <input
                    className="input-field"
                    type="number"
                    step="0.01"
                    placeholder="Ej: 100"
                    value={builderForm.cantidadResultante}
                    onChange={(e) => setBuilderForm({ ...builderForm, cantidadResultante: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Ingredients Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="input-label" style={{ marginBottom: 0 }}>
                    🧪 Ingredientes y Componentes
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium flex items-center gap-1"
                    style={{ color: "var(--accent-cyan)" }}
                    onClick={addIngrediente}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Agregar ingrediente
                  </button>
                </div>

                {/* Ingredient Header */}
                <div className="grid grid-cols-12 gap-2 mb-1 px-1">
                  <span className="col-span-5 text-xs font-medium uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                    Materia Prima
                  </span>
                  <span className="col-span-2 text-xs font-medium uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                    Cantidad
                  </span>
                  <span className="col-span-2 text-xs font-medium uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                    CPP Unit.
                  </span>
                  <span className="col-span-2 text-xs font-medium uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                    Costo Línea
                  </span>
                  <span className="col-span-1"></span>
                </div>

                {/* Ingredient Rows */}
                <div className="space-y-2">
                  {ingredientes.map((ing, i) => {
                    const preview = costoPreview.lineas[i];
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg"
                        style={{ background: "var(--bg-primary)" }}
                      >
                        <select
                          className="input-field col-span-5"
                          value={ing.productoId}
                          onChange={(e) => updateIngrediente(i, Number(e.target.value))}
                        >
                          <option value={0} disabled>Seleccionar componente...</option>
                          <optgroup label="Materias Primas">
                            {materiasPrimas.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.codigo} — {p.nombre}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Prod. Terminados / Sub-ensamblajes">
                            {prodTerminados.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.codigo} — {p.nombre}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        <input
                          className="input-field col-span-2"
                          type="number"
                          step="0.01"
                          placeholder="Cant."
                          value={ing.cantidad}
                          onChange={(e) => updateCantidad(i, e.target.value)}
                        />
                        <div className="col-span-2 text-sm money px-2" style={{ color: "var(--text-muted)" }}>
                          {ing.cpp > 0 ? formatCLP(ing.cpp) : "—"}
                        </div>
                        <div className="col-span-2 text-sm money px-2 font-medium" style={{ color: preview?.costoLinea > 0 ? "var(--accent-amber)" : "var(--text-muted)" }}>
                          {preview?.costoLinea > 0 ? formatCLP(preview.costoLinea) : "—"}
                        </div>
                        <button
                          type="button"
                          className="col-span-1 text-center rounded-lg p-1 transition-colors"
                          style={{ color: "var(--accent-rose)" }}
                          onClick={() => removeIngrediente(i)}
                          title="Eliminar ingrediente"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>

                {ingredientes.length === 0 && (
                  <div className="text-center py-6 text-sm" style={{ color: "var(--text-muted)" }}>
                    Presiona &quot;+ Agregar ingrediente&quot; para empezar a construir la receta
                  </div>
                )}
              </div>

              {/* Live Cost Preview */}
              {ingredientes.some((ing) => ing.cpp > 0 && parseFloat(ing.cantidad) > 0) && (
                <div className="rounded-xl p-4 border" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
                  <p className="text-xs uppercase font-medium mb-3" style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                    ⚡ Vista previa de costeo (estimado con CPP actual)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Costo Total Estimado</p>
                      <p className="text-xl font-bold money" style={{ color: "var(--accent-rose)" }}>
                        {formatCLP(costoPreview.total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Costo Unitario Estimado</p>
                      <p className="text-xl font-bold money" style={{ color: "var(--accent-emerald)" }}>
                        {costoPreview.unitario > 0 ? formatCLP(costoPreview.unitario) : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="btn-primary flex-1 justify-center"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "💾 Guardar Receta"}
                </button>
                <button
                  type="button"
                  className="btn-secondary flex-1 justify-center"
                  onClick={() => setShowBuilder(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content: 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recetas List */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Recetas Activas</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>Cargando...</div>
          ) : recetas.length === 0 ? (
            <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-30">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="mb-2">No hay recetas registradas.</p>
              <button
                className="text-xs font-medium"
                style={{ color: "var(--accent-cyan)" }}
                onClick={openBuilder}
              >
                Crear una receta con el RecipeBuilder →
              </button>
            </div>
          ) : (
            <div>
              {recetas.map((r) => (
                <div
                  key={r.id}
                  className="px-5 py-4 flex items-center justify-between border-b transition-colors"
                  style={{ borderColor: "var(--border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div>
                    <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                      {r.nombre}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {r.detalles?.length || 0} ingredientes · Rinde {formatNumber(r.cantidadResultante)} unidades
                    </p>
                  </div>
                  <button
                    className="btn-primary text-xs py-2 px-4"
                    onClick={() => handleCostear(r.id!)}
                    disabled={costeando}
                  >
                    {costeando ? "..." : "⚡ Costear"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Costeo Result */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: "var(--accent-amber)" }}>⚡</span> Resultado del Costeo
            </h2>
          </div>
          {!costeo ? (
            <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-30">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <p>Selecciona una receta y presiona &quot;Costear&quot;</p>
              <p className="text-xs mt-1">El costeo usa los CPP vigentes en tiempo real</p>
            </div>
          ) : (
            <div>
              {/* Result Header */}
              <div className="px-5 py-4" style={{ background: "var(--bg-secondary)" }}>
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  {costeo.recetaNombre}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Produce: {formatNumber(costeo.cantidadResultante)} unidades
                </p>
              </div>

              {/* Lines */}
              {costeo.detallesCosto && costeo.detallesCosto.length > 0 && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ingrediente</th>
                      <th>Cantidad</th>
                      <th>CPP Vigente</th>
                      <th>Costo Línea</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costeo.detallesCosto.map((l, i) => (
                      <tr key={i}>
                        <td style={{ color: "var(--text-primary)" }}>{l.productoNombre}</td>
                        <td className="money">{formatNumber(l.cantidad)}</td>
                        <td className="money">{formatCLP(l.cppVigente)}</td>
                        <td className="money" style={{ color: "var(--accent-amber)" }}>
                          {formatCLP(l.costoLinea)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Totals */}
              <div
                className="px-5 py-4 border-t grid grid-cols-2 gap-4"
                style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
              >
                <div>
                  <p className="text-xs uppercase font-medium" style={{ color: "var(--text-muted)" }}>
                    Costo Total
                  </p>
                  <p className="text-xl font-bold money" style={{ color: "var(--accent-rose)" }}>
                    {formatCLP(costeo.costoTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase font-medium" style={{ color: "var(--text-muted)" }}>
                    Costo Unitario
                  </p>
                  <p className="text-xl font-bold money" style={{ color: "var(--accent-emerald)" }}>
                    {formatCLP(costeo.costoUnitario)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
