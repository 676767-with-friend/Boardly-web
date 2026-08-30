package com.boardly.auth;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {
    Optional<AuthSession> findByTokenHash(String tokenHash);

    @Query("select session from AuthSession session join fetch session.user where session.id = :id and session.revokedAt is null")
    Optional<AuthSession> findActiveByIdWithUser(UUID id);

    @Modifying
    @Query("update AuthSession session set session.revokedAt = :revokedAt where session.user.id = :userId and session.revokedAt is null")
    int revokeAllActiveByUserId(UUID userId, OffsetDateTime revokedAt);
}
