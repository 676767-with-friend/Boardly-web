package com.boardly.product;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductReviewRepository extends JpaRepository<ProductReview, UUID> {
    List<ProductReview> findByProductIdAndStatusOrderByCreatedAtDesc(UUID productId, ProductReview.ReviewStatus status);
}
