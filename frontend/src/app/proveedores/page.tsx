"use client";

import { useEffect, useState } from "react";
import { getProveedores, createProveedor } from "@/lib/api";
import type { Proveedor } from "@/lib/types";

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ rut: "", razonSocial: "", contacto: "", telefono: "", email: "" });

  async function fetchProveedores() {
    try {
      setProveedores(await getProveedores());
    } catch { console.error("Error al cargar proveedores"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchProveedores(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createProveedor({ ...form, activo: true });
      setShowModal(false);
      setForm({ rut: "", razonSocial: "", contacto: "", telefono: "", email: "" });
      fetchProveedores();
    } catch (err) { alert("Error: " + (err as Error).message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Proveedores</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Maestro de proveedores de materias primas</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo Proveedor
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>Cargando...</div>
        ) : proveedores.length === 0 ? (
          <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>
            No hay proveedores registrados.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>RUT</th>
                <th>Razón Social</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((p) => (
                <tr key={p.id}>
                  <td className="money" style={{ color: "var(--text-primary)" }}>{p.rut}</td>
                  <td style={{ color: "var(--text-primary)" }}>{p.razonSocial}</td>
                  <td>{p.contacto || "—"}</td>
                  <td>{p.telefono || "—"}</td>
                  <td style={{ color: "var(--accent-cyan)" }}>{p.email || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--text-primary)" }}>Nuevo Proveedor</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="input-label">RUT</label>
                <input className="input-field" placeholder="12.345.678-9" value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} required />
              </div>
              <div>
                <label className="input-label">Razón Social</label>
                <input className="input-field" placeholder="Química Industrial SpA" value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} required />
              </div>
              <div>
                <label className="input-label">Contacto</label>
                <input className="input-field" placeholder="Juan Pérez" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Teléfono</label>
                  <input className="input-field" placeholder="+56 9 1234 5678" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">Email</label>
                  <input className="input-field" type="email" placeholder="contacto@proveedor.cl" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">Crear Proveedor</button>
                <button type="button" className="btn-secondary flex-1 justify-center" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
