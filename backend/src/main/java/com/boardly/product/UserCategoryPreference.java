package com.boardly.product;

import jakarta.persistence.*;
import com.boardly.user.User;

@Entity
@Table(name = "user_category_preferences")
public class UserCategoryPreference {

    @EmbeddedId
    private UserCategoryPreferenceId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("categoryId")
    @JoinColumn(name = "category_id")
    private ProductCategory category;

    public UserCategoryPreferenceId getId() { return id; }
    public void setId(UserCategoryPreferenceId id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public ProductCategory getCategory() { return category; }
    public void setCategory(ProductCategory category) { this.category = category; }
}
