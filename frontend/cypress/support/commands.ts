// ***********************************************
// Custom Cypress Commands for MakitScale
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      loginViaAPI(username: string, password: string): Chainable<void>;
      crearProductoAPI(nombre: string, tipo: string, unidad: string): Chainable<number>;
      crearProveedorAPI(nombre: string): Chainable<number>;
    }
  }
}

// Login directo via API - mucho más rápido que usar la UI
Cypress.Commands.add("loginViaAPI", (username: string, password: string) => {
  cy.request("POST", `${Cypress.env("apiUrl")}/auth/login`, {
    username,
    password,
  }).then((response) => {
    expect(response.status).to.eq(200);
    const { token } = response.body;
    // Guardar token como cookie para que el middleware lo acepte
    cy.setCookie("makitscale_token", token);
  });
});

// Crear producto via API directamente (sin pasar por UI)
Cypress.Commands.add("crearProductoAPI", (nombre: string, tipo: string, unidad: string) => {
  cy.getCookie("makitscale_token").then((cookie) => {
    cy.request({
      method: "POST",
      url: `${Cypress.env("apiUrl")}/productos`,
      headers: { Authorization: `Bearer ${cookie?.value}` },
      body: { nombre, tipo, unidad, stockActual: 0, costoPromedioPonderado: 0 },
    }).then((res) => {
      expect(res.status).to.eq(200);
      return res.body.id;
    });
  });
});

// Crear proveedor via API
Cypress.Commands.add("crearProveedorAPI", (nombre: string) => {
  cy.getCookie("makitscale_token").then((cookie) => {
    cy.request({
      method: "POST",
      url: `${Cypress.env("apiUrl")}/proveedores`,
      headers: { Authorization: `Bearer ${cookie?.value}` },
      body: { nombre, contacto: "Test" },
    }).then((res) => {
      expect(res.status).to.eq(200);
      return res.body.id;
    });
  });
});

export {};
