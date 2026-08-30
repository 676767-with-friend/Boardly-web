package com.boardly.auth;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final ObjectMapper objectMapper;
    private final String secret;
    private final long accessExpirySeconds;
    private byte[] secretBytes;

    public JwtService(
            ObjectMapper objectMapper,
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-expiry-seconds}") long accessExpirySeconds) {
        this.objectMapper = objectMapper;
        this.secret = secret;
        this.accessExpirySeconds = accessExpirySeconds;
    }

    @PostConstruct
    void validateSecret() {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET must be set to at least 32 bytes");
        }
        secretBytes = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String issueAccessToken(UUID userId, UUID sessionId) {
        Instant now = Instant.now();
        Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
        Map<String, Object> payload = Map.of(
                "sub", userId.toString(),
                "sid", sessionId.toString(),
                "iat", now.getEpochSecond(),
                "exp", now.plusSeconds(accessExpirySeconds).getEpochSecond());
        try {
            String encodedHeader = ENCODER.encodeToString(objectMapper.writeValueAsBytes(header));
            String encodedPayload = ENCODER.encodeToString(objectMapper.writeValueAsBytes(payload));
            String unsignedToken = encodedHeader + "." + encodedPayload;
            return unsignedToken + "." + ENCODER.encodeToString(sign(unsignedToken));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to issue access token", ex);
        }
    }

    public JwtClaims parse(String token) {
        try {
            String[] parts = token.split("\\.", -1);
            if (parts.length != 3) {
                throw new InvalidJwtException();
            }
            String unsignedToken = parts[0] + "." + parts[1];
            if (!MessageDigest.isEqual(sign(unsignedToken), DECODER.decode(parts[2]))) {
                throw new InvalidJwtException();
            }
            Map<String, Object> claims = objectMapper.readValue(DECODER.decode(parts[1]), new TypeReference<>() {});
            String subject = (String) claims.get("sub");
            String sessionId = (String) claims.get("sid");
            Number expiry = (Number) claims.get("exp");
            if (subject == null || sessionId == null || expiry == null || Instant.now().getEpochSecond() >= expiry.longValue()) {
                throw new InvalidJwtException();
            }
            return new JwtClaims(UUID.fromString(subject), UUID.fromString(sessionId));
        } catch (InvalidJwtException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new InvalidJwtException();
        }
    }

    private byte[] sign(String value) throws GeneralSecurityException {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secretBytes, "HmacSHA256"));
        return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    }

    public record JwtClaims(UUID userId, UUID sessionId) {}

    public static class InvalidJwtException extends RuntimeException {
    }
}
