package com.boardly.order;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.boardly.user.User;
import com.boardly.branch.Branch;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "order_number", nullable = false, unique = true, length = 30)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "status", nullable = false, columnDefinition = "order_status_enum")
    @ColumnTransformer(write = "?::order_status_enum")
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fulfillment_method_id", nullable = false)
    private FulfillmentMethod fulfillmentMethod;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pickup_branch_id")
    private Branch pickupBranch;

    @Column(name = "contact_first_name", nullable = false, length = 100)
    private String contactFirstName;

    @Column(name = "contact_last_name", nullable = false, length = 100)
    private String contactLastName;

    @Column(name = "contact_email", nullable = false, length = 255)
    private String contactEmail;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    @Column(name = "subtotal", nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "shipping_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal shippingFee;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "currency", nullable = false, columnDefinition = "char(3)")
    @JdbcTypeCode(SqlTypes.CHAR)
    private String currency;

    @Column(name = "shipping_address", length = 255)
    private String shippingAddress;

    @Column(name = "shipping_district", length = 100)
    private String shippingDistrict;

    @Column(name = "shipping_province", length = 100)
    private String shippingProvince;

    @Column(name = "shipping_postal_code", length = 20)
    private String shippingPostalCode;

    @Column(name = "estimated_delivery_date")
    private java.time.LocalDate estimatedDeliveryDate;

    @Column(name = "placed_at", nullable = false)
    private OffsetDateTime placedAt;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    // Getters and Setters omitted for brevity but standard
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public FulfillmentMethod getFulfillmentMethod() { return fulfillmentMethod; }
    public void setFulfillmentMethod(FulfillmentMethod fulfillmentMethod) { this.fulfillmentMethod = fulfillmentMethod; }
    public Branch getPickupBranch() { return pickupBranch; }
    public void setPickupBranch(Branch pickupBranch) { this.pickupBranch = pickupBranch; }
    public String getContactFirstName() { return contactFirstName; }
    public void setContactFirstName(String contactFirstName) { this.contactFirstName = contactFirstName; }
    public String getContactLastName() { return contactLastName; }
    public void setContactLastName(String contactLastName) { this.contactLastName = contactLastName; }
    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }
    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getShippingFee() { return shippingFee; }
    public void setShippingFee(BigDecimal shippingFee) { this.shippingFee = shippingFee; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(String shippingAddress) { this.shippingAddress = shippingAddress; }
    public String getShippingDistrict() { return shippingDistrict; }
    public void setShippingDistrict(String shippingDistrict) { this.shippingDistrict = shippingDistrict; }
    public String getShippingProvince() { return shippingProvince; }
    public void setShippingProvince(String shippingProvince) { this.shippingProvince = shippingProvince; }
    public String getShippingPostalCode() { return shippingPostalCode; }
    public void setShippingPostalCode(String shippingPostalCode) { this.shippingPostalCode = shippingPostalCode; }
    public java.time.LocalDate getEstimatedDeliveryDate() { return estimatedDeliveryDate; }
    public void setEstimatedDeliveryDate(java.time.LocalDate estimatedDeliveryDate) { this.estimatedDeliveryDate = estimatedDeliveryDate; }
    public OffsetDateTime getPlacedAt() { return placedAt; }
    public void setPlacedAt(OffsetDateTime placedAt) { this.placedAt = placedAt; }
    public OffsetDateTime getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(OffsetDateTime cancelledAt) { this.cancelledAt = cancelledAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
