package com.boardly.branch;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class StoreTableFeatureId implements Serializable {

    @Column(name = "table_id", columnDefinition = "uuid")
    private UUID tableId;

    @Column(name = "feature_id", columnDefinition = "uuid")
    private UUID featureId;

    public StoreTableFeatureId() {}

    public StoreTableFeatureId(UUID tableId, UUID featureId) {
        this.tableId = tableId;
        this.featureId = featureId;
    }

    public UUID getTableId() { return tableId; }
    public void setTableId(UUID tableId) { this.tableId = tableId; }
    public UUID getFeatureId() { return featureId; }
    public void setFeatureId(UUID featureId) { this.featureId = featureId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof StoreTableFeatureId)) return false;
        StoreTableFeatureId that = (StoreTableFeatureId) o;
        return Objects.equals(tableId, that.tableId) && Objects.equals(featureId, that.featureId);
    }

    @Override
    public int hashCode() { return Objects.hash(tableId, featureId); }
}
