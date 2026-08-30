package com.boardly.product;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ProductResponse(
        UUID id,
        String sku,
        String name,
        String category,
        BigDecimal price,
        BigDecimal salePrice,
        String players,
        String playTime,
        String age,
        String difficulty,
        BigDecimal rating,
        long reviewCount,
        long stock,
        String image,
        boolean isNew,
        String description,
        String publisherName,
        String designerName,
        String languages,
        List<ProductMediaResponse> media,
        List<ProductReviewResponse> reviews
) {
}
