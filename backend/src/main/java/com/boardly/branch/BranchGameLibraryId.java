package com.boardly.branch;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class BranchGameLibraryId implements Serializable {

    @Column(name = "branch_id", columnDefinition = "uuid")
    private UUID branchId;

    @Column(name = "product_id", columnDefinition = "uuid")
    private UUID productId;

    public BranchGameLibraryId() {}

    public BranchGameLibraryId(UUID branchId, UUID productId) {
        this.branchId = branchId;
        this.productId = productId;
    }

    public UUID getBranchId() { return branchId; }
    public void setBranchId(UUID branchId) { this.branchId = branchId; }
    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BranchGameLibraryId)) return false;
        BranchGameLibraryId that = (BranchGameLibraryId) o;
        return Objects.equals(branchId, that.branchId) && Objects.equals(productId, that.productId);
    }

    @Override
    public int hashCode() { return Objects.hash(branchId, productId); }
}
