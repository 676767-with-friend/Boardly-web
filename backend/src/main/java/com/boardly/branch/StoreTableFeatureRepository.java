package com.boardly.branch;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreTableFeatureRepository extends JpaRepository<StoreTableFeature, StoreTableFeatureId> {
    List<StoreTableFeature> findByTableId(UUID tableId);
    void deleteByTableId(UUID tableId);
}
