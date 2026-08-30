package com.boardly.user;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.boardly.branch.Branch;

@Entity
@Table(name = "staff_branch_assignments")
public class StaffBranchAssignment {

    @EmbeddedId
    private StaffBranchAssignmentId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("branchId")
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @Column(name = "assigned_at", nullable = false)
    private OffsetDateTime assignedAt;

    @Column(name = "assigned_by", columnDefinition = "uuid")
    private UUID assignedBy;

    @Column(name = "is_primary", nullable = false)
    private boolean isPrimary = false;

    public StaffBranchAssignmentId getId() { return id; }
    public void setId(StaffBranchAssignmentId id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }
    public OffsetDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(OffsetDateTime assignedAt) { this.assignedAt = assignedAt; }
    public UUID getAssignedBy() { return assignedBy; }
    public void setAssignedBy(UUID assignedBy) { this.assignedBy = assignedBy; }
    public boolean isPrimary() { return isPrimary; }
    public void setPrimary(boolean primary) { isPrimary = primary; }
}
