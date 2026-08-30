package com.boardly.branch;

import jakarta.persistence.*;

@Entity
@Table(name = "store_table_features")
public class StoreTableFeature {

    @EmbeddedId
    private StoreTableFeatureId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("tableId")
    @JoinColumn(name = "table_id")
    private StoreTable table;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("featureId")
    @JoinColumn(name = "feature_id")
    private TableFeature feature;

    public StoreTableFeatureId getId() { return id; }
    public void setId(StoreTableFeatureId id) { this.id = id; }
    public StoreTable getTable() { return table; }
    public void setTable(StoreTable table) { this.table = table; }
    public TableFeature getFeature() { return feature; }
    public void setFeature(TableFeature feature) { this.feature = feature; }
}
