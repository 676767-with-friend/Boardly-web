package com.boardly.product;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ProductReviewResponse(UUID id, String author, short rating, String text, OffsetDateTime createdAt) {
}
