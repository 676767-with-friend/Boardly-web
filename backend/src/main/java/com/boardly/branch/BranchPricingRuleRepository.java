package com.boardly.branch;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BranchPricingRuleRepository extends JpaRepository<BranchPricingRule, UUID> {
    @Query("select rule from BranchPricingRule rule where rule.branch.id = :branchId and rule.effectiveFrom <= :at and (rule.effectiveTo is null or rule.effectiveTo > :at) order by rule.effectiveFrom desc")
    java.util.List<BranchPricingRule> findActive(UUID branchId, OffsetDateTime at);

    default Optional<BranchPricingRule> findActiveRule(UUID branchId, OffsetDateTime at) {
        return findActive(branchId, at).stream().findFirst();
    }
}
