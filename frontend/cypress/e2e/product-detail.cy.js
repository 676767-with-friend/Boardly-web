// frontend/cypress/e2e/product-detail.cy.js
// ทดสอบหน้ารายละเอียดสินค้า (/products/:id) โดย stub API ด้วย fixtures
// ใช้ Product-detail.json และ Products.json (ตัวพิมพ์ตรงกับชื่อไฟล์จริง เพื่อให้รันบน Linux/CI ได้)

const PRODUCT_URL = '/products/prod-001'

describe('Boardly - Product Detail Page', () => {
  beforeEach(() => {
    cy.intercept({ method: 'GET', pathname: '/api/products/prod-001' }, { fixture: 'Product-detail.json' }).as('getProduct')
    cy.intercept({ method: 'GET', pathname: '/api/products' }, { fixture: 'Products.json' }).as('getProducts')
    cy.intercept({ method: 'GET', pathname: '/api/cart' }, { fixture: 'cart.json' }).as('getCart')
  })

  context('Rendering', () => {
    beforeEach(() => {
      cy.visit(PRODUCT_URL)
      cy.wait(['@getProduct', '@getProducts'])
    })

    // PDP-001: แสดงชื่อสินค้า ราคา และข้อมูลพื้นฐาน
    it('PDP-001: shows the product name, description and game details', () => {
      cy.contains('h1', 'Catan').should('be.visible')
      cy.contains('Trade, build and settle the island of Catan.').should('be.visible')

      // SKU / Publisher / Designer อยู่ในแท็บ "Game Details" (แท็บเริ่มต้นคือ "About This Game")
      cy.contains('button', 'Game Details').click()
      cy.contains('BG-CATAN').should('be.visible')
      cy.contains('Kosmos').should('be.visible')
      cy.contains('Klaus Teuber').should('be.visible')
    })

    // PDP-002: breadcrumb "Home / Shop" กลับไปหน้าที่ถูกต้อง
    it('PDP-002: breadcrumb returns to the shop page', () => {
      cy.contains('button', 'Shop').click()
      cy.location('pathname').should('eq', '/shop')
    })

    // PDP-003: ปุ่ม + และ - ปรับจำนวน และ - ต่ำสุดที่ 1
    it('PDP-003: quantity controls increase and never drop below 1', () => {
      cy.get('button').contains(/^\+$/).click()
      cy.get('button').contains(/^\+$/).click()
      cy.contains('span, div', /^3$/).should('be.visible')

      cy.get('button').contains(/^-$/).click()
      cy.get('button').contains(/^-$/).click()
      cy.get('button').contains(/^-$/).click()
      cy.contains('span, div', /^1$/).should('be.visible')
    })
  })

  context('Add to cart', () => {
    beforeEach(() => {
      cy.visit(PRODUCT_URL)
      cy.wait('@getProduct')
    })

    // PDP-004: เพิ่มลงตะกร้าด้วยจำนวนที่เลือก และแสดงสถานะ "Added to Cart"
    it('PDP-004: adds the selected quantity to the cart', () => {
      cy.intercept({ method: 'POST', pathname: '/api/cart/items' }, { fixture: 'cart.json' }).as('addItem')

      cy.get('button').contains(/^\+$/).click()
      cy.contains('button', 'Add to Cart').click()

      cy.wait('@addItem').its('request.body').should('deep.equal', { productId: 'prod-001', quantity: 2 })
      cy.contains('button', 'Added to Cart').should('be.visible')
    })

    // PDP-005: เพิ่มลงตะกร้าไม่สำเร็จ ต้องไม่แสดง "Added to Cart"
    it('PDP-005: does not show success when the cart API fails', () => {
      cy.intercept({ method: 'POST', pathname: '/api/cart/items' }, {
        statusCode: 500,
        body: { status: 500, code: 'INTERNAL_ERROR', message: 'Cart service unavailable.' },
      }).as('addItemFail')

      cy.contains('button', 'Add to Cart').click()
      cy.wait('@addItemFail')
      cy.contains('button', 'Added to Cart').should('not.exist')
    })

    // PDP-006: หลังเพิ่มสินค้าแล้วกด View Cart ไปหน้าตะกร้า
    it('PDP-006: View Cart navigates to the cart page', () => {
      cy.intercept({ method: 'POST', pathname: '/api/cart/items' }, { fixture: 'cart.json' }).as('addItem')

      cy.contains('button', 'Add to Cart').click()
      cy.wait('@addItem')
      cy.contains('button', 'View Cart').click()
      cy.location('pathname').should('eq', '/cart')
    })
  })

  context('Out of stock', () => {
    // PDP-007: สินค้าหมดสต็อกต้องกดเพิ่มลงตะกร้าไม่ได้
    it('PDP-007: Add to Cart is disabled when stock is 0', () => {
      cy.fixture('Product-detail.json').then((product) => {
        cy.intercept({ method: 'GET', pathname: '/api/products/prod-001' }, { ...product, stock: 0 }).as('getProductOos')
      })

      cy.visit(PRODUCT_URL)
      cy.wait('@getProductOos')
      cy.contains('button', 'Add to Cart').should('be.disabled')
    })
  })
})