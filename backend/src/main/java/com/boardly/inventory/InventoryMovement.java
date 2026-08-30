package com.boardly.inventory;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnTransformer;
import java.time.OffsetDateTime;
import java.util.UUID;
import com.boardly.branch.Branch;
import com.boardly.product.Product;
import com.boardly.user.User;

@Entity
@Table(name = "inventory_movements")
public class InventoryMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "movement_type", nullable = false, columnDefinition = "inventory_movement_type_enum")
    @ColumnTransformer(write = "?::inventory_movement_type_enum")
    private String movementType;

    @Column(name = "quantity_delta", nullable = false)
    private int quantityDelta;

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id", columnDefinition = "uuid")
    private UUID referenceId;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public String getMovementType() { return movementType; }
    public void setMovementType(String movementType) { this.movementType = movementType; }
    public int getQuantityDelta() { return quantityDelta; }
    public void setQuantityDelta(int quantityDelta) { this.quantityDelta = quantityDelta; }
    public String getReferenceType() { return referenceType; }
    public void setReferenceType(String referenceType) { this.referenceType = referenceType; }
    public UUID getReferenceId() { return referenceId; }
    public void setReferenceId(UUID referenceId) { this.referenceId = referenceId; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
