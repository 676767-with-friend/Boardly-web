package com.boardly.reservation;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.boardly.branch.Branch;
import com.boardly.branch.BranchPricingRule;
import com.boardly.branch.StoreTable;
import com.boardly.user.User;

@Entity
@Table(name = "play_sessions")
public class PlaySession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id")
    private Reservation reservation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id", nullable = false)
    private StoreTable table;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "guest_name", length = 200)
    private String guestName;

    @Column(name = "guest_phone", length = 30)
    private String guestPhone;

    @Column(name = "guest_email", length = 255)
    private String guestEmail;

    @Column(name = "player_count", nullable = false)
    private Short playerCount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pricing_rule_id")
    private BranchPricingRule pricingRule;

    @Column(name = "check_in_at", nullable = false)
    private OffsetDateTime checkInAt;

    @Column(name = "check_out_at")
    private OffsetDateTime checkOutAt;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "play_session_status_enum")
    private PlaySessionStatus status;

    @Column(name = "final_fee", precision = 10, scale = 2)
    private BigDecimal finalFee;

    @Column(name = "created_by", columnDefinition = "uuid")
    private UUID createdBy;

    @Column(name = "closed_by", columnDefinition = "uuid")
    private UUID closedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public enum PlaySessionStatus {
        active, completed, cancelled
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Reservation getReservation() { return reservation; }
    public void setReservation(Reservation reservation) { this.reservation = reservation; }
    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }
    public StoreTable getTable() { return table; }
    public void setTable(StoreTable table) { this.table = table; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getGuestName() { return guestName; }
    public void setGuestName(String guestName) { this.guestName = guestName; }
    public String getGuestPhone() { return guestPhone; }
    public void setGuestPhone(String guestPhone) { this.guestPhone = guestPhone; }
    public String getGuestEmail() { return guestEmail; }
    public void setGuestEmail(String guestEmail) { this.guestEmail = guestEmail; }
    public Short getPlayerCount() { return playerCount; }
    public void setPlayerCount(Short playerCount) { this.playerCount = playerCount; }
    public BranchPricingRule getPricingRule() { return pricingRule; }
    public void setPricingRule(BranchPricingRule pricingRule) { this.pricingRule = pricingRule; }
    public OffsetDateTime getCheckInAt() { return checkInAt; }
    public void setCheckInAt(OffsetDateTime checkInAt) { this.checkInAt = checkInAt; }
    public OffsetDateTime getCheckOutAt() { return checkOutAt; }
    public void setCheckOutAt(OffsetDateTime checkOutAt) { this.checkOutAt = checkOutAt; }
    public PlaySessionStatus getStatus() { return status; }
    public void setStatus(PlaySessionStatus status) { this.status = status; }
    public BigDecimal getFinalFee() { return finalFee; }
    public void setFinalFee(BigDecimal finalFee) { this.finalFee = finalFee; }
    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
    public UUID getClosedBy() { return closedBy; }
    public void setClosedBy(UUID closedBy) { this.closedBy = closedBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
