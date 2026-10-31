package com.boardly.reservation;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface PlaySessionRepository extends JpaRepository<PlaySession, UUID> {
    long countByUserIdAndStatus(UUID userId, PlaySession.PlaySessionStatus status);
    long countByBranchIdAndStatus(UUID branchId, PlaySession.PlaySessionStatus status);
    boolean existsByTableIdAndStatus(UUID tableId, PlaySession.PlaySessionStatus status);
    Optional<PlaySession> findFirstByTableIdAndStatus(UUID tableId, PlaySession.PlaySessionStatus status);
    List<PlaySession> findByBranchIdAndStatus(UUID branchId, PlaySession.PlaySessionStatus status);
    boolean existsByTableId(UUID tableId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select session from PlaySession session where session.id = :id")
    Optional<PlaySession> findByIdForUpdate(UUID id);
}
