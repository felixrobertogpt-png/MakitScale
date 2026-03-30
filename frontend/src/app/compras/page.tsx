"use client";

import { useEffect, useState, useRef } from "react";
import { getCompras, getProductos, getProveedores, registrarCompra, formatCLP, formatNumber } from "@/lib/api";
import type { Compra, Producto, Proveedor } from "@/lib/types";
import { TipoProducto } from "@/lib/types";

// ============ HOVER TOOLTIP =============
function HoverCard({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  function handleEnter() {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ x: r.left, y: r.bottom + 8 });
    }
    setShow(true);
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        style={{ cursor: "pointer", borderBottom: "1px dashed var(--text-muted)" }}
      >
        {children}
      </span>
      {show && (
        <div
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y,
            zIndex: 999,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "14px 18px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            minWidth: "260px",
            maxWidth: "360px",
            backdropFilter: "blur(16px)",
            animation: "fadeIn 0.15s ease",
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}

// ============ PROVEEDOR HOVER CARD =============
function ProveedorHover({ proveedor, compras }: { proveedor: Proveedor; compras: Compra[] }) {
  const provCompras = compras.filter((c) => c.proveedor?.id === proveedor.id);
  const totalComprado = provCompras.reduce((s, c) => s + (c.total || 0), 0);
  const ultimaCompra = provCompras[0]; // ya están ordenadas desc
  const productosComprados = new Map<string, number>();
  provCompras.forEach((c) =>
    c.detalles?.forEach((d) => {
      const name = d.producto?.nombre || "—";
      productosComprados.set(name, (productosComprados.get(name) || 0) + 1);
    })
  );
  const topProductos = [...productosComprados.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div>
      <p className="font-semibold text-sm mb-1" style={{ color: "var(--accent-cyan)" }}>
        {proveedor.razonSocial}
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>RUT: {proveedor.rut}</p>
      {proveedor.contacto && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Contacto: {proveedor.contacto}</p>
      )}
      {proveedor.telefono && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Tel: {proveedor.telefono}</p>
      )}
      {proveedor.email && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Email: {proveedor.email}</p>
      )}
      <hr style={{ borderColor: "var(--border)", margin: "8px 0" }} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Compras</p>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{provCompras.length}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Comprado</p>
          <p className="text-sm font-semibold" style={{ color: "var(--accent-emerald)" }}>{formatCLP(totalComprado)}</p>
        </div>
      </div>
      {ultimaCompra && (
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          Última compra: {ultimaCompra.fechaCompra} ({ultimaCompra.numeroFactura})
        </p>
      )}
      {topProductos.length > 0 && (
        <>
          <p className="text-xs mt-2 font-medium" style={{ color: "var(--text-secondary)" }}>Más comprado:</p>
          {topProductos.map(([name, count]) => (
            <p key={name} className="text-xs" style={{ color: "var(--text-muted)" }}>
              · {name} ({count}×)
            </p>
          ))}
        </>
      )}
    </div>
  );
}

