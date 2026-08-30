package com.boardly.branch;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "branch_pricing_rules")
public class BranchPricingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @Column(name = "first_hour_per_person", nullable = false, precision = 10, scale = 2)
    private BigDecimal firstHourPerPerson;

    @Column(name = "additional_hour_per_person", nullable = false, precision = 10, scale = 2)
    private BigDecimal additionalHourPerPerson;

    @Column(name = "child_hour_per_person", precision = 10, scale = 2)
    private BigDecimal childHourPerPerson;

    @Column(name = "child_age_under")
    private Short childAgeUnder;

    @Column(name = "currency", nullable = false, columnDefinition = "char(3)")
    @JdbcTypeCode(SqlTypes.CHAR)
    private String currency = "THB";

    @Column(name = "effective_from", nullable = false)
    private OffsetDateTime effectiveFrom;

    @Column(name = "effective_to")
    private OffsetDateTime effectiveTo;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }
    public BigDecimal getFirstHourPerPerson() { return firstHourPerPerson; }
    public void setFirstHourPerPerson(BigDecimal firstHourPerPerson) { this.firstHourPerPerson = firstHourPerPerson; }
    public BigDecimal getAdditionalHourPerPerson() { return additionalHourPerPerson; }
    public void setAdditionalHourPerPerson(BigDecimal additionalHourPerPerson) { this.additionalHourPerPerson = additionalHourPerPerson; }
    public BigDecimal getChildHourPerPerson() { return childHourPerPerson; }
    public void setChildHourPerPerson(BigDecimal childHourPerPerson) { this.childHourPerPerson = childHourPerPerson; }
    public Short getChildAgeUnder() { return childAgeUnder; }
    public void setChildAgeUnder(Short childAgeUnder) { this.childAgeUnder = childAgeUnder; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public OffsetDateTime getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(OffsetDateTime effectiveFrom) { this.effectiveFrom = effectiveFrom; }
    public OffsetDateTime getEffectiveTo() { return effectiveTo; }
    public void setEffectiveTo(OffsetDateTime effectiveTo) { this.effectiveTo = effectiveTo; }
}
