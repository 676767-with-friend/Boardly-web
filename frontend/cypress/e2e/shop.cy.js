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
    cy.intercept('GET', '/api/productscategory=Strategy', { fixture: 'products.json' }).as('getFiltered')
    cy.contains('aside', 'Category').parent().contains('button', 'Strategy').click()
    cy.wait('@getFiltered')
  })

  it('Should filter products by difficulty', () => {
    cy.intercept('GET', '/api/productsdifficulty=easy', { fixture: 'products.json' }).as('getEasy')
    cy.contains('button', 'Easy').click()
    cy.wait('@getEasy')
  })

  it('Should re-query the API when the sort order changes', () => {
    cy.intercept('GET', '/api/productssort=priceAsc', { fixture: 'products.json' }).as('getSorted')
    cy.get('select').select('Price: Low to High')
    cy.wait('@getSorted')
  })

  it('Should show an empty state with a "Clear filters" action when no games match', () => {
    cy.intercept('GET', '/api/products*', { body: { content: [], page: 0, size: 100, totalElements: 0 } }).as('getEmpty')
    cy.contains('button', 'Easy').click()
    cy.wait('@getEmpty')
    cy.contains('No games match your filters').should('be.visible')
    cy.contains('button', 'Clear filters').click()
  })

  it('Should navigate to the product detail page when a product card is clicked', () => {
    cy.intercept('GET', '/api/products/prod-001', { fixture: 'product-detail.json' }).as('getProduct')
    cy.contains('Catan').click()
    cy.url().should('include', '/products/prod-001')
  })
})