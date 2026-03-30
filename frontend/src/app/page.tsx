"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/StatCard";
import { getProductos, getProveedores, getCompras, getRecetas } from "@/lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState({
    productos: 0,
    proveedores: 0,
    compras: 0,
    recetas: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [productos, proveedores, compras, recetas] = await Promise.all([
          getProductos(),
          getProveedores(),
          getCompras(),
          getRecetas(),
        ]);
        setStats({
          productos: productos.length,
          proveedores: proveedores.length,
          compras: compras.length,
          recetas: recetas.length,
        });
      } catch {
        console.error("Error conectando con el backend. ¿Está corriendo en :8080?");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Dashboard
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Resumen general del sistema de costeo MakitScale
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Productos"
          value={loading ? "..." : stats.productos}
          subtitle="Materias primas y terminados"
          accent="cyan"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          }
        />
        <StatCard
          title="Proveedores"
          value={loading ? "..." : stats.proveedores}
          subtitle="Proveedores activos"
          accent="emerald"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          }
        />
        <StatCard
          title="Compras"
          value={loading ? "..." : stats.compras}
          subtitle="Facturas registradas"
          accent="amber"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          }
        />
        <StatCard
          title="Recetas"
          value={loading ? "..." : stats.recetas}
          subtitle="Recetas de producción"
          accent="rose"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="/productos" className="btn-secondary justify-center py-4 rounded-xl">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo Producto
          </a>
          <a href="/compras" className="btn-secondary justify-center py-4 rounded-xl">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Registrar Compra
          </a>
          <a href="/recetas" className="btn-secondary justify-center py-4 rounded-xl">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Costear Receta
          </a>
        </div>
      </div>
    </div>
  );
}
