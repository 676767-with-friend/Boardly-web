package com.boardly.user;

import java.util.UUID;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffBranchAssignmentRepository extends JpaRepository<StaffBranchAssignment, StaffBranchAssignmentId> {
    boolean existsByUserIdAndBranchId(UUID userId, UUID branchId);
    List<StaffBranchAssignment> findByUserIdOrderByIsPrimaryDescAssignedAtAsc(UUID userId);
    List<StaffBranchAssignment> findAllByOrderByAssignedAtDesc();

    @Modifying
    @Query("delete from StaffBranchAssignment assignment where assignment.user.id = :userId")
    void deleteAllByUserId(UUID userId);
}
