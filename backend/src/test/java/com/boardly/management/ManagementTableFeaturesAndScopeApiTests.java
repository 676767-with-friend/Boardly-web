package com.boardly.management;

import com.boardly.auth.AuthUser;
import com.boardly.branch.BranchRepository;
import com.boardly.branch.TableFeature;
import com.boardly.branch.TableFeatureRepository;
import com.boardly.branch.TableZoneRepository;
import com.boardly.common.exception.BoardlyException;
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
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * ManagementService coverage, part 2: table features (assign, replace, de-duplicate, clear, reject
 * inactive), normalisation of table code and status, what a branch manager may and may not do, and the
 * role/branch guards inside the service itself (called directly, because the security filter already
 * stops staff and customers before they reach those checks over HTTP).
 * Complements ManagementAdminApiTests; it does not change it.
 *
 * Needs the dev seed data (Central/Silom branches with at least one zone each). Every test is
 * @Transactional, so all data is rolled back after each case.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ManagementTableFeaturesAndScopeApiTests {
    private static final UUID CENTRAL = UUID.fromString("50000000-0000-0000-0000-000000000001");
    private static final UUID SILOM = UUID.fromString("50000000-0000-0000-0000-000000000002");
    private static final String PASSWORD = "ManagementTablePassword!2026";

    @Autowired MockMvc mockMvc;
    @Autowired EntityManager entityManager;
    @Autowired ObjectMapper objectMapper;
    @Autowired ManagementService service;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired UserRoleRepository userRoles;
    @Autowired StaffBranchAssignmentRepository assignments;
    @Autowired BranchRepository branches;
    @Autowired TableZoneRepository zones;
    @Autowired TableFeatureRepository features;
    @Autowired PasswordEncoder passwordEncoder;

    private record Account(UUID id, String email, String token) {}

    // ------------------------------------------------------------------ table features

    @Test
    void tableFeaturesAreAssignedReplacedDeduplicatedAndCleared() throws Exception {
        TableFeature a = feature("MgmtA", true);
        TableFeature b = feature("MgmtB", true);
        TableFeature c = feature("MgmtC", true);
        TableFeature off = feature("MgmtOff", false);
        Account admin = account("admin", null);

        // only active features are offered for selection
        JsonNode offered = body(getAs(admin.token(), "/api/admin/table-features").andExpect(status().isOk()));
        assertEquals(a.getName(), find(offered, "id", a.getId().toString()).path("name").asText());
        assertNotNull(find(offered, "id", c.getId().toString()));
        assertNull(find(offered, "id", off.getId().toString()));

        // create: a duplicated feature id is stored once
        String code = newTableCode();
        JsonNode created = body(postAs(admin.token(), "/api/admin/tables",
                tableBody(CENTRAL, code, centralZone(), 2, 6, "available", true, List.of(a.getId(), b.getId(), a.getId())))
                .andExpect(status().isOk()));
        settle();
        assertEquals(code.toUpperCase(), created.path("code").asText());
        assertEquals(2, created.path("featureIds").size());
        assertEquals(ids(a, b), texts(created.path("featureIds")));
        assertEquals(names(a, b), texts(created.path("featureNames")));
        String tableId = created.path("id").asText();
        String url = "/api/admin/tables/" + tableId;
        assertEquals(ids(a, b), listedFeatureIds(admin, tableId));

        // update replaces the whole set
        JsonNode replaced = body(putAs(admin.token(), url,
                tableBody(CENTRAL, code, centralZone(), 2, 6, "available", true, List.of(b.getId(), c.getId())))
                .andExpect(status().isOk()));
        settle();
        assertEquals(ids(b, c), texts(replaced.path("featureIds")));
        assertEquals(names(b, c), texts(replaced.path("featureNames")));
        assertEquals(ids(b, c), listedFeatureIds(admin, tableId));

        // an inactive feature is rejected and leaves the current features untouched
        postAs(admin.token(), "/api/admin/tables",
                tableBody(CENTRAL, newTableCode(), centralZone(), 2, 6, "available", true, List.of(off.getId())))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        putAs(admin.token(), url,
                tableBody(CENTRAL, code, centralZone(), 2, 6, "available", true, List.of(a.getId(), off.getId())))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        settle();
        assertEquals(ids(b, c), listedFeatureIds(admin, tableId));

        // an empty list clears every feature
        JsonNode cleared = body(putAs(admin.token(), url,
                tableBody(CENTRAL, code, centralZone(), 2, 6, "available", true, List.of()))
                .andExpect(status().isOk()));
        settle();
        assertEquals(0, cleared.path("featureIds").size());
        assertEquals(0, cleared.path("featureNames").size());
        assertEquals(Set.of(), listedFeatureIds(admin, tableId));
    }

    @Test
    void tableCodeAndOperationalStatusAreNormalised() throws Exception {
        Account admin = account("admin", null);
        JsonNode table = createTable(admin.token(), CENTRAL, centralZone());
        settle();
        String code = table.path("code").asText();
        assertEquals(code, code.toUpperCase());

        JsonNode updated = body(putAs(admin.token(), "/api/admin/tables/" + table.path("id").asText(),
                tableBody(CENTRAL, "  " + code.toLowerCase() + "  ", centralZone(), 2, 6, "  UNAVAILABLE ", true, List.of()))
                .andExpect(status().isOk()));
        assertEquals(code, updated.path("code").asText());
        assertEquals("unavailable", updated.path("operationalStatus").asText());
        assertTrue(updated.path("active").asBoolean());
        assertEquals("Central Branch", updated.path("branchName").asText());
        assertFalse(updated.path("zoneName").asText().isBlank());
    }

    // ------------------------------------------------------------------ branch scope

    @Test
    void managerCanManageTablesOnlyAtTheirOwnBranch() throws Exception {
        Account admin = account("admin", null);
        Account manager = account("manager", CENTRAL);
        JsonNode centralTable = createTable(admin.token(), CENTRAL, centralZone());
        JsonNode silomTable = createTable(admin.token(), SILOM, silomZone());
        settle();
        String centralId = centralTable.path("id").asText();
        String centralUrl = "/api/admin/tables/" + centralId;
        String centralCode = centralTable.path("code").asText();
        String silomUrl = "/api/admin/tables/" + silomTable.path("id").asText();
        String silomCode = silomTable.path("code").asText();

        // reading: own branch only, ordered by sort order
        JsonNode own = body(getAs(manager.token(), "/api/admin/tables?branchId=" + CENTRAL).andExpect(status().isOk()));
        assertNotNull(find(own, "id", centralId));
        int previous = Integer.MIN_VALUE;
        for (JsonNode item : own) {
            assertEquals(CENTRAL.toString(), item.path("branchId").asText());
            assertTrue(item.path("sortOrder").asInt() >= previous);
            previous = item.path("sortOrder").asInt();
        }
        getAs(manager.token(), "/api/admin/tables?branchId=" + SILOM)
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("BRANCH_ACCESS_DENIED"));

        // creating
        postAs(manager.token(), "/api/admin/tables",
                tableBody(CENTRAL, newTableCode(), centralZone(), 2, 6, "available", true, List.of()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.branchName").value("Central Branch"));
        postAs(manager.token(), "/api/admin/tables",
                tableBody(SILOM, newTableCode(), silomZone(), 2, 6, "available", true, List.of()))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("BRANCH_ACCESS_DENIED"));

        // updating, including trying to move a table into a branch they do not manage
        putAs(manager.token(), centralUrl, tableBody(CENTRAL, centralCode, centralZone(), 2, 4, "available", true, List.of()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.maxPlayers").value(4));
        putAs(manager.token(), silomUrl, tableBody(SILOM, silomCode, silomZone(), 2, 4, "available", true, List.of()))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("BRANCH_ACCESS_DENIED"));
        putAs(manager.token(), centralUrl, tableBody(SILOM, centralCode, silomZone(), 2, 4, "available", true, List.of()))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("BRANCH_ACCESS_DENIED"));

        // deactivating
        deleteAs(manager.token(), silomUrl)
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("BRANCH_ACCESS_DENIED"));
        deleteAs(manager.token(), centralUrl)
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(false))
                .andExpect(jsonPath("$.operationalStatus").value("unavailable"));
        settle();
        JsonNode afterwards = body(getAs(manager.token(), "/api/admin/tables?branchId=" + CENTRAL).andExpect(status().isOk()));
        assertFalse(find(afterwards, "id", centralId).path("active").asBoolean());

        // the other branch's table was never touched
        JsonNode silomTables = body(getAs(admin.token(), "/api/admin/tables?branchId=" + SILOM).andExpect(status().isOk()));
        assertTrue(find(silomTables, "id", silomTable.path("id").asText()).path("active").asBoolean());
    }

    // ------------------------------------------------------------------ guards inside the service

    @Test
    void serviceRejectsCallersWithoutManagerOrAdminRole() throws Exception {
        Account admin = account("admin", null);
        JsonNode table = createTable(admin.token(), CENTRAL, centralZone());
        settle();
        UUID tableId = UUID.fromString(table.path("id").asText());
        ManagementDtos.AdminTableRequest request = new ManagementDtos.AdminTableRequest(CENTRAL, newTableCode(),
                centralZone(), (short) 2, (short) 6, "available", 95, true, List.of());

        // no caller at all, a staff member, and a caller with no roles are all refused with the same code
        for (AuthUser caller : new AuthUser[] {null, principal("staff"), principal()}) {
            assertTableManagementRequired(() -> service.tableFeatures(caller));
            assertTableManagementRequired(() -> service.tableZones(caller, CENTRAL));
            assertTableManagementRequired(() -> service.tables(caller, CENTRAL));
            assertTableManagementRequired(() -> service.createTable(caller, request));
            assertTableManagementRequired(() -> service.updateTable(caller, tableId, request));
            assertTableManagementRequired(() -> service.deactivateTable(caller, tableId));
        }

        // a manager with no branch assignment is refused for the branch itself
        AuthUser unassigned = principal("manager");
        BoardlyException denied = assertThrows(BoardlyException.class, () -> service.tables(unassigned, CENTRAL));
        assertEquals("BRANCH_ACCESS_DENIED", denied.getCode());
        assertEquals(403, denied.getStatus());

        // an admin is never limited to a branch
        assertTrue(service.tables(principal("admin"), CENTRAL).stream().anyMatch(item -> item.id().equals(tableId)));
        assertFalse(service.tableZones(principal("admin"), SILOM).isEmpty());
    }

    // ------------------------------------------------------------------ helpers

    private void assertTableManagementRequired(Executable call) {
        BoardlyException error = assertThrows(BoardlyException.class, call);
        assertEquals("TABLE_MANAGEMENT_REQUIRED", error.getCode());
        assertEquals(403, error.getStatus());
    }

    private AuthUser principal(String... roleCodes) {
        return new AuthUser(UUID.randomUUID(), "direct-" + UUID.randomUUID() + "@example.test",
                List.of(roleCodes), List.of(), List.of());
    }

    private TableFeature feature(String prefix, boolean active) {
        TableFeature feature = new TableFeature();
        feature.setName(prefix + "-" + UUID.randomUUID().toString().substring(0, 8));
        feature.setActive(active);
        return features.saveAndFlush(feature);
    }

    private Set<String> ids(TableFeature... items) {
        Set<String> values = new HashSet<>();
        Arrays.stream(items).forEach(item -> values.add(item.getId().toString()));
        return values;
    }

    private Set<String> names(TableFeature... items) {
        Set<String> values = new HashSet<>();
        Arrays.stream(items).forEach(item -> values.add(item.getName()));
        return values;
    }

    private Set<String> listedFeatureIds(Account admin, String tableId) throws Exception {
        JsonNode listed = body(getAs(admin.token(), "/api/admin/tables?branchId=" + CENTRAL).andExpect(status().isOk()));
        JsonNode item = find(listed, "id", tableId);
        assertNotNull(item);
        return texts(item.path("featureIds"));
    }

    /** Real requests start with an empty persistence context, so flush and clear between calls. */
    private void settle() {
        entityManager.flush();
        entityManager.clear();
    }

    private JsonNode createTable(String token, UUID branchId, UUID zoneId) throws Exception {
        return body(postAs(token, "/api/admin/tables",
                tableBody(branchId, newTableCode(), zoneId, 2, 6, "available", true, List.of()))
                .andExpect(status().isOk()));
    }

    private String tableBody(UUID branchId, String code, UUID zoneId, int minPlayers, int maxPlayers,
                             String operationalStatus, boolean active, List<UUID> featureIds) throws Exception {
        return json("branchId", branchId, "code", code, "zoneId", zoneId, "minPlayers", minPlayers,
                "maxPlayers", maxPlayers, "operationalStatus", operationalStatus, "sortOrder", 95,
                "active", active, "featureIds", featureIds);
    }

    private String newTableCode() {
        return "T" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }

    private UUID centralZone() {
        return zones.findByBranchIdOrderBySortOrderAscNameAsc(CENTRAL).getFirst().getId();
    }

    private UUID silomZone() {
        return zones.findByBranchIdOrderBySortOrderAscNameAsc(SILOM).getFirst().getId();
    }

    private Account account(String roleCode, UUID branchId) throws Exception {
        OffsetDateTime now = OffsetDateTime.now();
        User user = new User();
        user.setFirstName("Mgmt");
        user.setLastName(roleCode);
        user.setDisplayName("Mgmt " + roleCode);
        user.setEmail("mgmt-table-test-" + roleCode + "-" + UUID.randomUUID() + "@example.test");
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
        settle();
        return new Account(user.getId(), user.getEmail(), objectMapper.readTree(content).path("accessToken").asText());
    }

    private ResultActions getAs(String token, String url) throws Exception {
        return send(get(url), token);
    }

    private ResultActions postAs(String token, String url, String content) throws Exception {
        return send(post(url).contentType(MediaType.APPLICATION_JSON).content(content), token);
    }

    private ResultActions putAs(String token, String url, String content) throws Exception {
        return send(put(url).contentType(MediaType.APPLICATION_JSON).content(content), token);
    }

    private ResultActions deleteAs(String token, String url) throws Exception {
        return send(delete(url), token);
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

    private Set<String> texts(JsonNode array) {
        Set<String> values = new HashSet<>();
        array.forEach(node -> values.add(node.asText()));
        return values;
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
