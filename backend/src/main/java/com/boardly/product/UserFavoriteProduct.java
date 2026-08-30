package com.boardly.product;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import com.boardly.user.User;

@Entity
@Table(name = "user_favorite_products")
public class UserFavoriteProduct {

    @EmbeddedId
    private UserFavoriteProductId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("productId")
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public UserFavoriteProductId getId() { return id; }
    public void setId(UserFavoriteProductId id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
