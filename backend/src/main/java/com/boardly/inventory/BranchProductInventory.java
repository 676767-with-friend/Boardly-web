package com.boardly.inventory;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import com.boardly.branch.Branch;
import com.boardly.product.Product;

@Entity
@Table(name = "branch_product_inventory")
public class BranchProductInventory {

    @EmbeddedId
    private BranchProductInventoryId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("branchId")
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("productId")
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(name = "quantity_on_hand", nullable = false)
    private int quantityOnHand = 0;

    @Column(name = "reserved_quantity", nullable = false)
    private int reservedQuantity = 0;

    @Column(name = "low_stock_threshold", nullable = false)
    private int lowStockThreshold = 3;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public BranchProductInventoryId getId() { return id; }
    public void setId(BranchProductInventoryId id) { this.id = id; }
    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public int getQuantityOnHand() { return quantityOnHand; }
    public void setQuantityOnHand(int quantityOnHand) { this.quantityOnHand = quantityOnHand; }
    public int getReservedQuantity() { return reservedQuantity; }
    public void setReservedQuantity(int reservedQuantity) { this.reservedQuantity = reservedQuantity; }
    public int getLowStockThreshold() { return lowStockThreshold; }
    public void setLowStockThreshold(int lowStockThreshold) { this.lowStockThreshold = lowStockThreshold; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
