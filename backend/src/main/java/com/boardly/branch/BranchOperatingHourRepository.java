package com.boardly.branch;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BranchOperatingHourRepository extends JpaRepository<BranchOperatingHour, UUID> {
    List<BranchOperatingHour> findByBranchIdOrderByDayOfWeekAsc(UUID branchId);
}
