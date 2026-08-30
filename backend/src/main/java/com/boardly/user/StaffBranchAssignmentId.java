package com.boardly.user;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class StaffBranchAssignmentId implements Serializable {

    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "branch_id", columnDefinition = "uuid")
    private UUID branchId;

    public StaffBranchAssignmentId() {}

    public StaffBranchAssignmentId(UUID userId, UUID branchId) {
        this.userId = userId;
        this.branchId = branchId;
    }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getBranchId() { return branchId; }
    public void setBranchId(UUID branchId) { this.branchId = branchId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof StaffBranchAssignmentId)) return false;
        StaffBranchAssignmentId that = (StaffBranchAssignmentId) o;
        return Objects.equals(userId, that.userId) && Objects.equals(branchId, that.branchId);
    }

    @Override
    public int hashCode() { return Objects.hash(userId, branchId); }
}
