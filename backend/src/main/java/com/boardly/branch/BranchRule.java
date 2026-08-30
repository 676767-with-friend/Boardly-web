package com.boardly.branch;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "branch_rules")
public class BranchRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @Column(name = "rule_text", nullable = false, columnDefinition = "TEXT")
    private String ruleText;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }
    public String getRuleText() { return ruleText; }
    public void setRuleText(String ruleText) { this.ruleText = ruleText; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
