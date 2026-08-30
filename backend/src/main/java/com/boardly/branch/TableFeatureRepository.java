package com.boardly.branch;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TableFeatureRepository extends JpaRepository<TableFeature, UUID> {
    List<TableFeature> findByIsActiveTrueOrderByNameAsc();
}
