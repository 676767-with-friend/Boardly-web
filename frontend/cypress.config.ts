
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    // shop.cy.js ใช้ cy.visit('/shop') ต้องมี baseUrl ไม่งั้น visit ไม่ได้
    // (override ได้ด้วย env: CYPRESS_BASE_URL=http://...)
    baseUrl: "http://localhost:8443",

    // ลองใหม่ 1 ครั้งเฉพาะตอนรันใน CI (cypress run) ไม่กระทบ cypress open
    retries: { runMode: 1, openMode: 0 },

    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
