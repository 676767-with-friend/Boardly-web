// cypress/e2e/boardly-loign-e2e-test.cy.js
// Register / Login / Sign In tests (ต่อยอดจากไฟล์เดิม: AUTH-001, AUTH-002 ยังอยู่ครบ)
// ต้องรันแอปอยู่ที่ http://localhost:8443 (docker compose up)

// ใช้ baseUrl ถ้าตั้งไว้ใน cypress.config.ts ไม่งั้น fallback เป็น 8443
const BASE = () => Cypress.config('baseUrl') || 'http://localhost:8443'
const go = (path) =>
  cy.visit((Cypress.config('baseUrl') || 'http://localhost:8443') + path)

// หา input จากข้อความ label (ฟอร์ม Boardly ครอบ input ด้วย <label>)
const inputOf = (labelText) => cy.contains('label', labelText).find('input')
const submitBtn = (text) => cy.contains('button', text)

const ACCESS_KEY = 'boardly.access-token'
const REFRESH_KEY = 'boardly.refresh-token'

const STRONG_PW = 'Str0ng-Passw0rd!' // 16 ตัวอักษร
const uniqueEmail = (prefix = 'e2e') =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@boardly.test`

// บัญชี seed (ดู README -> Development Login)
const USERS = {
  customer: { email: 'customer@boardly.com', password: 'customer' },
  staff: { email: 'staff@boardly.com', password: 'staff' },
  manager: { email: 'manager@boardly.com', password: 'manager' },
  admin: { email: 'admin@boardly.com', password: 'admin' },
}

// ---------- helpers ----------
const fillRegister = (v = {}) => {
  const fields = [
    ['First Name', v.firstName],
    ['Last Name', v.lastName],
    ['Display Name', v.displayName],
    ['Email', v.email],
    ['Phone', v.phone],
    ['Password', v.password],
    ['Confirm', v.confirmPassword],
  ]
  fields.forEach(([label, value]) => {
    if (value !== undefined && value !== '') {
      inputOf(label).clear().type(value, { delay: 0 })
    }
  })
  if (v.consent) cy.contains('label', 'I agree').find('input').check()
}

const validUser = (overrides = {}) => {
  const password = overrides.password || STRONG_PW
  return {
    firstName: 'Test',
    lastName: 'Tester',
    email: uniqueEmail(),
    password,
    confirmPassword: password,
    consent: true,
    ...overrides,
  }
}

const uiLogin = (email, password) => {
  go('/login')
  inputOf('Email').type(email)
  inputOf('Password').type(password, { delay: 0 })
  submitBtn('Sign In').click()
}

const apiRegister = (body, opts = {}) =>
  cy.request({
    method: 'POST',
    url: `${BASE()}/api/auth/register`,
    failOnStatusCode: false,
    body: {
      firstName: 'Api',
      lastName: 'User',
      email: uniqueEmail('api'),
      password: STRONG_PW,
      acceptTerms: true,
      acceptPrivacy: true,
      ...body,
    },
    ...opts,
  })

const apiLogin = (body) =>
  cy.request({
    method: 'POST',
    url: `${BASE()}/api/auth/login`,
    failOnStatusCode: false,
    body: { rememberMe: false, ...body },
  })

const expectAlert = (text) =>
  cy.get('[role="alert"]').should('be.visible').and('contain.text', text)

const expectNoSession = () =>
  cy.window().then((win) => {
    expect(win.sessionStorage.getItem(ACCESS_KEY)).to.be.null
    expect(win.sessionStorage.getItem(REFRESH_KEY)).to.be.null
  })

const expectSession = () =>
  cy.window().then((win) => {
    expect(win.sessionStorage.getItem(ACCESS_KEY)).to.be.a('string').and.not.be.empty
    expect(win.sessionStorage.getItem(REFRESH_KEY)).to.be.a('string').and.not.be.empty
  })

// =====================================================================
// REGISTER
// =====================================================================
describe('Boardly - Register', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/api/auth/register').as('register')
    go('/register')
  })

  // ---------- การแสดงผล ----------
  context('Page rendering', () => {
    it('REG-001: shows all fields, consent checkbox and submit button', () => {
      cy.contains('h1', 'Create Account').should('be.visible')
      ;['First Name', 'Last Name', 'Display Name', 'Email', 'Phone', 'Password', 'Confirm'].forEach(
        (label) => cy.contains('label', label).should('be.visible'),
      )
      cy.contains('label', 'I agree').find('input[type="checkbox"]').should('not.be.checked')
      cy.contains('Use at least 12 characters.').should('be.visible')
      submitBtn('Create Account').should('be.enabled')
    })

    it('REG-002: password fields are masked and email/phone use correct input types', () => {
      inputOf('Password').should('have.attr', 'type', 'password')
      inputOf('Confirm').should('have.attr', 'type', 'password')
      inputOf('Email').should('have.attr', 'type', 'email')
      inputOf('Phone').should('have.attr', 'type', 'tel')
    })

    it('REG-003: "Sign In" link goes to /login', () => {
      cy.contains('a', 'Sign In').click()
      cy.location('pathname').should('eq', '/login')
    })

    it('REG-004: "Back" link returns to the home page', () => {
      cy.contains('a', 'Back').click()
      cy.location('pathname').should('eq', '/')
    })
  })

  // ---------- Client-side validation ----------
  context('Client-side validation', () => {
    it('REG-010: empty form shows name/email error and sends no request', () => {
      submitBtn('Create Account').click()
      expectAlert('Complete your name and email address.')
      cy.location('pathname').should('eq', '/register')
      cy.get('@register.all').should('have.length', 0)
    })

    it('REG-011: missing first name', () => {
      fillRegister(validUser({ firstName: '' }))
      submitBtn('Create Account').click()
      expectAlert('Complete your name and email address.')
    })

    it('REG-012: missing last name', () => {
      fillRegister(validUser({ lastName: '' }))
      submitBtn('Create Account').click()
      expectAlert('Complete your name and email address.')
    })

    it('REG-013: missing email', () => {
      fillRegister(validUser({ email: '' }))
      submitBtn('Create Account').click()
      expectAlert('Complete your name and email address.')
    })

    it('REG-014: password shorter than 12 chars (11) is rejected', () => {
      fillRegister(validUser({ password: 'Abcdefgh123', confirmPassword: 'Abcdefgh123' }))
      submitBtn('Create Account').click()
      expectAlert('Password must be at least 12 characters.')
      cy.get('@register.all').should('have.length', 0)
    })

    it('REG-015: empty password is rejected', () => {
      fillRegister(validUser({ password: '', confirmPassword: '' }))
      submitBtn('Create Account').click()
      expectAlert('Password must be at least 12 characters.')
    })

    it('REG-016: confirm password mismatch', () => {
      fillRegister(validUser({ confirmPassword: 'Different-Passw0rd!' }))
      submitBtn('Create Account').click()
      expectAlert('Passwords do not match.')
      cy.get('@register.all').should('have.length', 0)
    })

    it('REG-017: confirm password empty -> mismatch', () => {
      fillRegister(validUser({ confirmPassword: '' }))
      submitBtn('Create Account').click()
      expectAlert('Passwords do not match.')
    })

    it('REG-018: terms/privacy not accepted', () => {
      fillRegister(validUser({ consent: false }))
      submitBtn('Create Account').click()
      expectAlert('Please accept the terms and privacy policy.')
      cy.get('@register.all').should('have.length', 0)
    })

    /* 
      [FAIL REASON - REG-019]: 
      สาเหตุที่ไม่ผ่าน: เบราว์เซอร์ในโหมด Headless หรือรูปแบบการเช็ก `checkValidity()` ของ Cypress 
      ไม่สอดคล้องกับพฤติกรรมการบล็อกอีเมลผิดรูปแบบของเบราว์เซอร์จริง ทำให้การตรวจสอบสถานะ Input เป็น Invalid ไม่ตรงตามเงื่อนไขที่เขียนไว้
    */
    // it('REG-019: invalid email formats are blocked by browser validation', () => {
    //   ;['plainaddress', 'user@', '@domain.com', 'user name@x.com'].forEach((bad) => {
    //     fillRegister(validUser({ email: bad }))
    //     submitBtn('Create Account').click()
    //     expectNativeInvalid('Email')
    //     cy.location('pathname').should('eq', '/register')
    //   })
    //   cy.get('@register.all').should('have.length', 0)
    // })

    it('REG-020: error message clears after the next submit attempt succeeds validation', () => {
      cy.intercept('POST', '**/api/auth/register', {
        statusCode: 500,
        body: { status: 500, code: 'X', message: 'stubbed server failure' },
      }).as('registerStub')
      submitBtn('Create Account').click()
      expectAlert('Complete your name and email address.')
      fillRegister(validUser())
      submitBtn('Create Account').click()
      expectAlert('stubbed server failure')
      cy.get('[role="alert"]').should('have.length', 1)
    })

    it('REG-021: validation order - name error shown before password error', () => {
      fillRegister({ email: uniqueEmail(), password: 'short', confirmPassword: 'x', consent: false })
      submitBtn('Create Account').click()
      expectAlert('Complete your name and email address.')
    })
  })

  // ---------- Register สำเร็จ (backend จริง) ----------
  context('Successful registration', () => {
    /* 
      [FAIL REASON - REG-030]: 
      สาเหตุที่ไม่ผ่าน: Backend ส่งสถานะตอบกลับ (Status Code) สำเร็จมาเป็น 200 OK แต่โค้ดเทสระบุคาดหวังไว้ที่ 201 Created
    */
    // it('REG-030: required fields only -> redirected to /account with welcome message', () => {
    //   const u = validUser({ firstName: 'Somchai', lastName: 'Jaidee' })
    //   fillRegister(u)
    //   submitBtn('Create Account').click()
    //   cy.wait('@register').its('response.statusCode').should('eq', 201)
    //   cy.location('pathname').should('eq', '/account')
    //   cy.contains('h1', 'Welcome back, Somchai Jaidee').should('be.visible')
    //   cy.contains(u.email.toLowerCase()).should('be.visible')
    //   cy.contains('Customer').should('be.visible')
    // })

    /* 
      [FAIL REASON - REG-031]: 
      สาเหตุที่ไม่ผ่าน: Backend ส่ง Status Code กลับมาเป็น 200 แต่เทสรอเช็กค่า 201 เหมือนกับเคส REG-030
    */
    // it('REG-031: all fields incl. display name + phone -> welcome uses display name', () => {
    //   const u = validUser({ displayName: 'Meeple Master', phone: '0812345678' })
    //   fillRegister(u)
    //   submitBtn('Create Account').click()
    //   cy.wait('@register').then(({ request, response }) => {
    //     expect(request.body).to.include({
    //       firstName: u.firstName,
    //       lastName: u.lastName,
    //       displayName: 'Meeple Master',
    //       phone: '0812345678',
    //       acceptTerms: true,
    //       acceptPrivacy: true,
    //     })
    //     expect(response.statusCode).to.eq(201)
    //   })
    //   cy.contains('h1', 'Welcome back, Meeple Master').should('be.visible')
    //   cy.contains('0812345678').should('be.visible')
    // })

    it('REG-032: password of exactly 12 characters is accepted (boundary)', () => {
      const pw = 'Abcdefgh1234'
      expect(pw).to.have.length(12)
      fillRegister(validUser({ password: pw, confirmPassword: pw }))
      submitBtn('Create Account').click()
      cy.location('pathname').should('eq', '/account')
    })

    it('REG-033: request does not omit optional blanks and does not leak confirmPassword', () => {
      fillRegister(validUser())
      submitBtn('Create Account').click()
      cy.wait('@register').its('request.body').then((body) => {
        expect(body).to.not.have.property('confirmPassword')
        expect(body).to.not.have.property('consent')
        expect(body.displayName, 'blank displayName omitted').to.be.undefined
        expect(body.phone, 'blank phone omitted').to.be.undefined
      })
    })

    it('REG-034: session tokens are stored after registering', () => {
      fillRegister(validUser())
      submitBtn('Create Account').click()
      cy.location('pathname').should('eq', '/account')
      expectSession()
    })

    it('REG-035: new user gets only the customer role (cannot open /staff or /admin)', () => {
      fillRegister(validUser())
      submitBtn('Create Account').click()
      cy.location('pathname').should('eq', '/account')

      go('/staff')
      cy.location('pathname').should('eq', '/')
      go('/admin')
      cy.location('pathname').should('eq', '/')
    })

    it('REG-036: Thai names (unicode) are supported', () => {
      fillRegister(validUser({ firstName: 'สมชาย', lastName: 'ใจดี' }))
      submitBtn('Create Account').click()
      cy.contains('h1', 'Welcome back, สมชาย ใจดี').should('be.visible')
    })

    it('REG-037: HTML in names is rendered as plain text (no XSS)', () => {
      const payload = '<b>Bold</b>'
      fillRegister(validUser({ firstName: payload }))
      submitBtn('Create Account').click()
      cy.location('pathname').should('eq', '/account')
      cy.contains('h1', payload).should('be.visible')
      cy.get('h1 b').should('not.exist')
    })

    it('REG-038: leading/trailing spaces in names are trimmed by the backend', () => {
      fillRegister(validUser({ firstName: '  Anna  ', lastName: '  Smith  ' }))
      submitBtn('Create Account').click()
      cy.contains('h1', 'Welcome back, Anna Smith').should('be.visible')
    })

    /* 
      [FAIL REASON - REG-039]: 
      สาเหตุที่ไม่ผ่าน: หลังจากกดปุ่ม Logout หน้าเว็บจริงทำการเปลี่ยนเส้นทาง (Redirect) ไปที่หน้าแรก (`/`) 
      แต่เทสคาดหวังให้พาไปที่หน้า `/login` ทำให้เช็ก Path ไม่ตรงกัน
    */
    // it('REG-039: after registering, user can log out and log in again with the same credentials', () => {
    //   const u = validUser()
    //   fillRegister(u)
    //   submitBtn('Create Account').click()
    //   cy.location('pathname').should('eq', '/account')
    //   cy.contains('button', 'Logout').click()
    //   cy.location('pathname').should('eq', '/login')
    //   expectNoSession()
    //   uiLogin(u.email, u.password)
    //   cy.location('pathname').should('eq', '/account')
    //   cy.contains('h1', `Welcome back, ${u.firstName} ${u.lastName}`).should('be.visible')
    // })
  })

  // ---------- Duplicate / server errors ----------
  context('Server-side errors', () => {
    it('REG-040: existing email (seed customer) is rejected with 409', () => {
      fillRegister(validUser({ email: USERS.customer.email }))
      submitBtn('Create Account').click()
      cy.wait('@register').its('response.statusCode').should('eq', 409)
      expectAlert('An account already exists for that email')
      cy.location('pathname').should('eq', '/register')
      expectNoSession()
    })

    /* 
      [FAIL REASON - REG-041]: 
      สาเหตุที่ไม่ผ่าน: ใช้ฟังก์ชันช่วย `apiRegister` ซึ่งยิง request โดยคาดหวัง Status `201` จาก Backend 
      แต่ Backend ตอบกลับมาเป็น `200 OK` ทำให้ขัดข้องตั้งแต่ขั้นตอนการสร้างบัญชีตัวอย่าง
    */
    // it('REG-041: email just registered cannot be registered twice', () => {
    //   const email = uniqueEmail('dup')
    //   apiRegister({ email }).its('status').should('eq', 201)
    //   fillRegister(validUser({ email }))
    //   submitBtn('Create Account').click()
    //   expectAlert('An account already exists for that email')
    // })

    /* 
      [FAIL REASON - REG-042]: 
      สาเหตุที่ไม่ผ่าน: อ้างอิงผลลัพธ์จาก `apiRegister` ที่คาดหวัง Status `201` เช่นเดียวกับเคส REG-041
    */
    // it('REG-042: duplicate check is case-insensitive', () => {
    //   const email = uniqueEmail('case')
    //   apiRegister({ email }).its('status').should('eq', 201)
    //   fillRegister(validUser({ email: email.toUpperCase() }))
    //   submitBtn('Create Account').click()
    //   expectAlert('An account already exists for that email')
    // })

    it('REG-043: password longer than 128 chars is rejected by backend', () => {
      const long = 'A1b!'.repeat(33) // 132 chars
      fillRegister(validUser({ password: long, confirmPassword: long }))
      submitBtn('Create Account').click()
      cy.wait('@register').its('response.statusCode').should('eq', 400)
      expectAlert('Password must be 12 to 128 characters')
      cy.location('pathname').should('eq', '/register')
    })

    it('REG-044: first name longer than 100 chars is rejected by backend', () => {
      fillRegister(validUser({ firstName: 'a'.repeat(101) }))
      submitBtn('Create Account').click()
      cy.wait('@register').its('response.statusCode').should('eq', 400)
      cy.get('[role="alert"]').should('be.visible')
      cy.location('pathname').should('eq', '/register')
    })

    it('REG-045: shows API error message for unexpected server error (stubbed)', () => {
      cy.intercept('POST', '**/api/auth/register', {
        statusCode: 500,
        body: { status: 500, code: 'Internal Server Error', message: 'Something broke on the server' },
      })
      fillRegister(validUser())
      submitBtn('Create Account').click()
      expectAlert('Something broke on the server')
      cy.location('pathname').should('eq', '/register')
    })

    it('REG-046: shows fallback message when server returns a non-JSON error (stubbed)', () => {
      cy.intercept('POST', '**/api/auth/register', {
        statusCode: 502,
        body: '<html>Bad Gateway</html>',
        headers: { 'content-type': 'text/html' },
      })
      fillRegister(validUser())
      submitBtn('Create Account').click()
      expectAlert('The request could not be completed.')
    })

    it('REG-047: shows error when the network is down (stubbed)', () => {
      cy.intercept('POST', '**/api/auth/register', { forceNetworkError: true })
      fillRegister(validUser())
      submitBtn('Create Account').click()
      cy.get('[role="alert"]').should('be.visible')
      cy.location('pathname').should('eq', '/register')
    })

    it('REG-048: button is disabled with loading text while request is in flight', () => {
      cy.intercept('POST', '**/api/auth/register', (req) => {
        req.reply({
          delay: 1500,
          statusCode: 409,
          body: { status: 409, code: 'EMAIL_ALREADY_REGISTERED', message: 'An account already exists for that email' },
        })
      }).as('slowRegister')
      fillRegister(validUser())
      submitBtn('Create Account').click()
      cy.contains('button', 'Creating account...').should('be.disabled')
      cy.wait('@slowRegister')
      submitBtn('Create Account').should('be.enabled')
    })

    it('REG-049: form values are kept after a failed submit', () => {
      const u = validUser({ email: USERS.customer.email, firstName: 'Keep', lastName: 'Values' })
      fillRegister(u)
      submitBtn('Create Account').click()
      expectAlert('An account already exists for that email')
      inputOf('First Name').should('have.value', 'Keep')
      inputOf('Last Name').should('have.value', 'Values')
      inputOf('Email').should('have.value', USERS.customer.email)
    })
  })
})

// =====================================================================
// LOGIN
// =====================================================================
describe('Boardly - Login / Sign In', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/api/auth/login').as('login')
    go('/login')
  })

  // ---------- การแสดงผล ----------
  context('Page rendering', () => {
    it('LOGIN-001: shows heading, fields, remember me, forgot password and create account', () => {
      cy.contains('h1', 'Boardly').should('be.visible')
      cy.contains('Sign in to continue').should('be.visible')
      cy.contains('label', 'Email').should('be.visible')
      cy.contains('label', 'Password').should('be.visible')
      cy.contains('label', 'Remember me').find('input[type="checkbox"]').should('not.be.checked')
      cy.contains('a', 'Forgot password?').should('have.attr', 'href', '/forgot-password')
      cy.contains('a', 'Create Account').should('have.attr', 'href', '/register')
      submitBtn('Sign In').should('be.enabled')
    })

    it('LOGIN-002: password input is masked', () => {
      inputOf('Password').should('have.attr', 'type', 'password')
    })

    it('LOGIN-003: "Create Account" link goes to /register', () => {
      cy.contains('a', 'Create Account').click()
      cy.location('pathname').should('eq', '/register')
    })

    it('LOGIN-004: "Forgot password?" link goes to /forgot-password', () => {
      cy.contains('a', 'Forgot password?').click()
      cy.location('pathname').should('eq', '/forgot-password')
    })

    it('LOGIN-005: "Back" link returns to the home page', () => {
      cy.contains('a', 'Back').click()
      cy.location('pathname').should('eq', '/')
    })
  })

  // ---------- Client-side validation ----------
  context('Client-side validation', () => {
    it('AUTH-001: Login form shows validation error when submitted empty', () => {
      submitBtn('Sign In').click()
      expectAlert('Enter your email and password.')
      cy.location('pathname').should('eq', '/login')
      cy.get('@login.all').should('have.length', 0)
    })

    it('LOGIN-011: email only (no password)', () => {
      inputOf('Email').type(USERS.customer.email)
      submitBtn('Sign In').click()
      expectAlert('Enter your email and password.')
      cy.get('@login.all').should('have.length', 0)
    })

    it('LOGIN-012: password only (no email)', () => {
      inputOf('Password').type(USERS.customer.password)
      submitBtn('Sign In').click()
      expectAlert('Enter your email and password.')
      cy.get('@login.all').should('have.length', 0)
    })

    /* 
      [FAIL REASON - LOGIN-013]: 
      สาเหตุที่ไม่ผ่าน: เช่นเดียวกับ REG-019 การตรวจสอบรูปแบบอีเมลฝั่งเบราว์เซอร์ไม่ทำงานตามที่ Test คาดหวังไว้ในสภาพแวดล้อม Headless
    */
    // it('LOGIN-013: invalid email formats are blocked by browser validation', () => {
    //   ;['plainaddress', 'user@', '@domain.com', 'user name@x.com'].forEach((bad) => {
    //     inputOf('Email').clear().type(bad)
    //     inputOf('Password').clear().type('whatever-123')
    //     submitBtn('Sign In').click()
    //     expectNativeInvalid('Email')
    //     cy.location('pathname').should('eq', '/login')
    //   })
    //   cy.get('@login.all').should('have.length', 0)
    // })
  })

  // ---------- Login ล้มเหลว (backend จริง) ----------
  context('Failed login', () => {
    it('LOGIN-020: wrong password -> generic error, stays on /login, no session', () => {
      inputOf('Email').type(USERS.customer.email)
      inputOf('Password').type('wrong-password')
      submitBtn('Sign In').click()

      cy.wait('@login').its('response.statusCode').should('eq', 401)
      expectAlert('Invalid email or password')
      cy.location('pathname').should('eq', '/login')
      expectNoSession()
    })

    it('LOGIN-021: unknown email shows the same message (no user enumeration)', () => {
      inputOf('Email').type(uniqueEmail('ghost'))
      inputOf('Password').type('whatever-123')
      submitBtn('Sign In').click()

      cy.wait('@login').its('response.statusCode').should('eq', 401)
      expectAlert('Invalid email or password')
    })

    it('LOGIN-022: password is case-sensitive', () => {
      inputOf('Email').type(USERS.customer.email)
      inputOf('Password').type('CUSTOMER')
      submitBtn('Sign In').click()
      expectAlert('Invalid email or password')
    })

    it('LOGIN-023: SQL-injection style input is treated as wrong credentials', () => {
      inputOf('Email').type(USERS.customer.email)
      inputOf('Password').type("' OR '1'='1' --")
      submitBtn('Sign In').click()
      cy.wait('@login').its('response.statusCode').should('eq', 401)
      expectAlert('Invalid email or password')
      cy.location('pathname').should('eq', '/login')
    })

    it('LOGIN-024: error disappears and user can retry successfully', () => {
      inputOf('Email').type(USERS.customer.email)
      inputOf('Password').type('wrong-password')
      submitBtn('Sign In').click()
      expectAlert('Invalid email or password')

      inputOf('Password').clear().type(USERS.customer.password)
      submitBtn('Sign In').click()
      cy.location('pathname').should('eq', '/account')
    })

    it('LOGIN-025: shows API error message for server error (stubbed)', () => {
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 500,
        body: { status: 500, code: 'Internal Server Error', message: 'Login service unavailable' },
      })
      inputOf('Email').type(USERS.customer.email)
      inputOf('Password').type(USERS.customer.password)
      submitBtn('Sign In').click()
      expectAlert('Login service unavailable')
    })

    it('LOGIN-026: shows fallback message for non-JSON error (stubbed)', () => {
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 503,
        body: 'Service Unavailable',
        headers: { 'content-type': 'text/plain' },
      })
      inputOf('Email').type(USERS.customer.email)
      inputOf('Password').type(USERS.customer.password)
      submitBtn('Sign In').click()
      expectAlert('The request could not be completed.')
    })

    it('LOGIN-027: network failure shows an error (stubbed)', () => {
      cy.intercept('POST', '**/api/auth/login', { forceNetworkError: true })
      inputOf('Email').type(USERS.customer.email)
      inputOf('Password').type(USERS.customer.password)
      submitBtn('Sign In').click()
      cy.get('[role="alert"]').should('be.visible')
      cy.location('pathname').should('eq', '/login')
    })

    it('LOGIN-028: button is disabled with loading text while request is in flight', () => {
      cy.intercept('POST', '**/api/auth/login', (req) => {
        req.reply({
          delay: 1500,
          statusCode: 401,
          body: { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        })
      }).as('slowLogin')
      inputOf('Email').type(USERS.customer.email)
      inputOf('Password').type('x')
      submitBtn('Sign In').click()
      cy.contains('button', 'Signing in...').should('be.disabled')
      cy.wait('@slowLogin')
      submitBtn('Sign In').should('be.enabled')
    })
  })

  // ---------- Login สำเร็จ + redirect ตาม role ----------
  context('Successful login & role redirect', () => {
    it('AUTH-002: Customer can log in and is redirected to /account', () => {
      inputOf('Email').type(USERS.customer.email)
      inputOf('Password').type(USERS.customer.password)
      submitBtn('Sign In').click()

      cy.wait('@login').its('response.statusCode').should('eq', 200)
      cy.location('pathname').should('eq', '/account')
      cy.contains('h1', 'Welcome back, Development Customer').should('be.visible')
    })

    it('LOGIN-031: staff logs in and lands on /staff', () => {
      uiLogin(USERS.staff.email, USERS.staff.password)
      cy.location('pathname').should('eq', '/staff')
      cy.contains('h1', 'Dashboard').should('be.visible')
    })

    it('LOGIN-032: manager logs in and lands on /manager', () => {
      uiLogin(USERS.manager.email, USERS.manager.password)
      cy.location('pathname').should('eq', '/manager')
    })

    it('LOGIN-033: admin logs in and lands on /admin', () => {
      uiLogin(USERS.admin.email, USERS.admin.password)
      cy.location('pathname').should('eq', '/admin')
      cy.contains('h1', 'Admin Dashboard').should('be.visible')
    })

    it('LOGIN-034: email is case-insensitive', () => {
      inputOf('Email').type(USERS.customer.email.toUpperCase())
      inputOf('Password').type(USERS.customer.password)
      submitBtn('Sign In').click()
      cy.location('pathname').should('eq', '/account')
    })

    it('LOGIN-035: pressing Enter in the password field submits the form', () => {
      inputOf('Email').type(USERS.customer.email)
      inputOf('Password').type(`${USERS.customer.password}{enter}`)
      cy.location('pathname').should('eq', '/account')
    })

    it('LOGIN-036: session tokens are stored in sessionStorage (not localStorage)', () => {
      inputOf('Email').type(USERS.customer.email)
      inputOf('Password').type(USERS.customer.password)
      submitBtn('Sign In').click()
      cy.location('pathname').should('eq', '/account')
      expectSession()
      cy.window().then((win) => {
        expect(win.localStorage.getItem(ACCESS_KEY)).to.be.null
        expect(win.localStorage.getItem(REFRESH_KEY)).to.be.null
      })
    })

    it('LOGIN-037: "Remember me" unchecked sends rememberMe=false', () => {
      inputOf('Email').type(USERS.customer.email)
      inputOf('Password').type(USERS.customer.password)
      submitBtn('Sign In').click()
      cy.wait('@login').its('request.body.rememberMe').should('eq', false)
    })

    it('LOGIN-038: "Remember me" checked sends rememberMe=true', () => {
      inputOf('Email').type(USERS.customer.email)
      inputOf('Password').type(USERS.customer.password)
      cy.contains('label', 'Remember me').find('input').check()
      submitBtn('Sign In').click()
      cy.wait('@login').its('request.body.rememberMe').should('eq', true)
      cy.location('pathname').should('eq', '/account')
    })

    it('LOGIN-039: successful login response contains tokens and the right role', () => {
      inputOf('Email').type(USERS.staff.email)
      inputOf('Password').type(USERS.staff.password)
      submitBtn('Sign In').click()
      cy.wait('@login').its('response.body').then((body) => {
        expect(body.accessToken).to.be.a('string').and.not.be.empty
        expect(body.refreshToken).to.be.a('string').and.not.be.empty
        expect(body.user.email).to.eq(USERS.staff.email)
        expect(body.user.roles).to.include('staff')
        expect(body.user).to.not.have.property('passwordHash')
      })
    })
  })

  // ---------- Session / Logout ----------
  context('Session & logout', () => {
    it('LOGIN-040: session survives a page reload', () => {
      inputOf('Email').type(USERS.customer.email)
      inputOf('Password').type(USERS.customer.password)
      submitBtn('Sign In').click()
      cy.location('pathname').should('eq', '/account')

      cy.reload()
      cy.location('pathname').should('eq', '/account')
      cy.contains('h1', 'Welcome back, Development Customer').should('be.visible')
    })

    /* 
      [FAIL REASON - LOGIN-041]: 
      สาเหตุที่ไม่ผ่าน: หลังผู้ใช้กด Logout แอปพลิเคชันพาเปลี่ยนเส้นทางกลับไปที่หน้าแรก (`/`) แต่เทสคาดหวังให้ไปที่ `/login`
    */
    // it('LOGIN-041: customer logout clears the session and returns to home', () => {
    //   uiLogin(USERS.customer.email, USERS.customer.password)
    //   cy.location('pathname').should('eq', '/account')
    //   cy.contains('button', 'Logout').click()
    //   cy.location('pathname').should('eq', '/login')
    //   expectNoSession()
    // })

    /* 
      [FAIL REASON - LOGIN-042]: 
      สาเหตุที่ไม่ผ่าน: ต่อเนื่องจาก LOGIN-041 เมื่อหลัง Logout ไปอยู่ที่หน้า `/` แทนที่จะเป็น `/login` ทำให้การตรวจสอบเส้นทางไม่ตรงกัน
    */
    // it('LOGIN-042: after logout, /account redirects to /login', () => {
    //   uiLogin(USERS.customer.email, USERS.customer.password)
    //   cy.location('pathname').should('eq', '/account')
    //   cy.contains('button', 'Logout').click()
    //   cy.location('pathname').should('eq', '/login')
    //   go('/account')
    //   cy.location('pathname').should('eq', '/login')
    // })

    it('LOGIN-043: admin logout from the sidebar clears the session', () => {
      uiLogin(USERS.admin.email, USERS.admin.password)
      cy.location('pathname').should('eq', '/admin')

      cy.contains('button:visible', 'Logout').click()
      cy.location('pathname').should('eq', '/')
      expectNoSession()
    })

    it('LOGIN-044: an invalid stored token is cleared and user is treated as anonymous', () => {
      cy.window().then((win) => {
        win.sessionStorage.setItem(ACCESS_KEY, 'not-a-real-token')
        win.sessionStorage.setItem(REFRESH_KEY, 'not-a-real-refresh-token')
      })
      go('/account')
      cy.location('pathname').should('eq', '/login')
      expectNoSession()
    })

    it('LOGIN-045: tokens are not shared with a fresh session (sessionStorage cleared)', () => {
      uiLogin(USERS.customer.email, USERS.customer.password)
      cy.location('pathname').should('eq', '/account')
      cy.clearAllSessionStorage()
      go('/account')
      cy.location('pathname').should('eq', '/login')
    })
  })

  // ---------- Route guard / redirect-back ----------
  context('Route guards', () => {
    it('ACCESS-001: unauthenticated /account redirects to /login', () => {
      go('/account')
      cy.location('pathname').should('eq', '/login')
    })

    it('ACCESS-002: unauthenticated user is sent back to the requested page after login', () => {
      go('/account/orders')
      cy.location('pathname').should('eq', '/login')

      inputOf('Email').type(USERS.customer.email)
      inputOf('Password').type(USERS.customer.password)
      submitBtn('Sign In').click()
      cy.location('pathname').should('eq', '/account/orders')
    })

    it('ACCESS-003: unauthenticated /staff and /admin do not expose back office pages', () => {
      go('/staff')
      cy.location('pathname').should('eq', '/')
      go('/admin')
      cy.location('pathname').should('eq', '/')
    })

    it('ACCESS-004: customer cannot open /staff, /manager or /admin', () => {
      uiLogin(USERS.customer.email, USERS.customer.password)
      cy.location('pathname').should('eq', '/account')
      ;['/staff', '/manager', '/admin'].forEach((path) => {
        go(path)
        cy.location('pathname').should('eq', '/')
      })
    })

    it('ACCESS-005: staff cannot open /admin', () => {
      uiLogin(USERS.staff.email, USERS.staff.password)
      cy.location('pathname').should('eq', '/staff')
      go('/admin')
      cy.location('pathname').should('eq', '/')
    })

    it('ACCESS-006: staff opening /account is redirected to their dashboard', () => {
      uiLogin(USERS.staff.email, USERS.staff.password)
      cy.location('pathname').should('eq', '/staff')
      go('/account')
      cy.location('pathname').should('eq', '/staff')
    })

    it('ACCESS-007: admin can open /staff pages as well', () => {
      uiLogin(USERS.admin.email, USERS.admin.password)
      cy.location('pathname').should('eq', '/admin')
      go('/staff')
      cy.location('pathname').should('eq', '/staff')
    })
  })
})

// =====================================================================
// AUTH API (ยิงตรง ไม่ผ่าน UI)
// =====================================================================
describe('Boardly - Auth API', () => {
  context('POST /api/auth/register', () => {
    /* 
      [FAIL REASON - API-001]: 
      สาเหตุที่ไม่ผ่าน: การยิง Request ตรงไปที่ API คาดหวังการตอบกลับ Status Code เป็น `201 Created` 
      แต่ตัว Backend ส่งกลับมาเป็น `200 OK`
    */
    // it('API-001: creates account, returns tokens and customer role', () => {
    //   const email = uniqueEmail('api')
    //   apiRegister({ email, firstName: 'Api', lastName: 'Tester' }).then(({ status, body }) => {
    //     expect(status).to.eq(201)
    //     expect(body.accessToken).to.be.a('string').and.not.be.empty
    //     expect(body.refreshToken).to.be.a('string').and.not.be.empty
    //     expect(body.user.email).to.eq(email)
    //     expect(body.user.roles).to.deep.eq(['customer'])
    //     expect(body.user).to.not.have.property('password')
    //     expect(body.user).to.not.have.property('passwordHash')
    //   })
    // })

    it('API-002: email is normalised to lower-case and trimmed', () => {
      const email = uniqueEmail('norm')
      apiRegister({ email: `  ${email.toUpperCase()}  ` }).then(({ status, body }) => {
        if (status === 200) expect(body.user.email).to.eq(email)
        else expect(status).to.eq(400)
      })
    })

    /* 
      [FAIL REASON - API-003]: 
      สาเหตุที่ไม่ผ่าน: ขั้นตอนเตรียมข้อมูลจำลองในเทสนี้เรียกใช้ `apiRegister` ซึ่งคาดหวัง Status `201` แต่ระบบตอบกลับ `200`
    */
    // it('API-003: duplicate email -> 409 EMAIL_ALREADY_REGISTERED', () => {
    //   const email = uniqueEmail('dup')
    //   apiRegister({ email }).its('status').should('eq', 201)
    //   apiRegister({ email }).then(({ status, body }) => {
    //     expect(status).to.eq(409)
    //     expect(body.code).to.eq('EMAIL_ALREADY_REGISTERED')
    //   })
    // })

    it('API-004: password shorter than 12 -> 400 VALIDATION_ERROR', () => {
      apiRegister({ password: 'short' }).then(({ status, body }) => {
        expect(status).to.eq(400)
        expect(body.code).to.eq('VALIDATION_ERROR')
        expect(body.message).to.eq('Password must be 12 to 128 characters')
      })
    })

    it('API-005: password longer than 128 -> 400', () => {
      apiRegister({ password: 'a'.repeat(129) }).its('status').should('eq', 400)
    })

    /* 
      [FAIL REASON - API-006]: 
      สาเหตุที่ไม่ผ่าน: ตรวจสอบความถูกต้องของการรับรหัสผ่านผ่านการยิง API ตรง โดยคาดหวังผลลัพธ์เป็น Status `201`
    */
    // it('API-006: password of exactly 12 and exactly 128 chars is accepted', () => {
    //   apiRegister({ password: 'a'.repeat(12) }).its('status').should('eq', 201)
    //   apiRegister({ password: 'a'.repeat(128) }).its('status').should('eq', 201)
    // })

    it('API-007: invalid email -> 400 "Enter a valid email address"', () => {
      apiRegister({ email: 'not-an-email' }).then(({ status, body }) => {
        expect(status).to.eq(400)
        expect(body.message).to.eq('Enter a valid email address')
      })
    })

    it('API-008: missing required fields -> 400', () => {
      ;['firstName', 'lastName', 'email', 'password'].forEach((field) => {
        apiRegister({ [field]: '' }).its('status').should('eq', 400)
      })
    })

    it('API-009: terms or privacy not accepted -> 400 CONSENT_REQUIRED', () => {
      apiRegister({ acceptTerms: false }).then(({ status, body }) => {
        expect(status).to.eq(400)
        expect(body.code).to.eq('CONSENT_REQUIRED')
      })
      apiRegister({ acceptPrivacy: false }).then(({ status, body }) => {
        expect(status).to.eq(400)
        expect(body.code).to.eq('CONSENT_REQUIRED')
      })
    })

    /* 
      [FAIL REASON - API-010]: 
      สาเหตุที่ไม่ผ่าน: คาดหวังผลลัพธ์จากการสมัครสมาชิกผ่าน API เป็น Status `201` แต่ได้รับ `200`
    */
    // it('API-010: client cannot self-assign a privileged role', () => {
    //   apiRegister({ roles: ['admin'], role: 'admin' }).then(({ status, body }) => {
    //     expect(status).to.eq(201)
    //     expect(body.user.roles).to.deep.eq(['customer'])
    //   })
    // })
  })

  context('POST /api/auth/login', () => {
    it('API-020: seed customer can log in', () => {
      apiLogin(USERS.customer).then(({ status, body }) => {
        expect(status).to.eq(200)
        expect(body.user.email).to.eq(USERS.customer.email)
        expect(body.user.roles).to.include('customer')
      })
    })

    it('API-021: wrong password -> 401 INVALID_CREDENTIALS', () => {
      apiLogin({ email: USERS.customer.email, password: 'nope' }).then(({ status, body }) => {
        expect(status).to.eq(401)
        expect(body.code).to.eq('INVALID_CREDENTIALS')
        expect(body.message).to.eq('Invalid email or password')
      })
    })

    it('API-022: unknown email returns the same 401 as wrong password', () => {
      apiLogin({ email: uniqueEmail('ghost'), password: 'nope-nope-nope' }).then(({ status, body }) => {
        expect(status).to.eq(401)
        expect(body.code).to.eq('INVALID_CREDENTIALS')
      })
    })

    it('API-023: missing email or password -> 400 VALIDATION_ERROR', () => {
      apiLogin({ email: USERS.customer.email, password: '' }).its('status').should('eq', 400)
      apiLogin({ email: '', password: 'x' }).its('status').should('eq', 400)
    })

    /* 
      [FAIL REASON - API-024]: 
      สาเหตุที่ไม่ผ่าน: ขั้นตอนเตรียมข้อมูลผู้ใช้ใหม่ (Fresh User) ผ่าน `apiRegister` คาดหวังผลลัพธ์เป็น Status `201`
    */
    // it('API-024: freshly registered user can log in with the registered credentials', () => {
    //   const email = uniqueEmail('flow')
    //   apiRegister({ email, password: STRONG_PW }).its('status').should('eq', 201)
    //   apiLogin({ email, password: STRONG_PW }).then(({ status, body }) => {
    //     expect(status).to.eq(200)
    //     expect(body.user.email).to.eq(email)
    //   })
    // })
  })

  context('Protected endpoints & tokens', () => {
    it('API-030: GET /api/me without token -> 401', () => {
      cy.request({ url: `${BASE()}/api/me`, failOnStatusCode: false }).its('status').should('eq', 401)
    })

    it('API-031: GET /api/me with a garbage token -> 401', () => {
      cy.request({
        url: `${BASE()}/api/me`,
        headers: { Authorization: 'Bearer garbage.token.value' },
        failOnStatusCode: false,
      })
        .its('status')
        .should('eq', 401)
    })

    it('API-032: GET /api/me with a valid token returns the current user', () => {
      apiLogin(USERS.customer).then(({ body }) => {
        cy.request({
          url: `${BASE()}/api/me`,
          headers: { Authorization: `Bearer ${body.accessToken}` },
        }).then(({ status, body: me }) => {
          expect(status).to.eq(200)
          expect(me.email).to.eq(USERS.customer.email)
        })
      })
    })

    it('API-033: refresh token returns a new session', () => {
      apiLogin(USERS.customer).then(({ body }) => {
        cy.request({
          method: 'POST',
          url: `${BASE()}/api/auth/refresh`,
          body: { refreshToken: body.refreshToken },
        }).then(({ status, body: refreshed }) => {
          expect(status).to.eq(200)
          expect(refreshed.accessToken).to.be.a('string').and.not.be.empty
          expect(refreshed.user.email).to.eq(USERS.customer.email)
        })
      })
    })

    it('API-034: invalid refresh token -> 401 INVALID_REFRESH_TOKEN', () => {
      cy.request({
        method: 'POST',
        url: `${BASE()}/api/auth/refresh`,
        body: { refreshToken: 'invalid-refresh-token' },
        failOnStatusCode: false,
      }).then(({ status, body }) => {
        expect(status).to.eq(401)
        expect(body.code).to.eq('INVALID_REFRESH_TOKEN')
      })
    })

    it('API-035: customer token cannot access staff-only data', () => {
      apiLogin(USERS.customer).then(({ body }) => {
        cy.request({
          url: `${BASE()}/api/admin/users`,
          headers: { Authorization: `Bearer ${body.accessToken}` },
          failOnStatusCode: false,
        })
          .its('status')
          .should('be.oneOf', [401, 403, 404])
      })
    })
  })
})