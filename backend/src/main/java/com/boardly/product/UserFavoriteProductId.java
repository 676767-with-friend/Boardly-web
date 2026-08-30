package com.boardly.product;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class UserFavoriteProductId implements Serializable {

    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "product_id", columnDefinition = "uuid")
    private UUID productId;

    public UserFavoriteProductId() {}

    public UserFavoriteProductId(UUID userId, UUID productId) {
        this.userId = userId;
        this.productId = productId;
    }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserFavoriteProductId)) return false;
        UserFavoriteProductId that = (UserFavoriteProductId) o;
        return Objects.equals(userId, that.userId) && Objects.equals(productId, that.productId);
    }

    @Override
    public int hashCode() { return Objects.hash(userId, productId); }
}
