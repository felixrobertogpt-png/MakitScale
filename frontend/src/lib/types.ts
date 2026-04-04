// ==========================================
// MakitScale — TypeScript Types
// Mirrors backend JPA entities
// ==========================================

export enum TipoProducto {
  MATERIA_PRIMA = "MATERIA_PRIMA",
  EMPAQUE_INSUMO = "EMPAQUE_INSUMO",
  PRODUCTO_TERMINADO = "PRODUCTO_TERMINADO",
}

export enum TipoDocumento {
  FACTURA = "FACTURA",
  GUIA_DESPACHO = "GUIA_DESPACHO",
  NOTA_VENTA = "NOTA_VENTA",
}

export enum TipoContencion {
  GRANEL = "GRANEL",
  ENVASADO = "ENVASADO",
}

export interface UnidadMedida {
  id: number;
  nombre: string;
  abreviatura: string;
}

export interface Producto {
  id?: number;
  codigo: string;
  nombre: string;
  tipoProducto: TipoProducto;
  unidadMedida?: UnidadMedida;
  unidadMedidaId?: number;
  costoPromedioPonderado: number;
  stockActual: number;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Proveedor {
  id?: number;
  rut: string;
  razonSocial: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
  createdAt?: string;
}

export interface DetalleCompra {
  id?: number;
  producto?: Producto;
  productoId?: number;
  cantidad: number;
  precioUnitario: number;
  numeroLoteProveedor?: string;
  subtotal?: number;
}

export interface Compra {
  id?: number;
  numeroFactura: string;
  proveedor?: Proveedor;
  proveedorId?: number;
  fechaCompra: string;
  detalles: DetalleCompra[];
  total?: number;
  createdAt?: string;
}

export interface DetalleReceta {
  id?: number;
  producto?: Producto;
  productoId?: number;
  cantidad: number;
}

export interface Receta {
  id?: number;
  nombre: string;
  productoResultante?: Producto;
  productoResultanteId?: number;
  cantidadResultante: number;
  detalles: DetalleReceta[];
  activa: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CosteoLinea {
  ingrediente: string;
  cantidad: number;
  unidad: string;
  costoUnitario: number;
  costoLinea: number;
}

export interface CosteoResult {
  receta: string;
  cantidadProducida: number;
  lineas: CosteoLinea[];
  costoTotal: number;
  costoUnitario: number;
}

// ========== PRODUCCIÓN (Fase 2) ==========

export enum EstadoBatch {
  COMPLETADO = "COMPLETADO",
  EN_PROCESO = "EN_PROCESO",
  CANCELADO = "CANCELADO",
}

export interface DetalleBatchConsumo {
  id?: number;
  producto?: Producto;
  detalleCompraOrigen?: DetalleCompra;
  cantidad: number;
  cppAlConsumo: number;
  costoLinea: number;
}

export interface BatchProduccion {
  id?: number;
  numeroLote: string;
  receta?: Receta;
  productoResultante?: Producto;
  cantidadProducida: number;
  tipoContencion?: TipoContencion;
  costoMaterias: number;
  costosOcultos: number;
  costoTotal: number;
  costoUnitario: number;
  estado: EstadoBatch;
  consumos: DetalleBatchConsumo[];
  createdAt?: string;
}

// ========== VENTAS (Fase 2) ==========

export interface DetalleVenta {
  id?: number;
  producto?: Producto;
  loteProduccion?: BatchProduccion;
  cantidad: number;
  precioVenta: number;
  cppAlVenta?: number;
  subtotalVenta?: number;
  costoReal?: number;
  margenLinea?: number;
}

export interface Venta {
  id?: number;
  numeroFactura: string;
  cliente: string;
  tipoDocumento?: TipoDocumento;
  rebajaStock?: boolean;
  fechaVenta: string;
  totalVenta?: number;
  costoRealTotal?: number;
  margenBruto?: number;
  porcentajeMargen?: number;
  detalles: DetalleVenta[];
  createdAt?: string;
}
