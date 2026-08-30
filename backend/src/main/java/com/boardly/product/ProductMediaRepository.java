package com.boardly.product;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductMediaRepository extends JpaRepository<ProductMedia, UUID> {
    List<ProductMedia> findByProductIdOrderBySortOrderAsc(UUID productId);
}
