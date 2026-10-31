package com.boardly.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class JwtServiceTests {
    private static final String SECRET = "boardly-unit-test-jwt-secret-at-least-32-bytes";

    @Test
    void issuedTokenRoundTripsItsUserAndSession() {
        JwtService service = service(900);
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();

        JwtService.JwtClaims claims = service.parse(service.issueAccessToken(userId, sessionId));

        assertEquals(userId, claims.userId());
        assertEquals(sessionId, claims.sessionId());
    }

    @Test
    void rejectsExpiredMalformedAndTamperedTokens() {
        JwtService expired = service(-1);
        String expiredToken = expired.issueAccessToken(UUID.randomUUID(), UUID.randomUUID());
        assertThrows(JwtService.InvalidJwtException.class, () -> expired.parse(expiredToken));

        JwtService service = service(900);
        assertThrows(JwtService.InvalidJwtException.class, () -> service.parse("not-a-jwt"));

        String token = service.issueAccessToken(UUID.randomUUID(), UUID.randomUUID());
        int signatureStart = token.lastIndexOf('.') + 1;
        char replacement = token.charAt(signatureStart) == 'A' ? 'B' : 'A';
        String tampered = token.substring(0, signatureStart) + replacement + token.substring(signatureStart + 1);
        assertNotEquals(token, tampered);
        assertThrows(JwtService.InvalidJwtException.class, () -> service.parse(tampered));
    }

    @Test
    void requiresASecretOfAtLeast32Bytes() {
        JwtService service = new JwtService(new ObjectMapper(), "too-short", 900);
        assertThrows(IllegalStateException.class, service::validateSecret);
    }

    private JwtService service(long expirySeconds) {
        JwtService service = new JwtService(new ObjectMapper(), SECRET, expirySeconds);
        service.validateSecret();
        return service;
    }
}
