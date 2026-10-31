// frontend/cypress/e2e/shop.cy.js
// ใช้ cy.mockCatalog() (support/commands.ts) + fixtures: Categories.json, Products.json, Product-detail.json
describe('Boardly - Shop Page', () => {
  beforeEach(() => {
    cy.mockCatalog()
    cy.visit('/shop')
    cy.wait(['@getCategories', '@getProducts'])
  })

  it('Should list every product returned by the API', () => {
    cy.contains('h1', 'Board Games').should('be.visible')
    cy.contains('(2)').should('be.visible')
    cy.contains('Catan').should('be.visible')
    cy.contains('Azul').should('be.visible')
  })

  it('Should filter products by category when a sidebar item is clicked', () => {
    cy.intercept(
      { method: 'GET', pathname: '/api/products', query: { category: 'Strategy' } },
      { fixture: 'Products.json' },
    ).as('getFiltered')

    cy.contains('aside button', 'Strategy').click()
    cy.wait('@getFiltered')
  })

  it('Should filter products by difficulty', () => {
    cy.intercept(
      { method: 'GET', pathname: '/api/products', query: { difficulty: 'easy' } },
      { fixture: 'Products.json' },
    ).as('getEasy')

    cy.contains('aside button', 'Easy').click()
    cy.wait('@getEasy')
  })

  it('Should re-query the API when the sort order changes', () => {
    cy.intercept(
      { method: 'GET', pathname: '/api/products', query: { sort: 'priceAsc' } },
      { fixture: 'Products.json' },
    ).as('getSorted')

    cy.get('select').select('Price: Low to High')
    cy.wait('@getSorted')
  })

  it('Should show an empty state with a "Clear filters" action when no games match', () => {
    cy.intercept(
      { method: 'GET', pathname: '/api/products' },
      { body: { content: [], page: 0, size: 100, totalElements: 0 } },
    ).as('getEmpty')

    cy.contains('aside button', 'Easy').click()
    cy.wait('@getEmpty')
    cy.contains('No games match your filters').should('be.visible')
    cy.contains('button', 'Clear filters').click()
  })

  it('Should navigate to the product detail page when a product card is clicked', () => {
    cy.intercept(
      { method: 'GET', pathname: '/api/products/prod-001' },
      { fixture: 'Product-detail.json' },
    ).as('getProduct')

    cy.contains('Catan').click()
    cy.url().should('include', '/products/prod-001')
    cy.wait('@getProduct')
    cy.contains('h1', 'Catan').should('be.visible')
  })
})
