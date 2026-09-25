package com.boardly.management;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardly.auth.AuthDtos;
import com.boardly.branch.BranchRepository;
import com.boardly.order.FulfillmentMethod;
import com.boardly.order.FulfillmentMethodRepository;
import com.boardly.order.PaymentMethodRepository;
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
import com.fasterxml.jackson.databind.JsonNode;
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
 * Covers the admin/staff endpoints that {@link ManagementApiTests} and the other suites do not
 * yet exercise: branch CRUD, product catalog CRUD, user-status changes, staff re-assignment,
 * staff/admin order + user visibility, and the customer-facing reservation lookup endpoints.
 * Each scenario is its own {@code @Test} method so a failure points at one endpoint/behavior
 * instead of a long multi-step flow.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminOperationsApiTests {
    private static final UUID CENTRAL = UUID.fromString("50000000-0000-0000-0000-000000000001");
    private static final UUID SILOM = UUID.fromString("50000000-0000-0000-0000-000000000002");
    private static final UUID STRATEGY_CATEGORY = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID WINGSPAN = UUID.fromString("20000000-0000-0000-0000-000000000001");
    private static final String PASSWORD = "AdminOpsPassword!2026";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired UserRoleRepository userRoles;
    @Autowired StaffBranchAssignmentRepository assignments;
    @Autowired BranchRepository branches;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired FulfillmentMethodRepository fulfillmentMethods;
    @Autowired PaymentMethodRepository paymentMethods;

    @Test
    void adminCreatesAndUpdatesBranch() throws Exception {
        String adminToken = createAdminAndLogin("admin-ops-branch-admin@example.test");
        String branchCode = "OPS" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();

        MvcResult createdBranch = mockMvc.perform(post("/api/admin/branches").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(branchBody(branchCode, "Ops Test Branch", "active")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(branchCode))
                .andExpect(jsonPath("$.status").value("active")).andReturn();
        String branchId = objectMapper.readTree(createdBranch.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(put("/api/admin/branches/{id}", branchId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(branchBody(branchCode, "Ops Test Branch Renamed", "inactive")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Ops Test Branch Renamed"))
                .andExpect(jsonPath("$.status").value("inactive"));
        mockMvc.perform(get("/api/admin/branches").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code == '" + branchCode + "')].name").value("Ops Test Branch Renamed"));
    }

    @Test
    void managerCannotCreateBranch() throws Exception {
        String managerToken = createManagerAndLogin("admin-ops-branch-manager@example.test", CENTRAL);
        String branchCode = "OPS" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();

        mockMvc.perform(post("/api/admin/branches").header("Authorization", bearer(managerToken))
                        .contentType(MediaType.APPLICATION_JSON).content(branchBody(branchCode, "Denied Branch", "active")))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCreatesAndUpdatesProduct() throws Exception {
        String adminToken = createAdminAndLogin("admin-ops-product-admin@example.test");
        String sku = "OPS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        MvcResult createdProduct = mockMvc.perform(post("/api/admin/products").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(productBody(sku, "Ops Test Game", "1200.00", true)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.sku").value(sku))
                .andExpect(jsonPath("$.basePrice").value(1200.00)).andReturn();
        String productId = objectMapper.readTree(createdProduct.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(put("/api/admin/products/{id}", productId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(productBody(sku, "Ops Test Game", "1500.00", true)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.basePrice").value(1500.00));
        mockMvc.perform(get("/api/admin/products").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.sku == '" + sku + "')].name").value("Ops Test Game"));
    }

    @Test
    void adminAddsAndListsInventoryForANewProduct() throws Exception {
        String adminToken = createAdminAndLogin("admin-ops-inventory-admin@example.test");
        String sku = "OPS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        MvcResult createdProduct = mockMvc.perform(post("/api/admin/products").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(productBody(sku, "Ops Inventory Game", "990.00", true)))
                .andExpect(status().isOk()).andReturn();
        String productId = objectMapper.readTree(createdProduct.getResponse().getContentAsString()).get("id").asText();

        String addInventoryBody = "{\"branchId\":\"%s\",\"productId\":\"%s\",\"quantityOnHand\":5,\"lowStockThreshold\":1}".formatted(CENTRAL, productId);
        mockMvc.perform(post("/api/admin/inventory").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(addInventoryBody))
                .andExpect(status().isOk()).andExpect(jsonPath("$.quantityOnHand").value(5));
        mockMvc.perform(get("/api/admin/inventory").header("Authorization", bearer(adminToken)).param("branchId", CENTRAL.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.productName == 'Ops Inventory Game')].quantityOnHand").value(5));
    }

    @Test
    void adminUpdatesUserStatus() throws Exception {
        String adminToken = createAdminAndLogin("admin-ops-status-admin@example.test");
        String customerEmail = "admin-ops-status-customer@example.test";
        JsonNode customer = register(customerEmail);
        String customerId = customer.path("user").path("id").asText();

        mockMvc.perform(get("/api/admin/users").header("Authorization", bearer(adminToken)).param("search", customerEmail))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].email").value(customerEmail))
                .andExpect(jsonPath("$[0].status").value("active"));
        mockMvc.perform(patch("/api/admin/users/{id}/status", customerId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"suspended\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("suspended"));
        org.junit.jupiter.api.Assertions.assertEquals(User.UserStatus.suspended, users.findById(UUID.fromString(customerId)).orElseThrow().getStatus());
    }

    @Test
    void managerCannotUpdateUserStatus() throws Exception {
        String managerToken = createManagerAndLogin("admin-ops-status-manager@example.test", CENTRAL);
        JsonNode customer = register("admin-ops-status-denied-customer@example.test");
        String customerId = customer.path("user").path("id").asText();

        mockMvc.perform(patch("/api/admin/users/{id}/status", customerId).header("Authorization", bearer(managerToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"suspended\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void staffAndAdminSeeOrdersForThePickupBranch() throws Exception {
        String adminToken = createAdminAndLogin("admin-ops-orders-admin@example.test");
        String staffToken = createStaffAndLogin("admin-ops-orders-staff@example.test", CENTRAL);
        String orderNumber = placePickupOrder("admin-ops-orders-customer@example.test");

        mockMvc.perform(get("/api/staff/orders").header("Authorization", bearer(staffToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.orderNumber == '" + orderNumber + "')]").exists());
        mockMvc.perform(get("/api/admin/orders").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.orderNumber == '" + orderNumber + "')]").exists());
    }

    @Test
    void staffCanSearchCustomerUsers() throws Exception {
        String staffToken = createStaffAndLogin("admin-ops-search-staff@example.test", CENTRAL);
        register("admin-ops-search-customer@example.test");

        mockMvc.perform(get("/api/staff/users").header("Authorization", bearer(staffToken)).param("search", "admin-ops-search-customer"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.email == 'admin-ops-search-customer@example.test')]").exists());
    }

    @Test
    void adminReassignsStaffToNewBranchAndRole() throws Exception {
        String adminToken = createAdminAndLogin("admin-ops-reassign-admin@example.test");
        String staffEmail = "admin-ops-reassign-staff@example.test";
        String createBody = "{\"firstName\":\"Reassign\",\"lastName\":\"Staff\",\"displayName\":\"Reassign Staff\",\"email\":\"%s\",\"phone\":\"0899999999\",\"password\":\"ReassignStaffPassword!\",\"branchIds\":[\"%s\"],\"primaryBranchId\":\"%s\"}"
                .formatted(staffEmail, CENTRAL, CENTRAL);
        MvcResult createdStaff = mockMvc.perform(post("/api/admin/staff").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(createBody))
                .andExpect(status().isOk()).andReturn();
        String staffId = objectMapper.readTree(createdStaff.getResponse().getContentAsString()).get("id").asText();

        String updateBody = "{\"firstName\":\"Reassign\",\"lastName\":\"Manager\",\"displayName\":\"Reassign Manager\",\"phone\":\"0899999999\",\"status\":\"active\",\"branchIds\":[\"%s\",\"%s\"],\"primaryBranchId\":\"%s\",\"role\":\"manager\"}"
                .formatted(CENTRAL, SILOM, SILOM);
        mockMvc.perform(put("/api/admin/staff/{id}", staffId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.branchNames.length()").value(2))
                .andExpect(jsonPath("$.roles[0]").value("manager"));
        org.junit.jupiter.api.Assertions.assertTrue(assignments.existsByUserIdAndBranchId(UUID.fromString(staffId), SILOM));
    }

    @Test
    void customerLooksUpOwnReservationsAndOrders() throws Exception {
        String customerEmail = "admin-ops-lookup-customer@example.test";
        String customerToken = registerAndGetAccessToken(customerEmail);
        String orderNumber = placePickupOrderAs(customerToken, customerEmail);

        mockMvc.perform(get("/api/reservations/me").header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/orders/{orderNumber}", orderNumber).header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.orderNumber").value(orderNumber));
    }

    private String branchBody(String code, String name, String status) {
        return "{\"code\":\"%s\",\"name\":\"%s\",\"address\":\"1 Test Rd\",\"district\":\"Test District\",\"province\":\"Bangkok\",\"postalCode\":\"10110\",\"phone\":\"021234567\",\"status\":\"%s\",\"allowReservations\":true}"
                .formatted(code, name, status);
    }

    private String productBody(String sku, String name, String basePrice, boolean active) {
        return "{\"sku\":\"%s\",\"name\":\"%s\",\"categoryId\":\"%s\",\"basePrice\":%s,\"salePrice\":null,\"minPlayers\":2,\"maxPlayers\":4,\"minPlayTimeMinutes\":30,\"maxPlayTimeMinutes\":60,\"minAge\":8,\"difficulty\":\"medium\",\"description\":\"Ops test product\",\"active\":%s}"
                .formatted(sku, name, STRATEGY_CATEGORY, basePrice, active);
    }

    private JsonNode register(String email) throws Exception {
        AuthDtos.RegisterRequest request = new AuthDtos.RegisterRequest("Admin", "Ops", "Admin Ops", email, null, PASSWORD, true, true);
        String content = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(content);
    }

    private String registerAndGetAccessToken(String email) throws Exception {
        return register(email).path("accessToken").asText();
    }

    /** Registers a fresh customer, buys one Wingspan for pickup at CENTRAL, and returns the order number. */
    private String placePickupOrder(String email) throws Exception {
        return placePickupOrderAs(registerAndGetAccessToken(email), email);
    }

    private String placePickupOrderAs(String customerToken, String contactEmail) throws Exception {
        mockMvc.perform(post("/api/cart/items").header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"productId\":\"" + WINGSPAN + "\",\"quantity\":1}"))
                .andExpect(status().isCreated());
        String checkoutBody = """
                {"contactFirstName":"Ops","contactLastName":"Test","contactEmail":"%s",
                 "fulfillmentMethodId":"%s","pickupBranchId":"%s","paymentMethodId":"%s"}
                """.formatted(contactEmail, pickupMethodId(), CENTRAL, paymentMethodId());
        MvcResult order = mockMvc.perform(post("/api/checkout").header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON).content(checkoutBody))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(order.getResponse().getContentAsString()).get("orderNumber").asText();
    }

    private String pickupMethodId() {
        return fulfillmentMethods.findByIsActiveTrueOrderByNameAsc().stream().filter(FulfillmentMethod::isStorePickup)
                .findFirst().orElseThrow().getId().toString();
    }

    private String paymentMethodId() {
        return paymentMethods.findByIsActiveTrueOrderByNameAsc().stream().findFirst().orElseThrow().getId().toString();
    }

    private String createAdminAndLogin(String email) throws Exception {
        return createUserWithRoleAndLogin(email, "admin", null);
    }

    private String createManagerAndLogin(String email, UUID branchId) throws Exception {
        return createUserWithRoleAndLogin(email, "manager", branchId);
    }

    private String createStaffAndLogin(String email, UUID branchId) throws Exception {
        return createUserWithRoleAndLogin(email, "staff", branchId);
    }

    private String createUserWithRoleAndLogin(String email, String roleCode, UUID branchId) throws Exception {
        OffsetDateTime now = OffsetDateTime.now();
        User user = new User();
        user.setFirstName("Admin"); user.setLastName("Ops"); user.setEmail(email);
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
