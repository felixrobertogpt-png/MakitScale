# MakitScale 🏭

**Plataforma de Costeo Industrial en Tiempo Real**

Sistema ERP especializado en costeo de producción para PYMEs industriales. Calcula el Costo Promedio Ponderado (CPP) automáticamente, gestiona recetas de producción, rastrea lotes con trazabilidad completa, y muestra márgenes reales de venta.

---

## 🚀 Inicio Rápido

### Requisitos

| Software | Versión |
|----------|---------|
| Java JDK | 21+ |
| Node.js | 18+ |
| Docker | 20+ |

### 1. Clonar e instalar

```bash
git clone git@github.com:MakeITcl/MakitScale.git
cd MakitScale
```

### 2. Levantar PostgreSQL

```bash
docker compose up -d
```

### 3. Configurar credenciales

Crear `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=makitscale_db
DB_USER=erp_admin
DB_PASSWORD=erp_password
```

Crear `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

### 4. Ejecutar

```bash
# Terminal 1: Backend (:8080)
cd backend && ./mvnw spring-boot:run

# Terminal 2: Frontend (:3000)
cd frontend && npm install && npm run dev
```

### 5. Abrir

→ **http://localhost:3000**

---

## 📋 Módulos

| Módulo | Ruta | Función |
|--------|------|---------|
| Dashboard | `/` | KPIs y accesos rápidos |
| Productos | `/productos` | Maestro de materias primas y productos terminados |
| Proveedores | `/proveedores` | Registro de proveedores |
| Compras | `/compras` | Registro de compras → recalcula CPP automáticamente |
| Producción | `/produccion` | Lotes con trazabilidad, costos ocultos, número de lote |
| Ventas | `/ventas` | Facturación con margen real (precio venta − CPP) |
| Recetas & Costeo | `/recetas` | Constructor de recetas + costeo en tiempo real |

---

## ⚙️ Stack Tecnológico

**Backend:** Java 21, Spring Boot 4, PostgreSQL 15, JPA/Hibernate

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4

---

## 🔐 Seguridad

- Las credenciales se gestionan via `.env` (nunca se suben a Git)
- `.gitignore` protege: `.env*`, `node_modules/`, `target/`, `.next/`
- JWT y multi-tenant planificados para próximas versiones

---

## 📦 Estructura del Proyecto

```
MakitScale/
├── backend/
│   ├── src/main/java/com/makeitcl/makitscale/
│   │   ├── controller/    ← REST endpoints
│   │   ├── model/         ← Entidades JPA
│   │   ├── repository/    ← Queries
│   │   └── service/       ← Lógica de negocio (CPP, producción, márgenes)
│   └── src/main/resources/
│       └── application.properties
├── frontend/
│   ├── src/app/           ← Páginas (Next.js App Router)
│   ├── src/components/    ← Componentes reutilizables
│   └── src/lib/           ← API client + tipos TypeScript
└── docker-compose.yml     ← PostgreSQL
```

---

## 🧪 Motor de Costeo (CPP)

```
CPP = (stock_anterior × cpp_anterior + cantidad_compra × precio_unitario)
      ÷ (stock_anterior + cantidad_compra)
```

Se recalcula automáticamente con cada compra registrada. Las recetas usan el CPP vigente para costeo en tiempo real.

---

## 📄 Licencia

Propiedad de **MakeIT Consulting Limitada**. Todos los derechos reservados.
