// ==========================================
// MakitScale — API Client
// Connects to Spring Boot backend at :8080
// ==========================================

import Cookies from "js-cookie";
import type { Producto, Proveedor, Compra, Receta, TipoProducto, BatchProduccion, Venta } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = Cookies.get("makitscale_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    let errorMessage = `API Error ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      errorMessage = await res.text().catch(() => "Unknown error");
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

// ==================== PRODUCTOS ====================

export async function getProductos(tipo?: TipoProducto): Promise<Producto[]> {
  const query = tipo ? `?tipo=${tipo}` : "";
  return request<Producto[]>(`/productos${query}`);
}

export async function getProducto(id: number): Promise<Producto> {
  return request<Producto>(`/productos/${id}`);
}

export async function createProducto(data: Partial<Producto>): Promise<Producto> {
  return request<Producto>("/productos", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProducto(id: number, data: Partial<Producto>): Promise<Producto> {
  return request<Producto>(`/productos/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ==================== PROVEEDORES ====================

export async function getProveedores(): Promise<Proveedor[]> {
  return request<Proveedor[]>("/proveedores");
}

export async function createProveedor(data: Partial<Proveedor>): Promise<Proveedor> {
  return request<Proveedor>("/proveedores", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ==================== COMPRAS ====================

export async function getCompras(): Promise<Compra[]> {
  return request<Compra[]>("/compras");
}

export async function registrarCompra(data: Partial<Compra>): Promise<Compra> {
  return request<Compra>("/compras", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ==================== RECETAS ====================

export async function getRecetas(): Promise<Receta[]> {
  return request<Receta[]>("/recetas");
}

export async function createReceta(data: Partial<Receta>): Promise<Receta> {
  return request<Receta>("/recetas", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function costearReceta(id: number): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(`/recetas/${id}/costeo`);
}

// ==================== PRODUCCIÓN ====================

export async function getBatches(): Promise<BatchProduccion[]> {
  return request<BatchProduccion[]>("/produccion");
}

export async function producirBatch(data: {
  recetaId: number;
  multiplicador: number;
  costosOcultos: number;
}): Promise<BatchProduccion> {
  return request<BatchProduccion>("/produccion", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ==================== VENTAS ====================

export async function getVentas(): Promise<Venta[]> {
  return request<Venta[]>("/ventas");
}

export async function createVenta(data: Partial<Venta>): Promise<Venta> {
  return request<Venta>("/ventas", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ==================== HELPERS ====================

export function formatCLP(value: number): string {
  if (value === undefined || value === null) return "$ 0";
  return "$ " + new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
