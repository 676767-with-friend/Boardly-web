package com.boardly.management;

import com.boardly.auth.AuthDtos;
import com.boardly.branch.BranchRepository;
import com.boardly.branch.TableZoneRepository;
import com.boardly.inventory.BranchProductInventoryId;
import com.boardly.inventory.BranchProductInventoryRepository;
import com.boardly.inventory.InventoryMovementRepository;
import com.boardly.product.Product;
import com.boardly.product.ProductRepository;
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
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ManagementApiTests {
    private static final UUID CENTRAL = UUID.fromString("50000000-0000-0000-0000-000000000001");
    private static final UUID SILOM = UUID.fromString("50000000-0000-0000-0000-000000000002");

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
    @Autowired TableZoneRepository zones;

    @Test
    void profileAndManagementAuthorizationAreDatabaseBacked() throws Exception {
        JsonNode customer = register("management-customer@example.test");
        String customerToken = customer.path("accessToken").asText();
        mockMvc.perform(get("/api/me/profile").header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value("management-customer@example.test"));
        mockMvc.perform(put("/api/me/profile").header("Authorization", bearer(customerToken)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"firstName\":\"Updated\",\"lastName\":\"Customer\",\"displayName\":\"Updated\",\"phone\":\"0812345678\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.firstName").value("Updated"));
        mockMvc.perform(get("/api/staff/dashboard").header("Authorization", bearer(customerToken))).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/dashboard").header("Authorization", bearer(customerToken))).andExpect(status().isForbidden());

        JsonNode staff = register("management-staff@example.test");
        grant(staff.path("user").path("id").asText(), "staff", CENTRAL);
        String staffToken = login("management-staff@example.test");
        mockMvc.perform(get("/api/staff/dashboard").header("Authorization", bearer(staffToken))).andExpect(status().isOk());
        mockMvc.perform(get("/api/staff/products").header("Authorization", bearer(staffToken)).param("branchId", SILOM.toString())).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/dashboard").header("Authorization", bearer(staffToken))).andExpect(status().isForbidden());

        JsonNode admin = register("management-admin@example.test");
        grant(admin.path("user").path("id").asText(), "admin", null);
        String adminToken = login("management-admin@example.test");
        mockMvc.perform(get("/api/admin/dashboard").header("Authorization", bearer(adminToken))).andExpect(status().isOk());
    }

    @Test
    void adminCreatesBranchScopedStaffWithBcryptPassword() throws Exception {
        JsonNode admin = register("management-create-admin@example.test");
        grant(admin.path("user").path("id").asText(), "admin", null);
        String adminToken = login("management-create-admin@example.test");
        String body = "{\"firstName\":\"Managed\",\"lastName\":\"Staff\",\"displayName\":\"Managed Staff\",\"email\":\"management-managed-staff@example.test\",\"phone\":\"0810000000\",\"password\":\"ManagedStaffPassword!\",\"branchIds\":[\"" + CENTRAL + "\"],\"primaryBranchId\":\"" + CENTRAL + "\"}";
        mockMvc.perform(post("/api/admin/staff").header("Authorization", bearer(adminToken)).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.branchNames[0]").value("Central Branch"));
        User staff = users.findByEmailIgnoreCase("management-managed-staff@example.test").orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(passwordEncoder.matches("ManagedStaffPassword!", staff.getPasswordHash()));
        org.junit.jupiter.api.Assertions.assertFalse(staff.getPasswordHash().contains("ManagedStaffPassword!"));
        org.junit.jupiter.api.Assertions.assertTrue(userRoles.findActiveRoleCodesByUserId(staff.getId()).contains("staff"));
        org.junit.jupiter.api.Assertions.assertTrue(assignments.existsByUserIdAndBranchId(staff.getId(), CENTRAL));

        String managerBody = "{\"firstName\":\"Managed\",\"lastName\":\"Manager\",\"displayName\":\"Managed Manager\",\"email\":\"management-managed-manager@example.test\",\"phone\":\"0810000001\",\"password\":\"ManagedManagerPassword!\",\"branchIds\":[\"" + CENTRAL + "\"],\"primaryBranchId\":\"" + CENTRAL + "\",\"role\":\"manager\"}";
        mockMvc.perform(post("/api/admin/staff").header("Authorization", bearer(adminToken)).contentType(MediaType.APPLICATION_JSON).content(managerBody))
                .andExpect(status().isOk()).andExpect(jsonPath("$.branchNames[0]").value("Central Branch"));
        User mgr = users.findByEmailIgnoreCase("management-managed-manager@example.test").orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(userRoles.findActiveRoleCodesByUserId(mgr.getId()).contains("manager"));
        org.junit.jupiter.api.Assertions.assertTrue(assignments.existsByUserIdAndBranchId(mgr.getId(), CENTRAL));
    }

    @Test
    void staffInventoryAndAdminPhysicalTablesRespectRoleAndBranchOwnership() throws Exception {
        JsonNode customer = register("management-ops-customer@example.test");
        String customerToken = customer.path("accessToken").asText();
        JsonNode staff = register("management-ops-staff@example.test");
        grant(staff.path("user").path("id").asText(), "staff", CENTRAL);
        String staffToken = login("management-ops-staff@example.test");
        JsonNode admin = register("management-ops-admin@example.test");
        grant(admin.path("user").path("id").asText(), "admin", null);
        String adminToken = login("management-ops-admin@example.test");

        mockMvc.perform(get("/api/staff/branches").header("Authorization", bearer(staffToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(CENTRAL.toString()))
                .andExpect(jsonPath("$.length()").value(1));
        long movementCount = movements.count();
        mockMvc.perform(patch("/api/staff/inventory/{productId}",
                        UUID.fromString("20000000-0000-0000-0000-000000000002"))
                        .header("Authorization", bearer(staffToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"branchId\":\"" + CENTRAL + "\",\"quantityDelta\":1}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.branchId").value(CENTRAL.toString()));
        org.junit.jupiter.api.Assertions.assertEquals(movementCount + 1, movements.count());
        mockMvc.perform(patch("/api/staff/inventory/{productId}",
                        UUID.fromString("20000000-0000-0000-0000-000000000003"))
                        .header("Authorization", bearer(staffToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"branchId\":\"" + SILOM + "\",\"quantityDelta\":1}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("BRANCH_ACCESS_DENIED"));
        mockMvc.perform(get("/api/admin/tables").header("Authorization", bearer(customerToken))
                        .param("branchId", CENTRAL.toString())).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/tables").header("Authorization", bearer(staffToken))
                        .param("branchId", CENTRAL.toString())).andExpect(status().isForbidden());

        UUID zoneId = zones.findByBranchIdOrderBySortOrderAscNameAsc(CENTRAL).getFirst().getId();
        String tableCode = "T" + UUID.randomUUID().toString().substring(0, 6);
        String tableBody = "{\"branchId\":\"%s\",\"code\":\"%s\",\"zoneId\":\"%s\",\"minPlayers\":2,\"maxPlayers\":6,\"operationalStatus\":\"available\",\"sortOrder\":90,\"active\":true,\"featureIds\":[]}".formatted(CENTRAL, tableCode, zoneId);
        String tableJson = mockMvc.perform(post("/api/admin/tables").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(tableBody))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(tableCode.toUpperCase()))
                .andReturn().getResponse().getContentAsString();
        String tableId = objectMapper.readTree(tableJson).path("id").asText();
        mockMvc.perform(put("/api/admin/tables/{id}", tableId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(tableBody.replace("\"maxPlayers\":6", "\"maxPlayers\":8")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.maxPlayers").value(8));
        mockMvc.perform(delete("/api/admin/tables/{id}", tableId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(false));

        Product unstocked = products.findAll().stream()
                .filter(product -> !inventory.existsById(new BranchProductInventoryId(CENTRAL, product.getId())))
                .findFirst().orElseThrow();
        String addInventory = "{\"branchId\":\"%s\",\"productId\":\"%s\",\"quantityOnHand\":4,\"lowStockThreshold\":2}".formatted(CENTRAL, unstocked.getId());
        mockMvc.perform(post("/api/admin/inventory").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(addInventory))
                .andExpect(status().isOk()).andExpect(jsonPath("$.quantityOnHand").value(4));
        mockMvc.perform(post("/api/admin/inventory").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(addInventory))
                .andExpect(status().isConflict());

        JsonNode manager = register("management-ops-manager@example.test");
        grant(manager.path("user").path("id").asText(), "manager", CENTRAL);
        String managerToken = login("management-ops-manager@example.test");

        mockMvc.perform(get("/api/admin/tables").header("Authorization", bearer(managerToken))
                        .param("branchId", CENTRAL.toString())).andExpect(status().isOk());
        mockMvc.perform(get("/api/admin/tables").header("Authorization", bearer(managerToken))
                        .param("branchId", SILOM.toString()))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("BRANCH_ACCESS_DENIED"));
        mockMvc.perform(get("/api/admin/dashboard").header("Authorization", bearer(managerToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/staff").header("Authorization", bearer(managerToken)))
                .andExpect(status().isForbidden());

        String mgrTableCode = "M" + UUID.randomUUID().toString().substring(0, 6);
        String mgrTableBody = "{\"branchId\":\"%s\",\"code\":\"%s\",\"zoneId\":\"%s\",\"minPlayers\":2,\"maxPlayers\":4,\"operationalStatus\":\"available\",\"sortOrder\":91,\"active\":true,\"featureIds\":[]}".formatted(CENTRAL, mgrTableCode, zoneId);
        String mgrTableJson = mockMvc.perform(post("/api/admin/tables").header("Authorization", bearer(managerToken))
                        .contentType(MediaType.APPLICATION_JSON).content(mgrTableBody))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(mgrTableCode.toUpperCase()))
                .andReturn().getResponse().getContentAsString();
        String mgrTableId = objectMapper.readTree(mgrTableJson).path("id").asText();
        mockMvc.perform(put("/api/admin/tables/{id}", mgrTableId).header("Authorization", bearer(managerToken))
                        .contentType(MediaType.APPLICATION_JSON).content(mgrTableBody.replace("\"maxPlayers\":4", "\"maxPlayers\":6")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.maxPlayers").value(6));
        mockMvc.perform(delete("/api/admin/tables/{id}", mgrTableId).header("Authorization", bearer(managerToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(false));

        UUID silomZoneId = zones.findByBranchIdOrderBySortOrderAscNameAsc(SILOM).getFirst().getId();
        String unassignedTableBody = "{\"branchId\":\"%s\",\"code\":\"%s\",\"zoneId\":\"%s\",\"minPlayers\":2,\"maxPlayers\":4,\"operationalStatus\":\"available\",\"sortOrder\":92,\"active\":true,\"featureIds\":[]}".formatted(SILOM, "SILOM_MGR", silomZoneId);
        mockMvc.perform(post("/api/admin/tables").header("Authorization", bearer(managerToken))
                        .contentType(MediaType.APPLICATION_JSON).content(unassignedTableBody))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("BRANCH_ACCESS_DENIED"));
    }

    private JsonNode register(String email) throws Exception {
        AuthDtos.RegisterRequest request = new AuthDtos.RegisterRequest("Management", "Test", "Management Test", email, null, "TestCustomerPassword!", true, true);
        String content = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(content);
    }

    private String login(String email) throws Exception {
        String content = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"TestCustomerPassword!\",\"rememberMe\":false}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(content).path("accessToken").asText();
    }

    private void grant(String userId, String roleCode, UUID branchId) {
        User user = users.findById(UUID.fromString(userId)).orElseThrow();
        Role role = roles.findByCodeAndIsActiveTrue(roleCode).orElseThrow();
        UserRole userRole = new UserRole(); userRole.setId(new UserRoleId(user.getId(), role.getId())); userRole.setUser(user); userRole.setRole(role); userRole.setAssignedAt(OffsetDateTime.now()); userRoles.save(userRole);
        if (branchId != null) { StaffBranchAssignment assignment = new StaffBranchAssignment(); assignment.setId(new StaffBranchAssignmentId(user.getId(), branchId)); assignment.setUser(user); assignment.setBranch(branches.findById(branchId).orElseThrow()); assignment.setAssignedAt(OffsetDateTime.now()); assignment.setPrimary(true); assignments.save(assignment); }
    }

    private String bearer(String token) { return "Bearer " + token; }
}
