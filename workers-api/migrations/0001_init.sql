-- =============================================
-- MakitScale D1 Schema — Cloudflare SQLite
-- Ported from PostgreSQL/Hibernate (Spring Boot)
-- =============================================

-- Enums are stored as TEXT in SQLite

-- 1. Empresa (tenant)
CREATE TABLE IF NOT EXISTS empresa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rut TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 2. Rol
CREATE TABLE IF NOT EXISTS rol (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);
INSERT OR IGNORE INTO rol (nombre) VALUES ('ROLE_ADMIN');
INSERT OR IGNORE INTO rol (nombre) VALUES ('ROLE_USER');

-- 3. Usuario
CREATE TABLE IF NOT EXISTS usuario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  nombre TEXT,
  apellido TEXT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  empresa_id INTEGER NOT NULL REFERENCES empresa(id),
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 4. Usuario-Rol (M2M)
CREATE TABLE IF NOT EXISTS usuario_rol (
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  rol_id INTEGER NOT NULL REFERENCES rol(id),
  PRIMARY KEY (usuario_id, rol_id)
);

-- 5. Producto
CREATE TABLE IF NOT EXISTS producto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tipo_producto TEXT NOT NULL CHECK(tipo_producto IN ('MATERIA_PRIMA','PRODUCTO_TERMINADO','ENVASE','EMPAQUE','INSUMO')),
  unidad_medida TEXT,
  stock_actual REAL NOT NULL DEFAULT 0,
  costo_promedio_ponderado REAL NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  empresa_id INTEGER NOT NULL REFERENCES empresa(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 6. Proveedor
CREATE TABLE IF NOT EXISTS proveedor (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rut TEXT NOT NULL UNIQUE,
  razon_social TEXT NOT NULL,
  contacto TEXT,
  email TEXT,
  telefono TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  empresa_id INTEGER NOT NULL REFERENCES empresa(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 7. Compra
CREATE TABLE IF NOT EXISTS compra (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_factura TEXT NOT NULL,
  proveedor_id INTEGER NOT NULL REFERENCES proveedor(id),
  fecha_compra TEXT NOT NULL,
  total REAL NOT NULL DEFAULT 0,
  empresa_id INTEGER NOT NULL REFERENCES empresa(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 8. Detalle Compra
CREATE TABLE IF NOT EXISTS detalle_compra (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compra_id INTEGER NOT NULL REFERENCES compra(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES producto(id),
  cantidad REAL NOT NULL,
  precio_unitario REAL NOT NULL,
  numero_lote_proveedor TEXT,
  subtotal REAL NOT NULL DEFAULT 0
);

-- 9. Receta
CREATE TABLE IF NOT EXISTS receta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  producto_resultante_id INTEGER NOT NULL REFERENCES producto(id),
  cantidad_resultante REAL NOT NULL,
  activa INTEGER NOT NULL DEFAULT 1,
  empresa_id INTEGER NOT NULL REFERENCES empresa(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 10. Detalle Receta
CREATE TABLE IF NOT EXISTS detalle_receta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receta_id INTEGER NOT NULL REFERENCES receta(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES producto(id),
  cantidad REAL NOT NULL
);

-- 11. Batch Produccion
CREATE TABLE IF NOT EXISTS batch_produccion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_lote TEXT NOT NULL UNIQUE,
  receta_id INTEGER NOT NULL REFERENCES receta(id),
  producto_resultante_id INTEGER NOT NULL REFERENCES producto(id),
  cantidad_producida REAL NOT NULL,
  costo_materias REAL NOT NULL DEFAULT 0,
  costos_ocultos REAL NOT NULL DEFAULT 0,
  costo_total REAL NOT NULL DEFAULT 0,
  costo_unitario REAL NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'COMPLETADO' CHECK(estado IN ('PLANIFICADO','EN_PROCESO','COMPLETADO','CANCELADO')),
  tipo_contencion TEXT NOT NULL DEFAULT 'GRANEL' CHECK(tipo_contencion IN ('GRANEL','ENVASADO')),
  empresa_id INTEGER NOT NULL REFERENCES empresa(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 12. Detalle Batch Consumo
CREATE TABLE IF NOT EXISTS detalle_batch_consumo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL REFERENCES batch_produccion(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES producto(id),
  detalle_compra_origen_id INTEGER REFERENCES detalle_compra(id),
  cantidad REAL NOT NULL,
  cpp_al_consumo REAL,
  costo_linea REAL
);

-- 13. Venta
CREATE TABLE IF NOT EXISTS venta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_factura TEXT NOT NULL,
  rut_cliente TEXT NOT NULL,
  cliente TEXT NOT NULL,
  tipo_documento TEXT NOT NULL DEFAULT 'FACTURA' CHECK(tipo_documento IN ('FACTURA','BOLETA','GUIA_DESPACHO','NOTA_CREDITO')),
  rebaja_stock INTEGER NOT NULL DEFAULT 1,
  fecha_venta TEXT NOT NULL,
  total_venta REAL NOT NULL DEFAULT 0,
  costo_real_total REAL NOT NULL DEFAULT 0,
  margen_bruto REAL NOT NULL DEFAULT 0,
  porcentaje_margen REAL NOT NULL DEFAULT 0,
  empresa_id INTEGER NOT NULL REFERENCES empresa(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 14. Detalle Venta
CREATE TABLE IF NOT EXISTS detalle_venta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL REFERENCES venta(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES producto(id),
  batch_produccion_id INTEGER REFERENCES batch_produccion(id),
  cantidad REAL NOT NULL,
  precio_venta REAL NOT NULL,
  cpp_al_venta REAL,
  subtotal_venta REAL,
  costo_real REAL,
  margen_linea REAL
);
