package com.boardly.reservation;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaySessionRepository extends JpaRepository<PlaySession, UUID> {
    long countByUserIdAndStatus(UUID userId, PlaySession.PlaySessionStatus status);
    long countByBranchIdAndStatus(UUID branchId, PlaySession.PlaySessionStatus status);
    boolean existsByTableIdAndStatus(UUID tableId, PlaySession.PlaySessionStatus status);
    Optional<PlaySession> findFirstByTableIdAndStatus(UUID tableId, PlaySession.PlaySessionStatus status);
    List<PlaySession> findByBranchIdAndStatus(UUID branchId, PlaySession.PlaySessionStatus status);
    boolean existsByTableId(UUID tableId);
}
