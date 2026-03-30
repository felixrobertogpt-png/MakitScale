# Manual de Usuario — MakitScale 🏭
### "For Dummies" Edition

---

## ¿Qué es MakitScale?

MakitScale es un sistema que te dice **cuánto te cuesta realmente producir algo** y **cuánto ganas al venderlo**. Sin Excel, sin calculadora, sin errores.

---

## 🖥️ Cómo entrar

1. Abre tu navegador (Chrome, Firefox)
2. Escribe: `http://localhost:3000`
3. Listo — no hay login (por ahora)

---

## 📍 Navegación

El menú está a la izquierda (sidebar). Tiene 7 secciones:

| Icono | Sección | ¿Para qué? |
|-------|---------|-------------|
| 🏠 | **Dashboard** | Resumen general: cuántos productos, proveedores, compras y recetas hay |
| 📦 | **Productos** | Crear materias primas (lo que compras) o productos terminados (lo que vendes) |
| 👤 | **Proveedores** | Registrar a quién le compras |
| 🛒 | **Compras** | Registrar facturas de compra → actualiza precios (CPP) automáticamente |
| ⚡ | **Producción** | Fabricar un lote → descuenta materias primas y calcula el costo real |
| 💲 | **Ventas** | Facturar una venta → te muestra el margen real |
| 📋 | **Recetas & Costeo** | Crear fórmulas de producción y ver cuánto cuesta cada producto |

---

## 📖 Flujo de Trabajo (Paso a Paso)

### Paso 1: Crear Productos

Ve a **Productos** → **+ Nuevo Producto**

Ejemplo:
- Código: `MP-001`
- Nombre: `Hipoclorito de Sodio`
- Tipo: **Materia Prima** (lo que compras)

Repite para cada insumo. Luego crea los productos terminados:
- Código: `PT-001`
- Nombre: `Cloro Concentrado 5L`
- Tipo: **Producto Terminado** (lo que vendes)

> 💡 **El stock y el CPP empiezan en $0.** Se actualizan cuando registres una compra.

---

### Paso 2: Crear Proveedores

Ve a **Proveedores** → **+ Nuevo Proveedor**

Ejemplo:
- RUT: `76.543.210-K`
- Razón Social: `Química del Pacífico SpA`
- Contacto: `Carlos Muñoz`

> 💡 Al pasar el mouse sobre un proveedor en Compras, verás sus datos, historial y productos más comprados.

---

### Paso 3: Registrar una Compra

Ve a **Compras** → **Registrar Compra**

1. **N° Factura**: El número de la factura del proveedor (formato libre)
2. **Proveedor**: Selecciona del listado
3. **Fecha**: Fecha de la factura
4. **Detalle**: Agrega líneas → selecciona producto, cantidad, precio unitario

Al guardar:
- ✅ Se actualiza el **stock** de cada producto
- ✅ Se recalcula el **CPP** (Costo Promedio Ponderado) automáticamente

> 🧮 **¿Qué es el CPP?** Es el costo real de tu inventario. Si compraste 100 kg a $800 y luego 50 kg a $1,000, el CPP es $866.67. MakitScale lo calcula solo.

---

### Paso 4: Crear una Receta

Ve a **Recetas & Costeo** → **+ Nueva Receta**

Ejemplo — Cloro Concentrado 5L:
- Nombre: `Cloro Concentrado 5L`
- Producto Resultante: `PT-001 — Cloro Concentrado 5L`
- Cantidad Resultante: `100` (unidades que produce)
- Ingredientes:
  - Hipoclorito de Sodio: 150 kg
  - Agua Desmineralizada: 340 kg
  - Soda Cáustica: 10 kg

**Click en "⚡ Costear"** → Verás el desglose:
```
Hipoclorito    150 kg × $850/kg   = $127,500
Agua           340 kg × $120/kg   = $40,800
Soda Cáustica   10 kg × $1,200/kg = $12,000
─────────────────────────────────────────────
COSTO TOTAL = $180,300
COSTO UNITARIO = $1,803/unidad
```

> 💡 El costeo usa el CPP vigente. Si mañana compras Hipoclorito más barato, el costeo cambia automáticamente.

---

### Paso 5: Producir un Lote

Ve a **Producción** → **Producir Lote**

1. **Receta**: Selecciona la receta
2. **Multiplicador**: `1.0` = la receta base. `2.0` = el doble
3. **Costos Ocultos ($)**: Horas hombre, electricidad, transporte, etc.

Al confirmar:
- ✅ Se descuentan las materias primas del inventario
- ✅ Se calcula el costo real del lote
- ✅ Se agrega el producto terminado al inventario
- ✅ Se genera el número de lote (LOT-20260324-001)

> 🔍 **Trazabilidad**: Cada lote registra qué ingredientes se usaron y a qué CPP se compraron. Puedes rastrear exactamente de dónde vino el costo de cada producto.

---

### Paso 6: Registrar una Venta

Ve a **Ventas** → **Registrar Venta**

1. **N° Factura**: Tu número de factura de venta
2. **Cliente**: Nombre del cliente
3. **Fecha**: Fecha de la venta
4. **Productos**: Selecciona producto terminado, cantidad y **precio de venta**

AL INSTANTE verás:
- 💰 **Total Venta**: lo que cobras
- 📊 **Costo Real**: lo que te costó producirlo (CPP)
- ✅ **Margen**: la ganancia real (venta − costo)
- 📈 **% Margen**: qué porcentaje de ganancia tienes

Ejemplo:
```
Lavaloza 1L: 50 unidades × $1,500 = $75,000
Costo real:  50 unidades × $746   = $37,300
─────────────────────────────────────────────
MARGEN = $37,700 (50.3%)
```

> ⚠️ **Si el margen sale en ROJO**, estás vendiendo por debajo del costo. ¡Ajusta tu precio!

---

## 🔑 Conceptos Clave

| Concepto | Significado |
|----------|-------------|
| **CPP** | Costo Promedio Ponderado — el costo real de tu inventario, se actualiza con cada compra |
| **Materia Prima** | Lo que compras para producir (ingredientes) |
| **Producto Terminado** | Lo que produces y vendes |
| **Receta** | La fórmula: qué ingredientes y cuánto necesitas para producir algo |
| **Lote (Batch)** | Una corrida de producción (ej: "hoy hicimos 100 cloros") |
| **Costos Ocultos** | Gastos extras: electricidad, transporte, horas hombre |
| **Margen** | Tu ganancia real = Precio Venta − CPP |

---

## 💡 Tips

1. **Siempre registra las compras primero** — si no hay CPP, el costeo da $0
2. **El costeo es en tiempo real** — si los precios cambian, los costos se actualizan solos
3. **Usa el multiplicador** — si tu receta hace 100 unidades pero necesitas 500, pon multiplicador 5.0
4. **Los costos ocultos importan** — si no los agregas, tu costo real será más bajo de lo que debería y tu margen se ve "inflado"
5. **Pasa el mouse sobre los nombres** — en Compras, puedes ver info detallada de proveedores y productos

---

*MakitScale v0.1.0 — MakeIT Consulting Limitada*
