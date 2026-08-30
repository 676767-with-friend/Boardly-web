package com.boardly.management;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class ManagementDtos {
    private ManagementDtos() {}

    public record ProfileResponse(UUID id, String firstName, String lastName, String displayName, String email, String phone) {}
    public record UpdateProfileRequest(@NotBlank @Size(max = 100) String firstName, @NotBlank @Size(max = 100) String lastName, @Size(max = 100) String displayName, @Size(max = 30) String phone) {}
    public record DashboardResponse(String branchName, long totalTables, long availableTables, long unavailableTables, long activeSessions, long reservationsToday, long orders, long activeBranches, long activeStaff, BigDecimal salesToday) {}
    public record OrderSummaryResponse(String orderNumber, String customerName, String status, String fulfillmentMethod, String pickupBranchName, BigDecimal totalAmount, String currency, int itemCount, OffsetDateTime placedAt) {}
    public record UserSummaryResponse(UUID id, String name, String email, String phone, String status, List<String> roles, long orderCount, long reservationCount, long completedVisits, OffsetDateTime lastActivity) {}
    public record UpdateUserStatusRequest(@NotBlank String status) {}
    public record StaffResponse(UUID id, String name, String email, String phone, String status, List<UUID> branchIds, List<String> branchNames, OffsetDateTime lastLoginAt) {}
    public record CreateStaffRequest(@NotBlank @Size(max = 100) String firstName, @NotBlank @Size(max = 100) String lastName, @Size(max = 100) String displayName, @NotBlank @Email String email, @Size(max = 30) String phone, @NotBlank @Size(min = 12, max = 128) String password, @NotEmpty List<UUID> branchIds, @NotNull UUID primaryBranchId) {}
    public record UpdateStaffRequest(@NotBlank @Size(max = 100) String firstName, @NotBlank @Size(max = 100) String lastName, @Size(max = 100) String displayName, @Size(max = 30) String phone, @NotBlank String status, @NotEmpty List<UUID> branchIds, @NotNull UUID primaryBranchId) {}
    public record BranchResponse(UUID id, String code, String name, String address, String district, String province, String postalCode, String phone, String status, boolean allowReservations, long tableCount, long staffCount, long reservationsToday) {}
    public record BranchRequest(@NotBlank @Size(max = 30) String code, @NotBlank @Size(max = 255) String name, @NotBlank @Size(max = 255) String address, @NotBlank @Size(max = 100) String district, @Size(max = 100) String province, @Size(max = 20) String postalCode, @Size(max = 30) String phone, @NotBlank String status, boolean allowReservations) {}
    public record ProductManagementResponse(UUID id, String sku, String name, UUID categoryId, String categoryName, BigDecimal basePrice, BigDecimal salePrice, short minPlayers, short maxPlayers, Short minPlayTimeMinutes, Short maxPlayTimeMinutes, Short minAge, String difficulty, String description, boolean active, long stock) {}
    public record ProductManagementRequest(@NotBlank @Size(max = 100) String sku, @NotBlank @Size(max = 255) String name, @NotNull UUID categoryId, @NotNull @Min(0) BigDecimal basePrice, @Min(0) BigDecimal salePrice, @Min(1) short minPlayers, @Min(1) short maxPlayers, Short minPlayTimeMinutes, Short maxPlayTimeMinutes, Short minAge, @NotBlank String difficulty, String description, boolean active) {}
    public record InventoryResponse(UUID branchId, String branchName, UUID productId, String productName, String sku, int quantityOnHand, int reservedQuantity, int availableQuantity, int lowStockThreshold) {}
    public record InventoryAdjustmentRequest(@NotNull UUID branchId, @NotNull @Min(-100000) Integer quantityDelta, @Size(max = 1000) String note) {}
    public record AddInventoryRequest(@NotNull UUID branchId, @NotNull UUID productId,
                                      @NotNull @Min(0) Integer quantityOnHand,
                                      @NotNull @Min(0) Integer lowStockThreshold) {}
    public record StaffBranchResponse(UUID id, String name) {}
    public record TableZoneResponse(UUID id, UUID branchId, String name, int sortOrder) {}
    public record TableFeatureResponse(UUID id, String name) {}
    public record AdminTableResponse(UUID id, UUID branchId, String branchName, String code,
                                     UUID zoneId, String zoneName, short minPlayers, short maxPlayers,
                                     String operationalStatus, int sortOrder, boolean active,
                                     List<UUID> featureIds, List<String> featureNames) {}
    public record AdminTableRequest(@NotNull UUID branchId, @NotBlank @Size(max = 30) String code,
                                    @NotNull UUID zoneId, @Min(1) short minPlayers,
                                    @Min(1) short maxPlayers, @NotBlank String operationalStatus,
                                    @Min(0) int sortOrder, boolean active,
                                    @NotNull List<UUID> featureIds) {}
}
