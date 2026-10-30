// frontend/cypress/e2e/checkout.cy.js
// ทดสอบขั้นตอน Checkout: Information -> Pickup -> Payment -> Order Confirmed
// - ล็อกอินด้วยบัญชี seed จริง (ต้องรัน docker compose up ก่อน) เพราะหน้า /checkout ต้องล็อกอิน
// - stub cart / checkout API ด้วย fixtures เพื่อไม่สร้างออเดอร์จริงใน database

const CUSTOMER = { email: 'customer@boardly.com', password: 'customer' }
const ORDER_NUMBER = 'BG-2026-0001'

// หน้า Login: <label> ครอบ <input> (nested)
const loginInputOf = (labelText) => cy.contains('label', labelText).find('input')
// ฟอร์ม Checkout (Field component): <label> กับ <input> เป็นพี่น้องกันใน <div> เดียวกัน
const fieldOf = (labelText) => cy.contains('label', labelText).parent().find('input')
const nextButton = (text) => cy.contains('button', text)

const uiLogin = () => {
  cy.visit('/login')
  loginInputOf('Email').type(CUSTOMER.email)
  loginInputOf('Password').type(CUSTOMER.password, { delay: 0 })
  cy.contains('button', 'Sign In').click()
  cy.location('pathname').should('not.eq', '/login')
}

// cy.type('') ใช้ไม่ได้ จึงล้างช่องเสมอ แล้วพิมพ์เฉพาะเมื่อมีค่า
const setField = (label, value) => {
  fieldOf(label).clear()
  if (value) fieldOf(label).type(value)
}

const fillContact = (overrides = {}) => {
  const values = { firstName: 'Test', lastName: 'Customer', email: 'customer@boardly.com', ...overrides }
  setField('First Name', values.firstName)
  setField('Last Name', values.lastName)
  setField('Email', values.email)
}

const pickBranch = (name) => {
  cy.get('button[aria-haspopup="listbox"]').click()
  cy.get('[role="listbox"]').contains('[role="option"]', name).click()
}

describe('Boardly - Checkout', () => {
  beforeEach(() => {
    cy.intercept({ method: 'GET', pathname: '/api/cart' }, { fixture: 'cart.json' }).as('getCart')
    cy.intercept({ method: 'GET', pathname: '/api/checkout/options' }, { fixture: 'checkout-options.json' }).as('getOptions')
    uiLogin()
    cy.visit('/checkout')
    cy.wait(['@getCart', '@getOptions'])
  })

  context('Information step', () => {
    // CHK-001: แสดงฟิลด์ข้อมูลติดต่อครบ และ progress แสดงขั้นแรก
    it('CHK-001: shows contact fields on the Information step', () => {
      cy.contains('h1', 'Checkout').should('be.visible')
      cy.contains('h2', 'Contact Information').should('be.visible')
      ;['First Name', 'Last Name', 'Email', 'Phone'].forEach((label) => {
        cy.contains('label', label).should('be.visible')
      })
    })

    // CHK-002: ไม่กรอกชื่อ/อีเมล ต้องแสดงข้อผิดพลาดและยังอยู่ขั้นเดิม
    it('CHK-002: empty contact details are rejected', () => {
      fillContact({ firstName: '', lastName: '', email: '' })
      nextButton('Continue to Pickup').click()
      cy.contains('Enter your name and a valid email address to continue.').should('be.visible')
      cy.contains('h2', 'Contact Information').should('be.visible')
    })

    // CHK-003: อีเมลรูปแบบผิดต้องถูกบล็อก
    it('CHK-003: an invalid email address is rejected', () => {
      fillContact({ email: 'not-an-email' })
      nextButton('Continue to Pickup').click()
      cy.contains('Enter your name and a valid email address to continue.').should('be.visible')
    })

    // CHK-004: กรอกข้อมูลถูกต้องแล้วไปขั้น Pickup
    it('CHK-004: valid contact details move to the Pickup step', () => {
      fillContact()
      nextButton('Continue to Pickup').click()
      cy.contains('h2', 'Fulfillment Method').should('be.visible')
      cy.contains('Store Pickup').should('be.visible')
    })
  })

  context('Pickup step', () => {
    beforeEach(() => {
      fillContact()
      nextButton('Continue to Pickup').click()
    })

    // CHK-005: ยังไม่เลือกสาขาแล้วกดต่อ ต้องแสดงข้อผิดพลาด
    it('CHK-005: continuing without a pickup branch shows an error', () => {
      nextButton('Continue to Payment').click()
      cy.contains('Select a pickup method and branch to continue.').should('be.visible')
      cy.contains('h2', 'Fulfillment Method').should('be.visible')
    })

    // CHK-006: เลือกสาขาแล้วไปขั้น Payment ได้
    it('CHK-006: selecting a branch allows moving to the Payment step', () => {
      pickBranch('Central Branch')
      nextButton('Continue to Payment').click()
      cy.contains('h2', 'Payment Method').should('be.visible')
      cy.contains('Development Mock Payment').should('be.visible')
    })

    // CHK-007: ปุ่ม Back ย้อนกลับขั้นก่อนหน้าได้
    it('CHK-007: Back returns to the Information step', () => {
      nextButton('Back').click()
      cy.contains('h2', 'Contact Information').should('be.visible')
    })
  })

  context('Placing an order', () => {
    beforeEach(() => {
      fillContact()
      nextButton('Continue to Pickup').click()
      pickBranch('Central Branch')
      nextButton('Continue to Payment').click()
    })

    // CHK-008: กด Place Order ส่งข้อมูลที่ถูกต้องไป API และไปหน้ายืนยันออเดอร์
    it('CHK-008: placing an order sends the checkout payload and shows the confirmation', () => {
      cy.intercept({ method: 'POST', pathname: '/api/checkout' }, { fixture: 'order.json' }).as('placeOrder')
      cy.intercept({ method: 'GET', pathname: `/api/orders/${ORDER_NUMBER}` }, { fixture: 'order.json' }).as('getOrder')

      nextButton('Place Order').click()

      cy.wait('@placeOrder').its('request.body').should((body) => {
        expect(body.contactFirstName).to.eq('Test')
        expect(body.contactLastName).to.eq('Customer')
        expect(body.contactEmail).to.eq('customer@boardly.com')
        expect(body.fulfillmentMethodId).to.eq('ful-pickup')
        expect(body.pickupBranchId).to.eq('br-central')
        expect(body.paymentMethodId).to.eq('pay-dev')
      })

      cy.location('pathname').should('eq', `/orders/${ORDER_NUMBER}/confirmation`)
      cy.contains('h1', 'Order Confirmed').should('be.visible')
      cy.contains(`Order #${ORDER_NUMBER}`).should('be.visible')
      cy.contains('Central Branch').should('be.visible')
    })

    // CHK-009: API ส่ง error (เช่น สต็อกไม่พอ) ต้องแสดงข้อความและอยู่หน้า Checkout
    it('CHK-009: a failed order shows the server message and stays on checkout', () => {
      cy.intercept({ method: 'POST', pathname: '/api/checkout' }, {
        statusCode: 409,
        body: { status: 409, code: 'INSUFFICIENT_STOCK', message: 'Some items are no longer in stock.' },
      }).as('placeOrderFail')

      nextButton('Place Order').click()
      cy.wait('@placeOrderFail')
      cy.contains('Some items are no longer in stock.').should('be.visible')
      cy.location('pathname').should('eq', '/checkout')
    })
  })
})