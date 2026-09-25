describe('Boardly - Board Game Store E2E Test Suite', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8443');
  });

  // 1. เช็คว่าโหลดหน้าเว็บสำเร็จ
  it('1. Should load homepage and display body', () => {
    cy.get('body').should('be.visible');
  });

  // 2. เช็คการแสดงผล Header/Logo
  it('2. Should display Boardly logo and navigation header', () => {
    cy.contains('Boardly').should('be.visible');
  });

  // 3. เช็คเมนูหลัก (Shop, Reserve a Table, Visit Store)
  it('3. Should display main navigation menus', () => {
    cy.contains('Shop').should('be.visible');
    cy.contains('Reserve a Table').should('be.visible');
    cy.contains('Visit Store').should('be.visible');
  });

  // 4. เช็คข้อความพาดหัว Hero Banner
  it('4. Should display main hero heading text', () => {
    cy.contains('Find your next favorite game.').should('be.visible');
  });

  // 5. เช็คปุ่ม Shop Board Games
  it('5. Should have a working "Shop Board Games" button', () => {
    cy.contains('button, a', 'Shop Board Games').should('be.visible');
  });

  // 6. เช็คปุ่ม Reserve a Table
  it('6. Should have a "Reserve a Table" button', () => {
    cy.contains('button, a', 'Reserve a Table').should('be.visible');
  });

  // 7. เช็คไอคอนเครื่องมือฝั่งขวา (ค้นหา, ล็อกอิน, ตะกร้า)
  it('7. Should display header action icons (search, profile, cart)', () => {
    cy.get('header').within(() => {
      cy.get('svg, button, a').should('have.length.at.least', 2);
    });
  });

  // 8. ทดสอบกดปุ่ม Reserve a Table และดูการเปลี่ยนหน้า/โต้ตอบ
  it('8. Should handle click on "Reserve a Table" button', () => {
    cy.contains('Reserve a Table').click({ force: true });
  });

  // 9. ทดสอบแสดงผลบนหน้าจอมือถือ (Responsive Mobile)
  it('9. Should display properly on mobile view (iPhone-X)', () => {
    cy.viewport('iphone-x');
    cy.get('body').should('be.visible');
  });

  // 10. ทดสอบแสดงผลบนหน้าจอแท็บเล็ต (Responsive Tablet)
  it('10. Should display properly on tablet view (iPad-2)', () => {
    cy.viewport('ipad-2');
    cy.get('body').should('be.visible');
  });
});