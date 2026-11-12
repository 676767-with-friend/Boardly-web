package com.boardly.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

class JwtServiceEdgeCaseTests {
    private static final String SECRET = "boardly-unit-test-jwt-secret-at-least-32-bytes";
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final JwtService service = newService();

    @Test
    void acceptsAHandSignedTokenWithValidClaims() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();

        JwtService.JwtClaims claims = service.parse(signedToken(SECRET, validClaims(userId, sessionId)));

        assertEquals(userId, claims.userId());
        assertEquals(sessionId, claims.sessionId());
    }

    @Test
    void rejectsTokensMissingAnyRequiredClaim() throws Exception {
        for (String missing : new String[] {"sub", "sid", "exp"}) {
            Map<String, Object> claims = validClaims(UUID.randomUUID(), UUID.randomUUID());
            claims.remove(missing);
            assertInvalid(signedToken(SECRET, claims));
        }
    }

    @Test
    void rejectsClaimsOfTheWrongTypeOrFormat() throws Exception {
        Map<String, Object> notAUuid = validClaims(UUID.randomUUID(), UUID.randomUUID());
        notAUuid.put("sub", "not-a-uuid");
        assertInvalid(signedToken(SECRET, notAUuid));

        Map<String, Object> numericSubject = validClaims(UUID.randomUUID(), UUID.randomUUID());
        numericSubject.put("sub", 42);
        assertInvalid(signedToken(SECRET, numericSubject));

        Map<String, Object> stringExpiry = validClaims(UUID.randomUUID(), UUID.randomUUID());
        stringExpiry.put("exp", "tomorrow");
        assertInvalid(signedToken(SECRET, stringExpiry));
    }

    @Test
    void rejectsAnAlreadyExpiredHandSignedToken() throws Exception {
        Map<String, Object> claims = validClaims(UUID.randomUUID(), UUID.randomUUID());
        claims.put("exp", Instant.now().getEpochSecond() - 1);
        assertInvalid(signedToken(SECRET, claims));
    }

    @Test
    void rejectsWrongSegmentCountsAndUndecodableParts() throws Exception {
        String token = signedToken(SECRET, validClaims(UUID.randomUUID(), UUID.randomUUID()));

        assertInvalid("");
        assertInvalid("only.two");
        assertInvalid(token + ".extra");
        assertInvalid(token.substring(0, token.lastIndexOf('.') + 1) + "!!!not-base64!!!");
    }

    @Test
    void rejectsTokenSignedWithADifferentSecret() throws Exception {
        String forged = signedToken("another-secret-that-is-also-32-bytes-long!!", validClaims(UUID.randomUUID(), UUID.randomUUID()));
        assertInvalid(forged);
    }

    @Test
    void rejectsValidlySignedPayloadThatIsNotJson() throws Exception {
        String header = ENCODER.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = ENCODER.encodeToString("this is not json".getBytes(StandardCharsets.UTF_8));
        String unsigned = header + "." + payload;

        assertInvalid(unsigned + "." + ENCODER.encodeToString(hmac(SECRET, unsigned)));
    }

    @Test
    void rejectsNullToken() {
        assertThrows(JwtService.InvalidJwtException.class, () -> service.parse(null));
    }

    @Test
    void rejectsNullSecret() {
        JwtService noSecret = new JwtService(objectMapper, null, 900);
        assertThrows(IllegalStateException.class, noSecret::validateSecret);
    }

    private void assertInvalid(String token) {
        assertThrows(JwtService.InvalidJwtException.class, () -> service.parse(token));
    }

    private Map<String, Object> validClaims(UUID userId, UUID sessionId) {
        long now = Instant.now().getEpochSecond();
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", userId.toString());
        claims.put("sid", sessionId.toString());
        claims.put("iat", now);
        claims.put("exp", now + 900);
        return claims;
    }

    private String signedToken(String secret, Map<String, Object> claims) throws Exception {
        String header = ENCODER.encodeToString(objectMapper.writeValueAsBytes(Map.of("alg", "HS256", "typ", "JWT")));
        String payload = ENCODER.encodeToString(objectMapper.writeValueAsBytes(claims));
        String unsigned = header + "." + payload;
        return unsigned + "." + ENCODER.encodeToString(hmac(secret, unsigned));
    }

    private byte[] hmac(String secret, String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    }

    private JwtService newService() {
        JwtService jwtService = new JwtService(objectMapper, SECRET, 900);
        jwtService.validateSecret();
        return jwtService;
    }
}
