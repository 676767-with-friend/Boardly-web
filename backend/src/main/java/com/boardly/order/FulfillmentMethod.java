package com.boardly.order;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "fulfillment_methods")
public class FulfillmentMethod {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "base_fee", nullable = false, precision = 10, scale = 2)
    private java.math.BigDecimal baseFee;

    @Column(name = "eta_min_days")
    private Short etaMinDays;

    @Column(name = "eta_max_days")
    private Short etaMaxDays;

    @Column(name = "is_store_pickup", nullable = false)
    private boolean isStorePickup = false;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public java.math.BigDecimal getBaseFee() { return baseFee; }
    public void setBaseFee(java.math.BigDecimal baseFee) { this.baseFee = baseFee; }
    public Short getEtaMinDays() { return etaMinDays; }
    public void setEtaMinDays(Short etaMinDays) { this.etaMinDays = etaMinDays; }
    public Short getEtaMaxDays() { return etaMaxDays; }
    public void setEtaMaxDays(Short etaMaxDays) { this.etaMaxDays = etaMaxDays; }
    public boolean isStorePickup() { return isStorePickup; }
    public void setStorePickup(boolean storePickup) { this.isStorePickup = storePickup; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
}
