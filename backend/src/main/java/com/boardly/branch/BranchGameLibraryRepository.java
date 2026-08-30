package com.boardly.branch;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BranchGameLibraryRepository extends JpaRepository<BranchGameLibrary, BranchGameLibraryId> {
    List<BranchGameLibrary> findByBranchIdAndAvailableTrue(UUID branchId);
}
