package com.boardly.branch;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BranchAmenityRepository extends JpaRepository<BranchAmenity, UUID> {
    List<BranchAmenity> findByBranchIdOrderBySortOrderAsc(UUID branchId);
}
