package com.boardly.product;

import java.util.UUID;

public record ProductMediaResponse(UUID id, String url, String type, String altText, boolean primary, int sortOrder) {
}
