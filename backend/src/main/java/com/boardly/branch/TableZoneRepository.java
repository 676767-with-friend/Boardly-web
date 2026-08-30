package com.boardly.branch;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TableZoneRepository extends JpaRepository<TableZone, UUID> {
    List<TableZone> findByBranchIdOrderBySortOrderAscNameAsc(UUID branchId);
    Optional<TableZone> findByIdAndBranchId(UUID id, UUID branchId);
}
