package com.boardly.product;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "sku", nullable = false, unique = true, length = 100)
    private String sku;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private ProductCategory category;

    @Column(name = "base_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal basePrice;

    @Column(name = "sale_price", precision = 10, scale = 2)
    private BigDecimal salePrice;

    @Column(name = "min_players", nullable = false)
    private Short minPlayers;

    @Column(name = "max_players", nullable = false)
    private Short maxPlayers;

    @Column(name = "min_play_time_minutes")
    private Short minPlayTimeMinutes;

    @Column(name = "max_play_time_minutes")
    private Short maxPlayTimeMinutes;

    @Column(name = "min_age")
    private Short minAge;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "difficulty", nullable = false, columnDefinition = "product_difficulty_enum")
    private ProductDifficulty difficulty;

    @Column(name = "publisher_name", length = 255)
    private String publisherName;

    @Column(name = "designer_name", length = 255)
    private String designerName;

    @Column(name = "languages_text", length = 255)
    private String languagesText;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public enum ProductDifficulty {
        easy, medium, advanced, expert
    }

    // Getters & Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public ProductCategory getCategory() { return category; }
    public void setCategory(ProductCategory category) { this.category = category; }
    public BigDecimal getBasePrice() { return basePrice; }
    public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }
    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }
    public Short getMinPlayers() { return minPlayers; }
    public void setMinPlayers(Short minPlayers) { this.minPlayers = minPlayers; }
    public Short getMaxPlayers() { return maxPlayers; }
    public void setMaxPlayers(Short maxPlayers) { this.maxPlayers = maxPlayers; }
    public Short getMinPlayTimeMinutes() { return minPlayTimeMinutes; }
    public void setMinPlayTimeMinutes(Short m) { this.minPlayTimeMinutes = m; }
    public Short getMaxPlayTimeMinutes() { return maxPlayTimeMinutes; }
    public void setMaxPlayTimeMinutes(Short m) { this.maxPlayTimeMinutes = m; }
    public Short getMinAge() { return minAge; }
    public void setMinAge(Short minAge) { this.minAge = minAge; }
    public ProductDifficulty getDifficulty() { return difficulty; }
    public void setDifficulty(ProductDifficulty difficulty) { this.difficulty = difficulty; }
    public String getPublisherName() { return publisherName; }
    public void setPublisherName(String publisherName) { this.publisherName = publisherName; }
    public String getDesignerName() { return designerName; }
    public void setDesignerName(String designerName) { this.designerName = designerName; }
    public String getLanguagesText() { return languagesText; }
    public void setLanguagesText(String languagesText) { this.languagesText = languagesText; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public OffsetDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(OffsetDateTime publishedAt) { this.publishedAt = publishedAt; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
