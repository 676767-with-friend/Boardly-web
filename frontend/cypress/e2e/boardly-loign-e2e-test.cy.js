// cypress/e2e/boardly-extra.cy.js
// Login / Sign In tests
// ต้องรันแอปอยู่ที่ http://localhost:8443 (docker compose up)

// ใช้ baseUrl ถ้าตั้งไว้ใน cypress.config.ts ไม่งั้น fallback เป็น 8443
const go = (path) =>
  cy.visit((Cypress.config('baseUrl') || 'http://localhost:8443') + path)

// หา input จากข้อความ label (ฟอร์ม Boardly ครอบ input ด้วย <label>)
const inputOf = (labelText) => cy.contains('label', labelText).find('input')

describe('Boardly - Login / Sign In', () => {
  beforeEach(() => {
    go('/login')
  })

  // AUTH-001: กด Sign In โดยไม่กรอกอะไร -> เห็นข้อความเตือน
  it('AUTH-001: Login form shows validation error when submitted empty', () => {
    cy.contains('button', 'Sign In').click()

    cy.get('[role="alert"]')
      .should('be.visible')
      .and('contain.text', 'Enter your email and password.')
    cy.url().should('include', '/login')
  })

  // AUTH-002: Login สำเร็จด้วยบัญชี customer (ใช้ backend จริง)
  it('AUTH-002: Customer can log in and is redirected to /account', () => {
    inputOf('Email').type('customer@boardly.com')
    inputOf('Password').type('customer')
    cy.contains('button', 'Sign In').click()

    cy.url().should('include', '/account')
    cy.url().should('not.include', '/login')
  })
})
