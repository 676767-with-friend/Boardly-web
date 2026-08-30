package com.boardly.branch;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BranchRuleRepository extends JpaRepository<BranchRule, UUID> {
    List<BranchRule> findByBranchIdOrderBySortOrderAsc(UUID branchId);
}
