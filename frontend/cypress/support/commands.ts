// frontend/cypress/support/commands.ts
// Custom Cypress commands (โหลดโดย support/e2e.ts)

declare global {
  namespace Cypress {
    interface Chainable {
      /** Stub API ของหน้า Shop: หมวดหมู่ + รายการสินค้า (ใช้ fixtures/Categories.json, Products.json) */
      mockCatalog(): Chainable<void>
    }
  }
}

Cypress.Commands.add('mockCatalog', () => {
  // ใช้ pathname เพื่อให้ match ทุก query string (?category=...&sort=...)
  cy.intercept({ method: 'GET', pathname: '/api/product-categories' }, { fixture: 'Categories.json' }).as('getCategories')
  cy.intercept({ method: 'GET', pathname: '/api/products' }, { fixture: 'Products.json' }).as('getProducts')
})

export {}
