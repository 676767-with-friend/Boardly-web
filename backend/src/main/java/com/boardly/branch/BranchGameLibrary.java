package com.boardly.branch;

import jakarta.persistence.*;
import com.boardly.product.Product;

@Entity
@Table(name = "branch_game_library")
public class BranchGameLibrary {

    @EmbeddedId
    private BranchGameLibraryId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("branchId")
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("productId")
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(name = "playable_copies")
    private Integer playableCopies;

    @Column(name = "is_available", nullable = false)
    private boolean available = true;

    public BranchGameLibraryId getId() { return id; }
    public void setId(BranchGameLibraryId id) { this.id = id; }
    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public Integer getPlayableCopies() { return playableCopies; }
    public void setPlayableCopies(Integer playableCopies) { this.playableCopies = playableCopies; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
