package com.boardly.inventory;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class BranchProductInventoryId implements Serializable {

    @Column(name = "branch_id", columnDefinition = "uuid")
    private UUID branchId;

    @Column(name = "product_id", columnDefinition = "uuid")
    private UUID productId;

    public BranchProductInventoryId() {}

    public BranchProductInventoryId(UUID branchId, UUID productId) {
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
        if (!(o instanceof BranchProductInventoryId)) return false;
        BranchProductInventoryId that = (BranchProductInventoryId) o;
        return Objects.equals(branchId, that.branchId) && Objects.equals(productId, that.productId);
    }

    @Override
    public int hashCode() { return Objects.hash(branchId, productId); }
}
