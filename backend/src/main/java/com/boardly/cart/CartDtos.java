package com.boardly.cart;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public final class CartDtos {
    private CartDtos() {
    }

    public record AddCartItemRequest(@NotNull UUID productId, @Min(1) @Max(99) int quantity) {
    }

    public record UpdateCartItemRequest(@Min(1) @Max(99) int quantity) {
    }

    public record CartItemResponse(
            UUID id,
            UUID productId,
            String name,
            String sku,
            String image,
            BigDecimal unitPrice,
            int quantity,
            BigDecimal lineTotal) {
    }

    public record CartResponse(UUID id, List<CartItemResponse> items, int itemCount, BigDecimal subtotal, String currency) {
    }
}
