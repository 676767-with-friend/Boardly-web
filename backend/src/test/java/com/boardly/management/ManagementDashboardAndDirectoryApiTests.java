package com.boardly.management;

import com.boardly.branch.BranchRepository;
import com.boardly.order.FulfillmentMethod;
import com.boardly.order.FulfillmentMethodRepository;
import com.boardly.order.Order;
import com.boardly.order.OrderRepository;
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
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * ManagementService coverage, part 1: staff/admin dashboards (the "today" filter), the order-to-response
 * mapping (including an order with no pickup branch), and the user-directory search rules.
 * Complements ManagementApiTests and ManagementAdminApiTests; it does not change them.
 *
 * Needs the dev seed data (Central/Silom branches, Wingspan product). Every test is @Transactional,
 * so all data is rolled back after each case.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ManagementDashboardAndDirectoryApiTests {
    private static final UUID CENTRAL = UUID.fromString("50000000-0000-0000-0000-000000000001");
    private static final UUID SILOM = UUID.fromString("50000000-0000-0000-0000-000000000002");
    private static final UUID WINGSPAN = UUID.fromString("20000000-0000-0000-0000-000000000001");
    private static final String PASSWORD = "ManagementDashboardPassword!2026";

    @Autowired MockMvc mockMvc;
    @Autowired EntityManager entityManager;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired UserRoleRepository userRoles;
    @Autowired StaffBranchAssignmentRepository assignments;
    @Autowired BranchRepository branches;
    @Autowired FulfillmentMethodRepository fulfillmentMethods;
    @Autowired PaymentMethodRepository paymentMethods;
    @Autowired OrderRepository orders;
    @Autowired PasswordEncoder passwordEncoder;

    private record Account(UUID id, String email, String token) {}

    // ------------------------------------------------------------------ dashboards and order mapping

    @Test
    void dashboardsCountOnlyTodaysSalesAndEveryOrder() throws Exception {
        Account admin = account("admin", null);
        Account centralStaff = account("staff", CENTRAL);
        Account silomStaff = account("staff", SILOM);
        Account buyer = account("customer", null);

        JsonNode centralBefore = dashboard(centralStaff, "/api/staff/dashboard");
        JsonNode silomBefore = dashboard(silomStaff, "/api/staff/dashboard");
        JsonNode adminBefore = dashboard(admin, "/api/admin/dashboard");
        assertEquals("Central Branch", centralBefore.path("branchName").asText());
        assertEquals("Silom Branch", silomBefore.path("branchName").asText());
        assertEquals("All branches", adminBefore.path("branchName").asText());

        String orderNumber = placePickupOrder(buyer, CENTRAL);
        JsonNode order = find(body(getAs(centralStaff.token(), "/api/staff/orders").andExpect(status().isOk())),
                "orderNumber", orderNumber);
        assertNotNull(order);
        BigDecimal total = order.path("totalAmount").decimalValue();
        assertTrue(total.signum() > 0);
        assertEquals("Management Test", order.path("customerName").asText());
        assertEquals(1, order.path("itemCount").asInt());
        assertEquals("Central Branch", order.path("pickupBranchName").asText());
        assertFalse(order.path("fulfillmentMethod").asText().isBlank());
        assertFalse(order.path("status").asText().isBlank());
        assertFalse(order.path("currency").asText().isBlank());
        assertFalse(order.path("placedAt").isNull());

        // An order placed now counts as today's sales for its pickup branch and for the admin view only.
        JsonNode centralAfter = dashboard(centralStaff, "/api/staff/dashboard");
        assertEquals(centralBefore.path("orders").asLong() + 1, centralAfter.path("orders").asLong());
        assertSales(centralBefore.path("salesToday").decimalValue().add(total), centralAfter);
        JsonNode silomAfter = dashboard(silomStaff, "/api/staff/dashboard");
        assertEquals(silomBefore.path("orders").asLong(), silomAfter.path("orders").asLong());
        assertSales(silomBefore.path("salesToday").decimalValue(), silomAfter);
        JsonNode adminAfter = dashboard(admin, "/api/admin/dashboard");
        assertEquals(adminBefore.path("orders").asLong() + 1, adminAfter.path("orders").asLong());
        assertSales(adminBefore.path("salesToday").decimalValue().add(total), adminAfter);

        // Move the order to an earlier day: it is still an order, but no longer today's sales.
        Order stored = orders.findByOrderNumberAndUserId(orderNumber, buyer.id()).orElseThrow();
        stored.setPlacedAt(OffsetDateTime.now().minusDays(2));
        orders.saveAndFlush(stored);
        entityManager.clear();

        JsonNode centralOld = dashboard(centralStaff, "/api/staff/dashboard");
        assertEquals(centralBefore.path("orders").asLong() + 1, centralOld.path("orders").asLong());
        assertSales(centralBefore.path("salesToday").decimalValue(), centralOld);
        JsonNode adminOld = dashboard(admin, "/api/admin/dashboard");
        assertEquals(adminBefore.path("orders").asLong() + 1, adminOld.path("orders").asLong());
        assertSales(adminBefore.path("salesToday").decimalValue(), adminOld);
    }

    @Test
    void dashboardsReportTableCountsAndBranchTotalsConsistently() throws Exception {
        Account admin = account("admin", null);
        Account centralStaff = account("staff", CENTRAL);

        JsonNode staffView = dashboard(centralStaff, "/api/staff/dashboard");
        assertTrue(staffView.path("totalTables").asLong() >= 0);
        assertEquals(Math.max(0, staffView.path("totalTables").asLong()
                        - staffView.path("unavailableTables").asLong() - staffView.path("activeSessions").asLong()),
                staffView.path("availableTables").asLong());
        assertEquals(0, staffView.path("activeBranches").asLong());
        assertEquals(0, staffView.path("activeStaff").asLong());

        JsonNode adminView = dashboard(admin, "/api/admin/dashboard");
        assertTrue(adminView.path("activeBranches").asLong() >= 2);
        assertTrue(adminView.path("activeStaff").asLong() >= 1);
        assertTrue(adminView.path("totalTables").asLong() >= staffView.path("totalTables").asLong());
        assertTrue(adminView.path("availableTables").asLong() <= adminView.path("totalTables").asLong());
        assertTrue(adminView.path("unavailableTables").asLong() >= 0);
    }

    @Test
    void adminOrderListShowsOrdersThatHaveNoPickupBranch() throws Exception {
        Account admin = account("admin", null);
        Account buyer = account("customer", null);
        String orderNumber = placePickupOrder(buyer, CENTRAL);

        Order stored = orders.findByOrderNumberAndUserId(orderNumber, buyer.id()).orElseThrow();
        stored.setPickupBranch(null);
        orders.saveAndFlush(stored);
        entityManager.clear();

        JsonNode order = find(body(getAs(admin.token(), "/api/admin/orders").andExpect(status().isOk())),
                "orderNumber", orderNumber);
        assertNotNull(order);
        assertTrue(order.path("pickupBranchName").isNull());
        assertEquals(1, order.path("itemCount").asInt());
    }

    // ------------------------------------------------------------------ user directory search

    @Test
    void userSearchMatchesNameEmailAndPhoneIgnoringCase() throws Exception {
        Account admin = account("admin", null);
        Account customer = account("customer", null);
        Account staff = account("staff", CENTRAL);

        String marker = UUID.randomUUID().toString().substring(0, 8);
        String phone = "0877" + marker.replaceAll("[^0-9]", "").concat("0000000").substring(0, 6);
        User user = users.findById(customer.id()).orElseThrow();
        user.setDisplayName("Zed-" + marker);
        user.setPhone(phone);
        users.saveAndFlush(user);
        entityManager.clear();

        // display name, e-mail and phone all match; the case of the search text does not matter
        assertEquals(customer.id().toString(), only(searchAdmin(admin, "zed-" + marker.toUpperCase())).path("id").asText());
        assertEquals(customer.id().toString(), only(searchAdmin(admin, customer.email().toUpperCase())).path("id").asText());
        JsonNode byPhone = searchAdmin(admin, phone);
        assertNotNull(find(byPhone, "id", customer.id().toString()));
        // surrounding spaces are ignored
        assertEquals(1, searchAdmin(admin, "  zed-" + marker + "  ").size());
        // the staff directory applies the same matching to active customers
        assertEquals(1, body(getAs(staff.token(), "/api/staff/users?search=Zed-" + marker)
                .andExpect(status().isOk())).size());

        // a blank or missing search returns the whole directory, including this user
        JsonNode everyone = body(getAs(admin.token(), "/api/admin/users").andExpect(status().isOk()));
        assertNotNull(find(everyone, "id", customer.id().toString()));
        JsonNode blank = searchAdmin(admin, "  ");
        assertEquals(everyone.size(), blank.size());

        // a search that matches nothing returns an empty list
        assertEquals(0, searchAdmin(admin, "no-such-user-" + marker).size());
    }

    @Test
    void userSearchFallsBackToFirstAndLastNameWhenDisplayNameIsBlank() throws Exception {
        Account admin = account("admin", null);
        Account customer = account("customer", null);

        String marker = UUID.randomUUID().toString().substring(0, 8);
        User user = users.findById(customer.id()).orElseThrow();
        user.setFirstName("First" + marker);
        user.setLastName("Last" + marker);
        user.setDisplayName("   ");
        user.setPhone(null);
        users.saveAndFlush(user);
        entityManager.clear();

        JsonNode found = only(searchAdmin(admin, "first" + marker + " last" + marker));
        assertEquals("First" + marker + " Last" + marker, found.path("name").asText());
        assertEquals(customer.email(), found.path("email").asText());
        assertTrue(found.path("phone").isNull());
        assertEquals("active", found.path("status").asText());
        assertEquals(0, found.path("orderCount").asLong());
        assertEquals(0, found.path("reservationCount").asLong());
        assertEquals(0, found.path("completedVisits").asLong());
        assertFalse(found.path("lastActivity").isNull());

        // a null display name behaves the same way
        user = users.findById(customer.id()).orElseThrow();
        user.setDisplayName(null);
        users.saveAndFlush(user);
        entityManager.clear();
        assertEquals("First" + marker + " Last" + marker,
                only(searchAdmin(admin, "last" + marker)).path("name").asText());
        // a user with no phone never matches a phone search
        assertNull(find(searchAdmin(admin, "0000000000000"), "id", customer.id().toString()));
    }

    // ------------------------------------------------------------------ helpers

    private JsonNode dashboard(Account account, String url) throws Exception {
        return body(getAs(account.token(), url).andExpect(status().isOk()));
    }

    private void assertSales(BigDecimal expected, JsonNode dashboard) {
        assertEquals(0, expected.compareTo(dashboard.path("salesToday").decimalValue()),
                "salesToday expected " + expected + " but was " + dashboard.path("salesToday"));
    }

    private JsonNode searchAdmin(Account admin, String search) throws Exception {
        // .param() lets MockMvc encode the text once; hand-encoding spaces would be encoded a second time
        return body(send(get("/api/admin/users").param("search", search), admin.token())
                .andExpect(status().isOk()));
    }

    private JsonNode only(JsonNode array) {
        assertEquals(1, array.size(), "expected exactly one match but got " + array);
        return array.get(0);
    }

    private String placePickupOrder(Account buyer, UUID branchId) throws Exception {
        postAs(buyer.token(), "/api/cart/items", json("productId", WINGSPAN, "quantity", 1))
                .andExpect(status().isCreated());
        UUID pickupMethodId = fulfillmentMethods.findByIsActiveTrueOrderByNameAsc().stream()
                .filter(FulfillmentMethod::isStorePickup).findFirst().orElseThrow().getId();
        UUID paymentMethodId = paymentMethods.findByIsActiveTrueOrderByNameAsc().getFirst().getId();
        return body(postAs(buyer.token(), "/api/checkout",
                json("contactFirstName", "Management", "contactLastName", "Test",
                        "contactEmail", buyer.email(), "fulfillmentMethodId", pickupMethodId,
                        "pickupBranchId", branchId, "paymentMethodId", paymentMethodId))
                .andExpect(status().isOk())).path("orderNumber").asText();
    }

    private Account account(String roleCode, UUID branchId) throws Exception {
        OffsetDateTime now = OffsetDateTime.now();
        User user = new User();
        user.setFirstName("Mgmt");
        user.setLastName(roleCode);
        user.setDisplayName("Mgmt " + roleCode);
        user.setEmail("mgmt-dash-test-" + roleCode + "-" + UUID.randomUUID() + "@example.test");
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setStatus(User.UserStatus.active);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        user = users.save(user);

        Role role = roles.findByCodeAndIsActiveTrue(roleCode).orElseThrow();
        UserRole userRole = new UserRole();
        userRole.setId(new UserRoleId(user.getId(), role.getId()));
        userRole.setUser(user);
        userRole.setRole(role);
        userRole.setAssignedAt(now);
        userRoles.save(userRole);

        if (branchId != null) {
            StaffBranchAssignment assignment = new StaffBranchAssignment();
            assignment.setId(new StaffBranchAssignmentId(user.getId(), branchId));
            assignment.setUser(user);
            assignment.setBranch(branches.findById(branchId).orElseThrow());
            assignment.setAssignedAt(now);
            assignment.setPrimary(true);
            assignments.save(assignment);
        }

        entityManager.flush();
        String content = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", user.getEmail(), "password", PASSWORD, "rememberMe", false)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        // Real requests start with an empty persistence context; clear it so cached rows do not hide behaviour.
        entityManager.flush();
        entityManager.clear();
        return new Account(user.getId(), user.getEmail(), objectMapper.readTree(content).path("accessToken").asText());
    }

    private ResultActions getAs(String token, String url) throws Exception {
        return send(get(url), token);
    }

    private ResultActions postAs(String token, String url, String content) throws Exception {
        return send(post(url).contentType(MediaType.APPLICATION_JSON).content(content), token);
    }

    private ResultActions send(MockHttpServletRequestBuilder builder, String token) throws Exception {
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return mockMvc.perform(builder);
    }

    private JsonNode body(ResultActions actions) throws Exception {
        return objectMapper.readTree(actions.andReturn().getResponse().getContentAsString());
    }

    private String json(Object... keyValues) throws Exception {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return objectMapper.writeValueAsString(map);
    }

    private JsonNode find(JsonNode array, String field, String value) {
        for (JsonNode node : array) {
            if (value.equals(node.path(field).asText())) {
                return node;
            }
        }
        return null;
    }
}
