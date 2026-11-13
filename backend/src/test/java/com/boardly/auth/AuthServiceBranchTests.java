package com.boardly.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.boardly.auth.AuthDtos.AuthResponse;
import com.boardly.auth.AuthDtos.LoginRequest;
import com.boardly.auth.AuthDtos.LogoutRequest;
import com.boardly.auth.AuthDtos.RegisterRequest;
import com.boardly.auth.AuthDtos.ResetPasswordRequest;
import com.boardly.common.exception.BoardlyException;
import com.boardly.user.User;
import com.boardly.user.UserRepository;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/**
 * Calls AuthService directly to reach branches that HTTP-level tests cannot:
 * request-validation-protected consent combinations, session-id based logout,
 * and reset tokens that are expired, already used, or belong to a deleted user.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class AuthServiceBranchTests {
    private static final String PASSWORD = "BoardlyBranch!2026";

    @Autowired private AuthService authService;
    @Autowired private AuthSessionRepository authSessionRepository;
    @Autowired private PasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private TokenHasher tokenHasher;

    @Test
    void registrationRequiresBothConsentsEvenWhenCalledDirectly() {
        Boolean[][] combinations = {{true, false}, {false, true}, {null, true}, {true, null}, {false, false}};
        for (Boolean[] combo : combinations) {
            BoardlyException error = assertThrows(BoardlyException.class,
                    () -> authService.register(registerRequest(uniqueEmail("consent"), null, combo[0], combo[1])));
            assertEquals(400, error.getStatus());
            assertEquals("CONSENT_REQUIRED", error.getCode());
        }
    }

    @Test
    void displayNameIsTrimmedAndBlankBecomesNull() {
        assertNull(authService.register(registerRequest(uniqueEmail("dn-null"), null, true, true)).user().displayName());
        assertNull(authService.register(registerRequest(uniqueEmail("dn-blank"), "   ", true, true)).user().displayName());
        assertEquals("Nick", authService.register(registerRequest(uniqueEmail("dn-set"), "  Nick  ", true, true)).user().displayName());
    }

    @Test
    void logoutBySessionIdRevokesTheSessionOnceAndKeepsTheOriginalTimestamp() {
        AuthResponse registration = authService.register(registerRequest(uniqueEmail("logout-sid"), null, true, true));
        UUID sessionId = authSessionRepository.findByTokenHash(tokenHasher.hash(registration.refreshToken())).orElseThrow().getId();

        authService.logout(null, sessionId);
        OffsetDateTime firstRevocation = authSessionRepository.findById(sessionId).orElseThrow().getRevokedAt();
        assertNotNull(firstRevocation);

        // Already revoked: neither the session id nor the refresh token may overwrite the timestamp.
        authService.logout(new LogoutRequest(registration.refreshToken()), sessionId);
        assertEquals(firstRevocation, authSessionRepository.findById(sessionId).orElseThrow().getRevokedAt());
    }

    @Test
    void logoutWithNothingToRevokeIsANoOp() {
        authService.logout(null, null);
        authService.logout(new LogoutRequest(null), null);
        authService.logout(new LogoutRequest(""), UUID.randomUUID());
    }

    @Test
    void resetPasswordRejectsExpiredAndAlreadyUsedTokens() {
        User user = registerAndLoad(uniqueEmail("reset-bad"));
        OffsetDateTime now = OffsetDateTime.now();

        String expiredRaw = saveToken(user, now.minusHours(2), now.minusMinutes(1), null);
        assertInvalidResetToken(expiredRaw);

        String usedRaw = saveToken(user, now.minusMinutes(10), now.plusHours(1), now.minusMinutes(5));
        assertInvalidResetToken(usedRaw);
    }

    @Test
    void resetPasswordRejectsAValidTokenOfASoftDeletedUser() {
        User user = registerAndLoad(uniqueEmail("reset-deleted"));
        String raw = saveToken(user, OffsetDateTime.now().minusMinutes(1), OffsetDateTime.now().plusHours(1), null);
        user.setDeletedAt(OffsetDateTime.now());
        userRepository.saveAndFlush(user);

        assertInvalidResetToken(raw);
    }

    @Test
    void softDeletedUserCannotLogInOrBeLoaded() {
        String email = uniqueEmail("deleted");
        User user = registerAndLoad(email);
        user.setDeletedAt(OffsetDateTime.now());
        userRepository.saveAndFlush(user);

        BoardlyException error = assertThrows(BoardlyException.class,
                () -> authService.login(new LoginRequest(email, PASSWORD, false)));
        assertEquals("INVALID_CREDENTIALS", error.getCode());
        assertNull(authService.loadAuthUser(user.getId()));
    }

    private void assertInvalidResetToken(String rawToken) {
        BoardlyException error = assertThrows(BoardlyException.class,
                () -> authService.resetPassword(new ResetPasswordRequest(rawToken, "AnotherBoardly!2026")));
        assertEquals(400, error.getStatus());
        assertEquals("INVALID_RESET_TOKEN", error.getCode());
    }

    // The schema requires expires_at > created_at and used_at >= created_at.
    private String saveToken(User user, OffsetDateTime createdAt, OffsetDateTime expiresAt, OffsetDateTime usedAt) {
        String raw = tokenHasher.newRawToken();
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setTokenHash(tokenHasher.hash(raw));
        token.setExpiresAt(expiresAt);
        token.setUsedAt(usedAt);
        token.setCreatedAt(createdAt);
        passwordResetTokenRepository.saveAndFlush(token);
        return raw;
    }

    private User registerAndLoad(String email) {
        authService.register(registerRequest(email, null, true, true));
        return userRepository.findByEmailIgnoreCase(email).orElseThrow();
    }

    private RegisterRequest registerRequest(String email, String displayName, Boolean terms, Boolean privacy) {
        return new RegisterRequest("Branch", "Tester", displayName, email, null, PASSWORD, terms, privacy);
    }

    private String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@boardly.test";
    }
}