// ============ PRODUCTO HOVER CARD =============
function ProductoHover({ producto }: { producto: Producto }) {
  return (
    <div>
      <p className="font-semibold text-sm" style={{ color: "var(--accent-cyan)" }}>
        {producto.codigo} — {producto.nombre}
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {producto.tipoProducto === "MATERIA_PRIMA" ? "📦 Materia Prima" : "🏭 Producto Terminado"}
      </p>
      <hr style={{ borderColor: "var(--border)", margin: "8px 0" }} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Stock Actual</p>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{formatNumber(producto.stockActual)}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>CPP Vigente</p>
          <p className="text-sm font-semibold" style={{ color: "var(--accent-emerald)" }}>{formatCLP(producto.costoPromedioPonderado)}</p>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN PAGE =============
export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    numeroFactura: "",
    proveedorId: 0,
    fechaCompra: new Date().toISOString().split("T")[0],
  });
  const [lineas, setLineas] = useState<{ productoId: number; cantidad: string; precioUnitario: string }[]>([
    { productoId: 0, cantidad: "", precioUnitario: "" },
  ]);

  async function fetchAll() {
    try {
      const [c, p, prov] = await Promise.all([getCompras(), getProductos(), getProveedores()]);
      setCompras(c);
      setProductos(p);
      setProveedores(prov);
    } catch { console.error("Error de conexión"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAll(); }, []);

  function addLinea() {
    setLineas([...lineas, { productoId: 0, cantidad: "", precioUnitario: "" }]);
  }

  function removeLinea(i: number) {
    setLineas(lineas.filter((_, idx) => idx !== i));
  }

  function updateLinea(i: number, field: string, value: string | number) {
    const updated = [...lineas];
    updated[i] = { ...updated[i], [field]: value };
    setLineas(updated);
  }

  // Preview subtotals
  const previewTotal = lineas.reduce((s, l) => {
    const sub = (parseFloat(l.cantidad) || 0) * (parseFloat(l.precioUnitario) || 0);
    return s + sub;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // ✅ FIXED: Send nested objects matching JPA entity structure
      await registrarCompra({
        numeroFactura: form.numeroFactura,
        proveedor: { id: form.proveedorId } as Proveedor,
        fechaCompra: form.fechaCompra,
        detalles: lineas.map((l) => ({
          producto: { id: l.productoId } as Producto,
          cantidad: parseFloat(l.cantidad),
          precioUnitario: parseFloat(l.precioUnitario),
        })),
      });
      setShowModal(false);
      setForm({ numeroFactura: "", proveedorId: 0, fechaCompra: new Date().toISOString().split("T")[0] });
      setLineas([{ productoId: 0, cantidad: "", precioUnitario: "" }]);
      fetchAll();
    } catch (err) {
      alert("Error: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Compras</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Registro de facturas de compra — actualiza stock y CPP automáticamente</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Registrar Compra
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>Cargando...</div>
        ) : compras.length === 0 ? (
          <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>
            No hay compras registradas. Registra una factura para actualizar el CPP.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Proveedor</th>
                <th>Fecha</th>
                <th>Ítems</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {compras.map((c) => {
                const prov = proveedores.find((p) => p.id === c.proveedor?.id);
                return (
                  <tr key={c.id}>
                    <td className="money" style={{ color: "var(--text-primary)" }}>{c.numeroFactura}</td>
                    <td>
                      {prov ? (
                        <HoverCard content={<ProveedorHover proveedor={prov} compras={compras} />}>
                          <span style={{ color: "var(--accent-cyan)" }}>{prov.razonSocial}</span>
                        </HoverCard>
                      ) : (
                        c.proveedor?.razonSocial || "—"
                      )}
                    </td>
                    <td>{c.fechaCompra}</td>
                    <td><span className="badge badge-cyan">{c.detalles?.length || 0} líneas</span></td>
                    <td className="money" style={{ color: "var(--accent-emerald)" }}>{formatCLP(c.total || 0)}</td>
                    <td>
                      <button
                        className="text-xs"
                        style={{ color: "var(--accent-cyan)" }}
                        onClick={() => setExpandedId(expandedId === c.id ? null : (c.id ?? null))}
                      >
                        {expandedId === c.id ? "▲ Cerrar" : "▼ Detalle"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* Expanded detail rows */}
              {compras.map((c) =>
                expandedId === c.id ? (
                  <tr key={`detail-${c.id}`}>
                    <td colSpan={6} style={{ padding: 0 }}>
                      <div className="p-4" style={{ background: "var(--bg-primary)" }}>
                        <table className="data-table" style={{ marginBottom: 0 }}>
                          <thead>
                            <tr>
                              <th>Producto</th>
                              <th>Cantidad</th>
                              <th>Precio Unit.</th>
                              <th>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.detalles?.map((d, i) => (
                              <tr key={i}>
                                <td>
                                  {d.producto ? (
                                    <HoverCard content={<ProductoHover producto={d.producto} />}>
                                      <span style={{ color: "var(--text-primary)" }}>{d.producto.nombre}</span>
                                    </HoverCard>
                                  ) : "—"}
                                </td>
                                <td className="money">{formatNumber(d.cantidad)}</td>
                                <td className="money">{formatCLP(d.precioUnitario)}</td>
                                <td className="money" style={{ color: "var(--accent-emerald)" }}>{formatCLP(d.subtotal || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                ) : null
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Registrar Compra */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: "700px" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-cyan-glow, rgba(34,211,238,0.1))" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Registrar Compra</h2>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Ingresa factura del proveedor. Actualiza stock y CPP automáticamente.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="input-label">N° Factura</label>
                  <input className="input-field" placeholder="Ej: 142, F3920, etc." value={form.numeroFactura}
                    onChange={(e) => setForm({ ...form, numeroFactura: e.target.value })} required />
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Formato libre</p>
                </div>
                <div>
                  <label className="input-label">Proveedor</label>
                  <select className="input-field" value={form.proveedorId}
                    onChange={(e) => setForm({ ...form, proveedorId: Number(e.target.value) })} required>
                    <option value={0} disabled>Seleccionar...</option>
                    {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Fecha</label>
                  <input className="input-field" type="date" value={form.fechaCompra}
                    onChange={(e) => setForm({ ...form, fechaCompra: e.target.value })} />
                </div>
              </div>

              {/* Líneas de detalle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="input-label" style={{ marginBottom: 0 }}>📦 Detalle de Compra</span>
                  <button type="button" className="text-xs font-medium" style={{ color: "var(--accent-cyan)" }} onClick={addLinea}>+ Agregar línea</button>
                </div>
                <div className="grid grid-cols-12 gap-2 mb-1 px-1">
                  <span className="col-span-5 text-xs font-medium uppercase" style={{ color: "var(--text-muted)" }}>Producto</span>
                  <span className="col-span-3 text-xs font-medium uppercase" style={{ color: "var(--text-muted)" }}>Cantidad</span>
                  <span className="col-span-3 text-xs font-medium uppercase" style={{ color: "var(--text-muted)" }}>Precio Unit.</span>
                  <span className="col-span-1"></span>
                </div>
                <div className="space-y-2">
                  {lineas.map((l, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                      <select className="input-field col-span-5" value={l.productoId} onChange={(e) => updateLinea(i, "productoId", Number(e.target.value))}>
                        <option value={0} disabled>Producto...</option>
                        {productos.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                      </select>
                      <input className="input-field col-span-3" type="number" step="0.01" placeholder="Cantidad" value={l.cantidad} onChange={(e) => updateLinea(i, "cantidad", e.target.value)} />
                      <input className="input-field col-span-3" type="number" step="0.01" placeholder="$ Unit." value={l.precioUnitario} onChange={(e) => updateLinea(i, "precioUnitario", e.target.value)} />
                      <button type="button" className="col-span-1 text-center" style={{ color: "var(--accent-rose)" }} onClick={() => removeLinea(i)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview total */}
              {previewTotal > 0 && (
                <div className="rounded-xl p-3 border" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>Total estimado</span>
                    <span className="text-lg font-bold money" style={{ color: "var(--accent-emerald)" }}>{formatCLP(previewTotal)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
                  {saving ? "Registrando..." : "💾 Registrar Compra"}
                </button>
                <button type="button" className="btn-secondary flex-1 justify-center" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
