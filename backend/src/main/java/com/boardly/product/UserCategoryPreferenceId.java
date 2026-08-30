package com.boardly.product;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class UserCategoryPreferenceId implements Serializable {

    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "category_id", columnDefinition = "uuid")
    private UUID categoryId;

    public UserCategoryPreferenceId() {}

    public UserCategoryPreferenceId(UUID userId, UUID categoryId) {
        this.userId = userId;
        this.categoryId = categoryId;
    }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getCategoryId() { return categoryId; }
    public void setCategoryId(UUID categoryId) { this.categoryId = categoryId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserCategoryPreferenceId)) return false;
        UserCategoryPreferenceId that = (UserCategoryPreferenceId) o;
        return Objects.equals(userId, that.userId) && Objects.equals(categoryId, that.categoryId);
    }

    @Override
    public int hashCode() { return Objects.hash(userId, categoryId); }
}
