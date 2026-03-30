/**
 * 🧪 MakitScale Core E2E Test — Flujo Crítico Compra-Venta con CPP
 *
 * Este test protege el corazón del negocio:
 *   1. Registra un usuario y su empresa
 *   2. Crea una materia prima
 *   3. Registra una Compra → verifica que el CPP se calcule correctamente
 *   4. Crea una receta usando la materia prima
 *   5. Produce un lote → verifica que el stock se descuente en inventario
 *   6. Registra una Venta → verifica el margen de ganancia
 *   7. Intenta vender más de lo que hay en stock y verifica que el sistema lo bloquea
 *
 * Si alguno de estos pasos falla, el motor central de MakitScale está roto.
 */

const TIMESTAMP = Date.now();
const TEST_USER = `test_${TIMESTAMP}`;
const TEST_EMPRESA = `TestCo ${TIMESTAMP}`;
const TEST_PASSWORD = "password123";
const API_URL = Cypress.env("apiUrl");

let authToken: string;
let productoId: number;
let proveedorId: number;
let productoTerminadoId: number;

describe("MakitScale — Flujo Crítico de Negocio", () => {
  before(() => {
    // Registrar una empresa y usuario de prueba limpio via API
    cy.request("POST", `${API_URL}/auth/register`, {
      username: TEST_USER,
      password: TEST_PASSWORD,
      empresa: TEST_EMPRESA,
      email: `${TEST_USER}@test.com`,
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201]);
      authToken = res.body.token;
      cy.setCookie("makitscale_token", authToken);
    });
  });

  const authHeaders = () => ({
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
  });

  // ─────────────────────────────────────
  // 1. Crear Materia Prima
  // ─────────────────────────────────────
  it("1. Debe crear una materia prima de prueba", () => {
    cy.request({
      method: "POST",
      url: `${API_URL}/productos`,
      headers: authHeaders(),
      body: {
        codigo: `MP-CY-${TIMESTAMP}`,
        nombre: "Harina de Trigo [Cypress]",
        tipoProducto: "MATERIA_PRIMA",
        unidad: "KG",
        stockActual: 0,
        costoPromedioPonderado: 0,
      },
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201]);
      productoId = res.body.id;
      expect(productoId).to.be.a("number").and.greaterThan(0);
    });
  });

  // ─────────────────────────────────────
  // 2. Crear Proveedor
  // ─────────────────────────────────────
  it("2. Debe crear un proveedor de prueba", () => {
    cy.request({
      method: "POST",
      url: `${API_URL}/proveedores`,
      headers: authHeaders(),
      body: { razonSocial: `Proveedor Cypress ${TIMESTAMP}`, contacto: "test@proveedor.cl" },
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201]);
      proveedorId = res.body.id;
      expect(proveedorId).to.be.a("number").and.greaterThan(0);
    });
  });

  // ─────────────────────────────────────
  // 3. Registrar Compra → calcular CPP
  // ─────────────────────────────────────
  it("3. Debe registrar una compra y calcular el CPP correctamente", () => {
    // Compramos 100 kg a $500/kg → CPP resultante debe ser 500.00
    cy.request({
      method: "POST",
      url: `${API_URL}/compras`,
      headers: authHeaders(),
      body: {
        proveedor: { id: proveedorId },
        numeroFactura: `FAC-CY-${TIMESTAMP}`,
        fechaCompra: "2026-03-29",
        detalles: [
          {
            producto: { id: productoId },
            cantidad: 100,
            precioUnitario: 500,
            unidad: "KG",
          },
        ],
      },
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201]);
    });

    // Verificar que el CPP del producto es 500
    cy.request({
      method: "GET",
      url: `${API_URL}/productos/${productoId}`,
      headers: authHeaders(),
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201]);
      expect(res.body.stockActual).to.closeTo(100, 0.01);
      expect(res.body.costoPromedioPonderado).to.closeTo(500, 0.01);
    });
  });

  // ─────────────────────────────────────
  // 4. Segunda Compra → CPP ponderado
  // ─────────────────────────────────────
  it("4. Debe recalcular CPP correctamente con segunda compra a precio distinto", () => {
    // Segunda compra: 100 kg a $600/kg
    // CPP esperado: (100*500 + 100*600) / 200 = 550.00
    cy.request({
      method: "POST",
      url: `${API_URL}/compras`,
      headers: authHeaders(),
      body: {
        proveedor: { id: proveedorId },
        numeroFactura: `FAC-CY2-${TIMESTAMP}`,
        fechaCompra: "2026-03-29",
        detalles: [
          {
            producto: { id: productoId },
            cantidad: 100,
            precioUnitario: 600,
            unidad: "KG",
          },
        ],
      },
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201]);
    });

    cy.request({
      method: "GET",
      url: `${API_URL}/productos/${productoId}`,
      headers: authHeaders(),
    }).then((res) => {
      expect(res.body.stockActual).to.closeTo(200, 0.01);
      // 🔑 VERIFICACIÓN MATEMÁTICA CENTRAL: CPP = (100×500 + 100×600) / 200 = 550
      expect(res.body.costoPromedioPonderado).to.closeTo(550, 0.01);
    });
  });

  // ─────────────────────────────────────
  // 5. Crear Producto Terminado y Receta
  // ─────────────────────────────────────
  it("5. Debe crear producto terminado y una receta que lo produzca", () => {
    // Crear producto terminado
    cy.request({
      method: "POST",
      url: `${API_URL}/productos`,
      headers: authHeaders(),
      body: {
        codigo: `PT-CY-${TIMESTAMP}`,
        nombre: "Pan [Cypress]",
        tipoProducto: "PRODUCTO_TERMINADO",
        unidad: "UN",
        stockActual: 0,
        costoPromedioPonderado: 0,
      },
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201]);
      productoTerminadoId = res.body.id;
    });

    // Crear receta: 1 kg harina → 10 panes
    cy.then(() => {
      cy.request({
        method: "POST",
        url: `${API_URL}/recetas`,
        headers: authHeaders(),
        body: {
          nombre: "Pan Simple [Cypress]",
          productoResultante: { id: productoTerminadoId },
          cantidadResultante: 10,
          detalles: [
            { producto: { id: productoId }, cantidad: 1 },
          ],
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
      });
    });
  });

  // ─────────────────────────────────────
  // 6. Producir Lote → verificar stock
  // ─────────────────────────────────────
  it("6. Debe producir un lote y descontar stock de materia prima", () => {
    cy.request({
      method: "GET",
      url: `${API_URL}/recetas`,
      headers: authHeaders(),
    }).then((recetasRes) => {
      const receta = recetasRes.body.find((r: any) => r.nombre.includes("[Cypress]"));
      expect(receta).to.not.be.undefined;

      cy.request({
        method: "POST",
        url: `${API_URL}/produccion`,
        headers: authHeaders(),
        body: {
          recetaId: receta.id,
          multiplicador: 1,
          costosOcultos: 0,
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
      });

      // Verificar que la harina bajó 1 kg (de 200 a 199)
      cy.request({
        method: "GET",
        url: `${API_URL}/productos/${productoId}`,
        headers: authHeaders(),
      }).then((res) => {
        expect(res.body.stockActual).to.closeTo(199, 0.01);
      });

      // Verificar que el pan terminado tiene 10 unidades en stock
      cy.request({
        method: "GET",
        url: `${API_URL}/productos/${productoTerminadoId}`,
        headers: authHeaders(),
      }).then((res) => {
        expect(res.body.stockActual).to.closeTo(10, 0.01);
        // Costo unitario: 1 kg × CPP 550 / 10 panes = $55 por pan
        expect(res.body.costoPromedioPonderado).to.closeTo(55, 0.01);
      });
    });
  });

  // ─────────────────────────────────────
  // 7. Registrar Venta con Margen Real
  // ─────────────────────────────────────
  it("7. Debe registrar una venta y calcular el margen real correctamente", () => {
    // Vendemos 5 panes a $100 c/u → ingreso = $500, costo = 5 × 55 = $275, margen = $225
    cy.request({
      method: "POST",
      url: `${API_URL}/ventas`,
      headers: authHeaders(),
      body: {
        numeroFactura: `FAC-CY-${TIMESTAMP}`,
        cliente: "Cliente Cypress",
        fechaVenta: new Date().toISOString().split("T")[0],
        detalles: [
          {
            producto: { id: productoTerminadoId },
            cantidad: 5,
            precioVenta: 100,
          },
        ],
      },
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201]);
      const venta = res.body;
      expect(venta.totalVenta).to.closeTo(500, 0.01);
      expect(venta.costoRealTotal).to.closeTo(275, 0.1);
      expect(venta.margenBruto).to.closeTo(225, 0.1);
    });
  });

  // ─────────────────────────────────────
  // 8. 🛡️ Validación: Stock Negativo Bloqueado
  // ─────────────────────────────────────
  it("8. Debe BLOQUEAR una venta si supera el stock disponible (5 panes quedan)", () => {
    cy.request({
      method: "POST",
      url: `${API_URL}/ventas`,
      headers: authHeaders(),
      failOnStatusCode: false, // no queremos que Cypress salga con error, queremos verificarlo
      body: {
        numeroFactura: `FAC-INVALID-${TIMESTAMP}`,
        cliente: "Cliente Trampa",
        fechaVenta: new Date().toISOString().split("T")[0],
        detalles: [
          {
            producto: { id: productoTerminadoId },
            cantidad: 100, // 🚨 Imposible, sólo quedan 5
            precioVenta: 100,
          },
        ],
      },
    }).then((res) => {
      // El GlobalExceptionHandler debe retornar 400, no 200 ni 500
      expect(res.status).to.eq(400);
      expect(res.body.message).to.include("Stock insuficiente");
    });
  });
});
