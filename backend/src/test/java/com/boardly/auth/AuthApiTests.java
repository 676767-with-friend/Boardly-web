package com.boardly.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardly.user.Role;
import com.boardly.user.RoleRepository;
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
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Import(AuthApiTests.AuthorizationProbeController.class)
@Transactional
class AuthApiTests {
    private static final String ORIGINAL_PASSWORD = "BoardlyOriginal!2026";
    private static final String RESET_PASSWORD = "BoardlyReset!2026";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRoleRepository userRoleRepository;
    @Autowired private PasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired private TokenHasher tokenHasher;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbcTemplate;

    @Test
    void registrationCreatesOnlyACustomerWithBcryptPasswordAndRejectsDuplicates() throws Exception {
        String email = uniqueEmail("register");
        JsonNode registration = register(email, ORIGINAL_PASSWORD);

        User storedUser = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(storedUser.getPasswordHash().startsWith("$2"));
        org.junit.jupiter.api.Assertions.assertNotEquals(ORIGINAL_PASSWORD, storedUser.getPasswordHash());
        org.junit.jupiter.api.Assertions.assertTrue(passwordEncoder.matches(ORIGINAL_PASSWORD, storedUser.getPasswordHash()));
        org.junit.jupiter.api.Assertions.assertEquals("customer", registration.at("/user/roles/0").asText());

        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email, ORIGINAL_PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_REGISTERED"));
    }

    @Test
    void loginMeLogoutAndRoleAuthorizationUsePersistedRoles() throws Exception {
        String customerEmail = uniqueEmail("customer");
        JsonNode customerRegistration = register(customerEmail, ORIGINAL_PASSWORD);
        String customerAccess = customerRegistration.get("accessToken").asText();
        String customerRefresh = customerRegistration.get("refreshToken").asText();

        mockMvc.perform(get("/api/me").header("Authorization", "Bearer " + customerAccess))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(customerEmail));
        mockMvc.perform(get("/api/staff/authz-probe").header("Authorization", "Bearer " + customerAccess))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/authz-probe").header("Authorization", "Bearer " + customerAccess))
                .andExpect(status().isForbidden());

        JsonNode staffLogin = login(createRoleUser("staff"), ORIGINAL_PASSWORD);
        mockMvc.perform(get("/api/staff/authz-probe").header("Authorization", "Bearer " + staffLogin.get("accessToken").asText()))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/admin/authz-probe").header("Authorization", "Bearer " + staffLogin.get("accessToken").asText()))
                .andExpect(status().isForbidden());

        JsonNode adminLogin = login(createRoleUser("admin"), ORIGINAL_PASSWORD);
        mockMvc.perform(get("/api/admin/authz-probe").header("Authorization", "Bearer " + adminLogin.get("accessToken").asText()))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + customerAccess)
                        .content("{\"refreshToken\":\"" + customerRefresh + "\"}"))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/me").header("Authorization", "Bearer " + customerAccess))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + customerRefresh + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void passwordResetIsDevDeliverableSingleUseAndRevokesExistingSessions() throws Exception {
        String email = uniqueEmail("reset");
        JsonNode registration = register(email, ORIGINAL_PASSWORD);
        String oldAccessToken = registration.get("accessToken").asText();

        MvcResult forgotResult = mockMvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.devResetUrl").isNotEmpty())
                .andReturn();
        String resetUrl = objectMapper.readTree(forgotResult.getResponse().getContentAsString()).get("devResetUrl").asText();
        String resetToken = resetUrl.substring(resetUrl.indexOf("token=") + "token=".length());

        mockMvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + resetToken + "\",\"newPassword\":\"" + RESET_PASSWORD + "\"}"))
                .andExpect(status().isOk());
        User updatedUser = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(updatedUser.getPasswordHash().startsWith("$2"));
        org.junit.jupiter.api.Assertions.assertTrue(passwordEncoder.matches(RESET_PASSWORD, updatedUser.getPasswordHash()));

        mockMvc.perform(get("/api/me").header("Authorization", "Bearer " + oldAccessToken))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, ORIGINAL_PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, RESET_PASSWORD)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + resetToken + "\",\"newPassword\":\"" + ORIGINAL_PASSWORD + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_RESET_TOKEN"));
        mockMvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"not-a-real-token\",\"newPassword\":\"" + ORIGINAL_PASSWORD + "\"}"))
                .andExpect(status().isBadRequest());

        String expiredToken = tokenHasher.newRawToken();
        OffsetDateTime createdAt = OffsetDateTime.now().minusHours(2);
        jdbcTemplate.update("insert into password_reset_tokens (id, user_id, token_hash, expires_at, created_at) values (?, ?, ?, ?, ?)",
                UUID.randomUUID(), updatedUser.getId(), tokenHasher.hash(expiredToken), createdAt.plusHours(1), createdAt);
        mockMvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + expiredToken + "\",\"newPassword\":\"" + ORIGINAL_PASSWORD + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_RESET_TOKEN"));
    }

    @Test
    void invalidPasswordIsRejected() throws Exception {
        String email = createRoleUser("customer");
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, "not-the-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    private JsonNode register(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email, password)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, password)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String requestResetToken(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String resetUrl = objectMapper.readTree(result.getResponse().getContentAsString()).get("devResetUrl").asText();
        return resetUrl.substring(resetUrl.indexOf("token=") + "token=".length());
    }

    private String createRoleUser(String roleCode) {
        String email = uniqueEmail(roleCode);
        OffsetDateTime now = OffsetDateTime.now();
        User user = new User();
        user.setFirstName("Phase");
        user.setLastName("Four");
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(ORIGINAL_PASSWORD));
        user.setStatus(User.UserStatus.active);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        user = userRepository.save(user);
        Role role = roleRepository.findByCodeAndIsActiveTrue(roleCode).orElseThrow();
        UserRole userRole = new UserRole();
        userRole.setId(new UserRoleId(user.getId(), role.getId()));
        userRole.setUser(user);
        userRole.setRole(role);
        userRole.setAssignedAt(now);
        userRoleRepository.save(userRole);
        return email;
    }

    private String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@boardly.test";
    }

    private String registerBody(String email, String password) {
        return """
                {"firstName":"Phase","lastName":"Four","email":"%s","password":"%s","acceptTerms":true,"acceptPrivacy":true}
                """.formatted(email, password);
    }

    private String loginBody(String email, String password) {
        return "{\"email\":\"%s\",\"password\":\"%s\",\"rememberMe\":false}".formatted(email, password);
    }

    @TestConfiguration
    @RestController
    static class AuthorizationProbeController {
        @GetMapping("/api/staff/authz-probe")
        String staffProbe() { return "staff"; }

        @GetMapping("/api/admin/authz-probe")
        String adminProbe() { return "admin"; }
    }
}
