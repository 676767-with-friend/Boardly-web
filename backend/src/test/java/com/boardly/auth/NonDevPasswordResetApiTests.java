package com.boardly.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "boardly.auth.dev-reset-token-exposure=true")
@AutoConfigureMockMvc
@ActiveProfiles("production")
@Transactional
class NonDevPasswordResetApiTests {
    @Autowired private MockMvc mockMvc;

    @Test
    void neverExposesResetTokensOutsideTheDevProfile() throws Exception {
        String email = "non-dev-" + UUID.randomUUID() + "@boardly.test";
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Non","lastName":"Dev","email":"%s","password":"BoardlyOriginal!2026","acceptTerms":true,"acceptPrivacy":true}
                                """.formatted(email)))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.devResetUrl").doesNotExist());
    }
}
