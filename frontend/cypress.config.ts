// frontend/cypress.config.ts
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    // shop.cy.js ใช้ cy.visit('/shop') ต้องมี baseUrl ไม่งั้น visit ไม่ได้
    // (override ได้ด้วย env: CYPRESS_BASE_URL=http://...)
    baseUrl: "http://localhost:8443",

    // ตัวอย่างของ Cypress ที่ยิงไป example.cypress.io (ต้องใช้อินเทอร์เน็ต + ไม่เกี่ยวกับโปรเจกต์)
    excludeSpecPattern: [
      "**/1-getting-started/**",
      "**/2-advanced-examples/**",
    ],

    // ลองใหม่ 1 ครั้งเฉพาะตอนรันใน CI (cypress run) ไม่กระทบ cypress open
    retries: { runMode: 1, openMode: 0 },

    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
