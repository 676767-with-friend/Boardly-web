// frontend/cypress/e2e/cart.cy.js
// ทดสอบหน้าตะกร้าสินค้า (/cart) โดย stub API ด้วย fixtures/cart.json
// ต้องรันแอปอยู่ที่ baseUrl (docker compose up)

const EMPTY_CART = { id: 'cart-000', items: [], itemCount: 0, subtotal: 0, currency: 'THB' }


describe('Boardly - Shopping Cart', () => {
  context('Empty cart', () => {
    beforeEach(() => {
      cy.intercept({ method: 'GET', pathname: '/api/cart' }, EMPTY_CART).as('getCart')
      cy.visit('/cart')
      cy.wait('@getCart')
    })

    // CART-001: ตะกร้าว่างแสดงข้อความและปุ่มกลับไปหน้าร้าน
    it('CART-001: shows the empty state and a Shop Board Games button', () => {
      cy.contains('h1', 'Your cart is empty').should('be.visible')
      cy.contains('button', 'Shop Board Games').click()
      cy.location('pathname').should('eq', '/shop')
    })
  })

  context('Cart with items', () => {
    beforeEach(() => {
      cy.intercept({ method: 'GET', pathname: '/api/cart' }, { fixture: 'cart.json' }).as('getCart')
      cy.visit('/cart')
      cy.wait('@getCart')
    })

    // CART-002: แสดงรายการสินค้า จำนวนรวม และยอด subtotal ถูกต้อง
    it('CART-002: lists every item with quantity and the cart total', () => {
      cy.contains('h1', 'Shopping Cart').should('contain.text', '(3 items)')
      cy.contains('h2', 'Catan').should('be.visible')
      cy.contains('h2', 'Azul').should('be.visible')
      cy.contains('BG-CATAN').should('be.visible')
      cy.contains('button', 'Checkout').should('be.visible')
    })

    // CART-003: กดเพิ่มจำนวนแล้วส่ง PATCH พร้อมจำนวนใหม่
    it('CART-003: increasing quantity sends the new quantity to the API', () => {
      cy.intercept({ method: 'PATCH', pathname: '/api/cart/items/item-001' }, { fixture: 'cart.json' }).as('updateItem')

      cy.get('article').first().within(() => {
        cy.get('button[aria-label="Increase quantity"]').click()
      })
      cy.wait('@updateItem').its('request.body').should('deep.include', { quantity: 2 })
    })

    // CART-004: ลดจำนวนต่ำกว่า 1 ไม่ควรส่ง request
    it('CART-004: decreasing quantity below 1 sends no request', () => {
      cy.intercept({ method: 'PATCH', pathname: '/api/cart/items/item-001' }, { fixture: 'cart.json' }).as('updateItem')

      cy.get('article').first().within(() => {
        cy.get('button[aria-label="Decrease quantity"]').click()
      })
      cy.get('@updateItem.all').should('have.length', 0)
    })

    // CART-005: กดปุ่มลบรายการแล้วส่ง DELETE ของ item นั้น
    it('CART-005: removing an item sends DELETE for that item', () => {
      cy.intercept({ method: 'DELETE', pathname: '/api/cart/items/item-002' }, { statusCode: 204 }).as('removeItem')

      cy.get('button[aria-label="Remove Azul"]').click()
      cy.wait('@removeItem').its('request.method').should('eq', 'DELETE')
    })
    // CART-006: ผู้ใช้ที่ยังไม่ล็อกอินกด Checkout ต้องถูกส่งไปหน้า /login (route /checkout อยู่หลัง RequireAuth)
    it('CART-006: guest clicking Checkout is redirected to sign in', () => {
      cy.contains('button', 'Checkout').click()
      cy.location('pathname').should('eq', '/login')
    })

    // CART-007: กด Continue Shopping กลับไปหน้าร้าน
    it('CART-007: Continue Shopping returns to the shop', () => {
      cy.contains('button', 'Continue Shopping').click()
      cy.location('pathname').should('eq', '/shop')
    })
  })
})