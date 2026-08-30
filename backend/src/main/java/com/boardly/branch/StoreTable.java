package com.boardly.branch;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "store_tables")
public class StoreTable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @Column(name = "code", nullable = false, length = 30)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id", nullable = false)
    private TableZone zone;

    @Column(name = "min_players", nullable = false)
    private Short minPlayers;

    @Column(name = "max_players", nullable = false)
    private Short maxPlayers;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "operational_status", nullable = false, columnDefinition = "table_operational_status_enum")
    private OperationalStatus operationalStatus;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public enum OperationalStatus {
        available, unavailable
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public TableZone getZone() { return zone; }
    public void setZone(TableZone zone) { this.zone = zone; }
    public Short getMinPlayers() { return minPlayers; }
    public void setMinPlayers(Short minPlayers) { this.minPlayers = minPlayers; }
    public Short getMaxPlayers() { return maxPlayers; }
    public void setMaxPlayers(Short maxPlayers) { this.maxPlayers = maxPlayers; }
    public OperationalStatus getOperationalStatus() { return operationalStatus; }
    public void setOperationalStatus(OperationalStatus operationalStatus) { this.operationalStatus = operationalStatus; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
