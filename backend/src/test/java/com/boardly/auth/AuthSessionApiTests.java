package com.boardly.auth;

import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardly.common.exception.BoardlyException;
import com.boardly.user.Role;
import com.boardly.user.RoleRepository;
import com.boardly.user.User;
import com.boardly.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/**
 * Covers the refresh / logout / session paths of AuthService and AuthController
 * that AuthApiTests does not reach (successful refresh, expired or inactive
 * sessions, idempotent logout, permissions in the user payload, error handling).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class AuthSessionApiTests {
    private static final String PASSWORD = "BoardlySession!2026";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private AuthSessionRepository authSessionRepository;
    @Autowired private TokenHasher tokenHasher;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private AuthService authService;

    @Test
    void refreshRotatesTheSessionAndKeepsRememberMe() throws Exception {
        String email = uniqueEmail("refresh");
        register(email);
        JsonNode login = login(email, true);
        String oldRefresh = login.get("refreshToken").asText();

        JsonNode refreshed = refresh(oldRefresh);
        String newRefresh = refreshed.get("refreshToken").asText();
        String newAccess = refreshed.get("accessToken").asText();

        assertNotEquals(oldRefresh, newRefresh);
        assertEquals(email, refreshed.at("/user/email").asText());
        assertNotNull(authSessionRepository.findByTokenHash(tokenHasher.hash(oldRefresh)).orElseThrow().getRevokedAt());
        assertTrue(authSessionRepository.findByTokenHash(tokenHasher.hash(newRefresh)).orElseThrow().isRememberMe());

        mockMvc.perform(get("/api/me").header("Authorization", "Bearer " + newAccess))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));

        // A refresh token can only be used once.
        mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(refreshBody(oldRefresh)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void refreshRejectsExpiredSessions() throws Exception {
        String email = uniqueEmail("expired");
        register(email);
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow();

        String expiredToken = tokenHasher.newRawToken();
        OffsetDateTime createdAt = OffsetDateTime.now().minusHours(2);
        jdbcTemplate.update(
                "insert into auth_sessions (id, user_id, token_hash, remember_me, expires_at, created_at) values (?, ?, ?, ?, ?, ?)",
                UUID.randomUUID(), user.getId(), tokenHasher.hash(expiredToken), false, createdAt.plusHours(1), createdAt);

        mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(refreshBody(expiredToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void refreshAndLoginRejectInactiveUsers() throws Exception {
        String email = uniqueEmail("inactive-session");
        JsonNode registration = register(email);
        String refreshToken = registration.get("refreshToken").asText();

        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        user.setStatus(User.UserStatus.inactive);
        userRepository.saveAndFlush(user);

        mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(refreshBody(refreshToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody(email, false)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void logoutIsIdempotentAndIgnoresUnknownOrBlankRefreshTokens() throws Exception {
        String email = uniqueEmail("logout");
        String refreshToken = register(email).get("refreshToken").asText();

        mockMvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON).content(refreshBody(refreshToken)))
                .andExpect(status().isNoContent());
        AuthSession revoked = authSessionRepository.findByTokenHash(tokenHasher.hash(refreshToken)).orElseThrow();
        assertNotNull(revoked.getRevokedAt());

        // Logging out again, or with a token the server has never seen, still succeeds.
        mockMvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON).content(refreshBody(refreshToken)))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON).content(refreshBody("never-issued-token")))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON).content(refreshBody("   ")))
                .andExpect(status().isNoContent());
    }

    /**
     * KNOWN BUG: AuthController.logout passes AuthUser.id() (the USER id) to
     * AuthService.logout, which looks it up with authSessionRepository.findById(...)
     * (a SESSION id). They never match, so a logout that carries only the access
     * token does not revoke the session. Today it only works because the frontend
     * also sends the refresh token in the body. Enable this test once the session
     * id from the access token is passed to AuthService.logout.
     */
    @Test
    @Disabled("KNOWN BUG: logout with only an access token does not revoke the session (user id used as session id)")
    void logoutWithOnlyTheAccessTokenRevokesTheCurrentSession() throws Exception {
        String accessToken = register(uniqueEmail("access-only")).get("accessToken").asText();

        mockMvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + accessToken)
                        .content("{}"))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void requestValidationReturnsAStructuredError() throws Exception {
        mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(refreshBody("")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Refresh token is required"));
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\",\"password\":\"whatever-password\",\"rememberMe\":false}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(uniqueEmail("nobody"), false)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void currentUserLookupRejectsUnknownUsers() {
        UUID unknownId = UUID.randomUUID();

        BoardlyException error = assertThrows(BoardlyException.class, () -> authService.currentUser(unknownId));
        assertEquals(401, error.getStatus());
        assertEquals("UNAUTHENTICATED", error.getCode());
        assertNull(authService.loadAuthUser(unknownId));
    }

    @Test
    void currentUserExposesPermissionsGrantedThroughTheRole() throws Exception {
        JsonNode registration = register(uniqueEmail("permissions"));
        String accessToken = registration.get("accessToken").asText();

        UUID permissionId = UUID.randomUUID();
        Role customer = roleRepository.findByCodeAndIsActiveTrue("customer").orElseThrow();
        jdbcTemplate.update("insert into permissions (id, code, module, action, description) values (?, ?, ?, ?, ?)",
                permissionId, "session.test.permission", "session", "test", "Test only");
        jdbcTemplate.update("insert into role_permissions (role_id, permission_id) values (?, ?)",
                customer.getId(), permissionId);

        mockMvc.perform(get("/api/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.permissions", hasItem("session.test.permission")));
    }

    @Test
    void registrationFailsWithAServerErrorWhenTheCustomerRoleIsMissing() throws Exception {
        Role customer = roleRepository.findByCodeAndIsActiveTrue("customer").orElseThrow();
        customer.setActive(false);
        roleRepository.saveAndFlush(customer);

        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(uniqueEmail("no-role"))))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("REQUEST_FAILED"))
                .andExpect(jsonPath("$.message").value("Internal Server Error"));
    }

    private JsonNode register(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode login(String email, boolean rememberMe) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, rememberMe)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode refresh(String refreshToken) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content(refreshBody(refreshToken)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@boardly.test";
    }

    private String registerBody(String email) {
        return """
                {"firstName":"Session","lastName":"Tester","email":"%s","password":"%s","acceptTerms":true,"acceptPrivacy":true}
                """.formatted(email, PASSWORD);
    }

    private String loginBody(String email, boolean rememberMe) {
        return "{\"email\":\"%s\",\"password\":\"%s\",\"rememberMe\":%s}".formatted(email, PASSWORD, rememberMe);
    }

    private String refreshBody(String refreshToken) {
        return "{\"refreshToken\":\"" + refreshToken + "\"}";
    }
}
