// frontend/cypress/support/commands.ts
// Custom Cypress commands (โหลดโดย support/e2e.ts)

declare global {
  namespace Cypress {
    interface Chainable {
      /** Stub API ของหน้า Shop: หมวดหมู่ + รายการสินค้า (ใช้ fixtures/categories.json, products.json) */
      mockCatalog(): Chainable<void>
    }
  }
}

Cypress.Commands.add('mockCatalog', () => {
  // ใช้ pathname เพื่อให้ match ทุก query string (?category=...&sort=...)
  cy.intercept({ method: 'GET', pathname: '/api/product-categories' }, { fixture: 'categories.json' }).as('getCategories')
  cy.intercept({ method: 'GET', pathname: '/api/products' }, { fixture: 'products.json' }).as('getProducts')
})

export {}