package com.boardly.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardly.auth.AuthDtos;
import com.boardly.branch.BranchRepository;
import com.boardly.inventory.BranchProductInventory;
import com.boardly.inventory.BranchProductInventoryId;
import com.boardly.inventory.BranchProductInventoryRepository;
import com.boardly.inventory.InventoryMovementRepository;
import com.boardly.user.Role;
import com.boardly.user.RoleRepository;
import com.boardly.user.StaffBranchAssignment;
import com.boardly.user.StaffBranchAssignmentId;
import com.boardly.user.StaffBranchAssignmentRepository;
import com.boardly.user.User;
import com.boardly.user.UserRepository;
import com.boardly.user.UserRole;
import com.boardly.user.UserRoleId;
import com.boardly.user.UserRoleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/**
 * ADM-06 — global inventory management through {@code /api/admin/inventory}.
 *
 * <ul>
 *   <li>An admin can adjust stock up and down and every change writes an inventory movement.</li>
 *   <li>Stock can never go negative (nor below the reserved quantity).</li>
 *   <li>Customers, staff, managers and anonymous callers cannot use the admin endpoints.</li>
 * </ul>
 *
 * Every test builds its own inventory row (reserved = 0 unless stated) so it does not depend on seed quantities.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GlobalInventoryApiTests {
    private static final UUID CENTRAL = UUID.fromString("50000000-0000-0000-0000-000000000001");
    private static final String PASSWORD = "GlobalInventoryPassword!2026";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired UserRoleRepository userRoles;
    @Autowired StaffBranchAssignmentRepository assignments;
    @Autowired BranchRepository branches;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired BranchProductInventoryRepository inventory;
    @Autowired InventoryMovementRepository movements;
    @Autowired ProductRepository products;

    // ---------- admin: adjust stock ----------

    @Test
    void adminCanIncreaseAndDecreaseStock() throws Exception {
        String adminToken = createUserWithRoleAndLogin("gi-admin-adjust@example.test", "admin", null);
        UUID productId = stockNewProduct(adminToken, 5);
        long movementsBefore = movements.count();

        patchStock(adminToken, productId, 3)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantityOnHand").value(8))
                .andExpect(jsonPath("$.availableQuantity").value(8));

        patchStock(adminToken, productId, -2)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantityOnHand").value(6))
                .andExpect(jsonPath("$.availableQuantity").value(6));

        assertEquals(6, onHand(productId));
        assertEquals(movementsBefore + 2, movements.count(), "each adjustment must write one inventory movement");

        mockMvc.perform(get("/api/admin/inventory").header("Authorization", bearer(adminToken))
                        .param("branchId", CENTRAL.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.productId == '" + productId + "')].quantityOnHand").value(6));
    }

    // ---------- admin: stock must not go negative ----------

    @Test
    void adminCannotReduceStockBelowZero() throws Exception {
        String adminToken = createUserWithRoleAndLogin("gi-admin-negative@example.test", "admin", null);
        UUID productId = stockNewProduct(adminToken, 5);
        long movementsBefore = movements.count();

        patchStock(adminToken, productId, -6).andExpect(status().isBadRequest());

        assertEquals(5, onHand(productId), "rejected adjustment must not change stock");
        assertEquals(movementsBefore, movements.count(), "rejected adjustment must not write a movement");
    }

    @Test
    void adminCanReduceStockToExactlyZeroButNotFurther() throws Exception {
        String adminToken = createUserWithRoleAndLogin("gi-admin-zero@example.test", "admin", null);
        UUID productId = stockNewProduct(adminToken, 5);

        patchStock(adminToken, productId, -5)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantityOnHand").value(0))
                .andExpect(jsonPath("$.availableQuantity").value(0));

        patchStock(adminToken, productId, -1).andExpect(status().isBadRequest());
        assertEquals(0, onHand(productId));
    }

    @Test
    void adminCannotReduceStockBelowReservedQuantity() throws Exception {
        String adminToken = createUserWithRoleAndLogin("gi-admin-reserved@example.test", "admin", null);
        UUID productId = stockNewProduct(adminToken, 5);
        BranchProductInventory row = inventory.findById(new BranchProductInventoryId(CENTRAL, productId)).orElseThrow();
        row.setReservedQuantity(3);
        inventory.save(row);

        // 5 on hand, 3 reserved -> only 2 can be removed.
        patchStock(adminToken, productId, -3).andExpect(status().isBadRequest());
        assertEquals(5, onHand(productId));

        patchStock(adminToken, productId, -2)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantityOnHand").value(3))
                .andExpect(jsonPath("$.reservedQuantity").value(3))
                .andExpect(jsonPath("$.availableQuantity").value(0));
    }

    // ---------- admin: request validation ----------

    @Test
    void adminAdjustmentOfZeroIsRejected() throws Exception {
        String adminToken = createUserWithRoleAndLogin("gi-admin-zero-delta@example.test", "admin", null);
        UUID productId = stockNewProduct(adminToken, 5);

        patchStock(adminToken, productId, 0).andExpect(status().isBadRequest());
        assertEquals(5, onHand(productId));
    }

    @Test
    void adminAdjustmentWithoutDeltaOrBranchIsRejected() throws Exception {
        String adminToken = createUserWithRoleAndLogin("gi-admin-missing@example.test", "admin", null);
        UUID productId = stockNewProduct(adminToken, 5);

        mockMvc.perform(patch("/api/admin/inventory/{productId}", productId)
                        .header("Authorization", bearer(adminToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"branchId\":\"" + CENTRAL + "\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(patch("/api/admin/inventory/{productId}", productId)
                        .header("Authorization", bearer(adminToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantityDelta\":1}"))
                .andExpect(status().isBadRequest());
        assertEquals(5, onHand(productId));
    }

    @Test
    void adminAdjustmentBeyondMinimumDeltaIsRejected() throws Exception {
        String adminToken = createUserWithRoleAndLogin("gi-admin-min@example.test", "admin", null);
        UUID productId = stockNewProduct(adminToken, 5);

        patchStock(adminToken, productId, -100001).andExpect(status().isBadRequest());
        assertEquals(5, onHand(productId));
    }

    @Test
    void adjustingAProductThatIsNotStockedReturnsNotFound() throws Exception {
        String adminToken = createUserWithRoleAndLogin("gi-admin-notfound@example.test", "admin", null);
        UUID unstocked = unstockedProductId();

        patchStock(adminToken, unstocked, 1).andExpect(status().isNotFound());
    }

    @Test
    void adminCannotAddNegativeInitialStock() throws Exception {
        String adminToken = createUserWithRoleAndLogin("gi-admin-add-negative@example.test", "admin", null);
        UUID unstocked = unstockedProductId();

        mockMvc.perform(post("/api/admin/inventory").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(addBody(unstocked, -1)))
                .andExpect(status().isBadRequest());
        org.junit.jupiter.api.Assertions.assertFalse(
                inventory.existsById(new BranchProductInventoryId(CENTRAL, unstocked)));
    }

    // ---------- authorization: only admin ----------

    @Test
    void customerCannotAdjustOrAddGlobalInventory() throws Exception {
        String adminToken = createUserWithRoleAndLogin("gi-admin-for-customer@example.test", "admin", null);
        UUID productId = stockNewProduct(adminToken, 5);
        String customerToken = registerCustomer("gi-customer@example.test");

        assertAdminInventoryForbidden(customerToken, productId);
        assertEquals(5, onHand(productId));
    }

    @Test
    void staffCannotAdjustOrAddGlobalInventory() throws Exception {
        String adminToken = createUserWithRoleAndLogin("gi-admin-for-staff@example.test", "admin", null);
        UUID productId = stockNewProduct(adminToken, 5);
        String staffToken = createUserWithRoleAndLogin("gi-staff@example.test", "staff", CENTRAL);

        assertAdminInventoryForbidden(staffToken, productId);
        assertEquals(5, onHand(productId));
    }

    @Test
    void managerCannotAdjustOrAddGlobalInventory() throws Exception {
        String adminToken = createUserWithRoleAndLogin("gi-admin-for-manager@example.test", "admin", null);
        UUID productId = stockNewProduct(adminToken, 5);
        String managerToken = createUserWithRoleAndLogin("gi-manager@example.test", "manager", CENTRAL);

        assertAdminInventoryForbidden(managerToken, productId);
        assertEquals(5, onHand(productId));
    }

    @Test
    void anonymousCallerIsRejectedFromGlobalInventory() throws Exception {
        String adminToken = createUserWithRoleAndLogin("gi-admin-for-anon@example.test", "admin", null);
        UUID productId = stockNewProduct(adminToken, 5);

        mockMvc.perform(patch("/api/admin/inventory/{productId}", productId)
                        .contentType(MediaType.APPLICATION_JSON).content(adjustBody(1)))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/inventory").param("branchId", CENTRAL.toString()))
                .andExpect(status().isUnauthorized());
        assertEquals(5, onHand(productId));
    }

    @Test
    void customerAndStaffCannotReadGlobalInventoryList() throws Exception {
        String customerToken = registerCustomer("gi-customer-read@example.test");
        String staffToken = createUserWithRoleAndLogin("gi-staff-read@example.test", "staff", CENTRAL);

        mockMvc.perform(get("/api/admin/inventory").header("Authorization", bearer(customerToken))
                        .param("branchId", CENTRAL.toString()))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/inventory").header("Authorization", bearer(staffToken))
                        .param("branchId", CENTRAL.toString()))
                .andExpect(status().isForbidden());
    }

    // ---------- helpers ----------

    private void assertAdminInventoryForbidden(String token, UUID productId) throws Exception {
        long movementsBefore = movements.count();
        patchStock(token, productId, 1).andExpect(status().isForbidden());
        patchStock(token, productId, -1).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/inventory").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(addBody(productId, 10)))
                .andExpect(status().isForbidden());
        assertEquals(movementsBefore, movements.count(), "forbidden calls must not write movements");
    }

    private org.springframework.test.web.servlet.ResultActions patchStock(String token, UUID productId, int delta)
            throws Exception {
        return mockMvc.perform(patch("/api/admin/inventory/{productId}", productId)
                .header("Authorization", bearer(token)).contentType(MediaType.APPLICATION_JSON)
                .content(adjustBody(delta)));
    }

    private String adjustBody(int delta) {
        return "{\"branchId\":\"%s\",\"quantityDelta\":%d}".formatted(CENTRAL, delta);
    }

    private String addBody(UUID productId, int quantity) {
        return "{\"branchId\":\"%s\",\"productId\":\"%s\",\"quantityOnHand\":%d,\"lowStockThreshold\":2}"
                .formatted(CENTRAL, productId, quantity);
    }

    /** Picks a product that has no inventory row at the Central branch yet. */
    private UUID unstockedProductId() {
        return products.findAll().stream()
                .filter(p -> !inventory.existsById(new BranchProductInventoryId(CENTRAL, p.getId())))
                .findFirst().orElseThrow().getId();
    }

    /** Creates a fresh inventory row (reserved = 0) at Central and returns the product id. */
    private UUID stockNewProduct(String adminToken, int quantity) throws Exception {
        UUID productId = unstockedProductId();
        mockMvc.perform(post("/api/admin/inventory").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(addBody(productId, quantity)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantityOnHand").value(quantity));
        return productId;
    }

    private int onHand(UUID productId) {
        return inventory.findById(new BranchProductInventoryId(CENTRAL, productId)).orElseThrow().getQuantityOnHand();
    }

    private String registerCustomer(String email) throws Exception {
        AuthDtos.RegisterRequest request = new AuthDtos.RegisterRequest(
                "Inventory", "Customer", "Inventory Customer", email, null, PASSWORD, true, true);
        String content = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(content).path("accessToken").asText();
    }

    private String createUserWithRoleAndLogin(String email, String roleCode, UUID branchId) throws Exception {
        OffsetDateTime now = OffsetDateTime.now();
        User user = new User();
        user.setFirstName("Inventory"); user.setLastName("Test"); user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(PASSWORD)); user.setStatus(User.UserStatus.active);
        user.setCreatedAt(now); user.setUpdatedAt(now); user = users.save(user);
        Role role = roles.findByCodeAndIsActiveTrue(roleCode).orElseThrow();
        UserRole userRole = new UserRole(); userRole.setId(new UserRoleId(user.getId(), role.getId()));
        userRole.setUser(user); userRole.setRole(role); userRole.setAssignedAt(now); userRoles.save(userRole);
        if (branchId != null) {
            StaffBranchAssignment assignment = new StaffBranchAssignment();
            assignment.setId(new StaffBranchAssignmentId(user.getId(), branchId));
            assignment.setUser(user); assignment.setBranch(branches.findById(branchId).orElseThrow());
            assignment.setAssignedAt(now); assignment.setPrimary(true); assignments.save(assignment);
        }
        MvcResult login = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\",\"rememberMe\":false}".formatted(email, PASSWORD)))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(login.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private String bearer(String token) { return "Bearer " + token; }
}
