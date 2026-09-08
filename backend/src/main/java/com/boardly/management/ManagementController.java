package com.boardly.management;

import com.boardly.auth.AuthUser;
import com.boardly.management.ManagementDtos.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ManagementController {
    private final ManagementService service;
    public ManagementController(ManagementService service) { this.service = service; }

    @GetMapping("/me/profile") public ProfileResponse profile(@AuthenticationPrincipal AuthUser user) { return service.profile(user); }
    @PutMapping("/me/profile") public ProfileResponse updateProfile(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody UpdateProfileRequest request) { return service.updateProfile(user, request); }

    @GetMapping("/staff/dashboard") public DashboardResponse staffDashboard(@AuthenticationPrincipal AuthUser user) { return service.staffDashboard(user); }
    @GetMapping("/staff/orders") public List<OrderSummaryResponse> staffOrders(@AuthenticationPrincipal AuthUser user) { return service.staffOrders(user); }
    @GetMapping("/staff/products") public List<InventoryResponse> staffProducts(@AuthenticationPrincipal AuthUser user, @RequestParam UUID branchId) { return service.staffInventory(user, branchId); }
    @GetMapping("/staff/branches") public List<StaffBranchResponse> staffBranches(@AuthenticationPrincipal AuthUser user) { return service.staffBranches(user); }
    @PatchMapping("/staff/inventory/{productId}") public InventoryResponse adjustStaffInventory(@AuthenticationPrincipal AuthUser user, @PathVariable UUID productId, @Valid @RequestBody InventoryAdjustmentRequest request) { return service.adjustStaffInventory(user, productId, request); }
    @GetMapping("/staff/users") public List<UserSummaryResponse> staffUsers(@AuthenticationPrincipal AuthUser user, @RequestParam(required = false) String search) { return service.staffUsers(user, search); }

    @GetMapping("/admin/dashboard") public DashboardResponse adminDashboard() { return service.adminDashboard(); }
    @GetMapping("/admin/orders") public List<OrderSummaryResponse> adminOrders() { return service.adminOrders(); }
    @GetMapping("/admin/users") public List<UserSummaryResponse> adminUsers(@RequestParam(required = false) String search) { return service.adminUsers(search); }
    @PatchMapping("/admin/users/{id}/status") public UserSummaryResponse updateUserStatus(@PathVariable UUID id, @Valid @RequestBody UpdateUserStatusRequest request) { return service.updateUserStatus(id, request); }
    @GetMapping("/admin/staff") public List<StaffResponse> staff() { return service.staff(); }
    @PostMapping("/admin/staff") public StaffResponse createStaff(@AuthenticationPrincipal AuthUser admin, @Valid @RequestBody CreateStaffRequest request) { return service.createStaff(admin, request); }
    @PutMapping("/admin/staff/{id}") public StaffResponse updateStaff(@AuthenticationPrincipal AuthUser admin, @PathVariable UUID id, @Valid @RequestBody UpdateStaffRequest request) { return service.updateStaff(admin, id, request); }
    @GetMapping("/admin/branches") public List<BranchResponse> branches() { return service.branches(); }
    @PostMapping("/admin/branches") public BranchResponse createBranch(@Valid @RequestBody BranchRequest request) { return service.createBranch(request); }
    @PutMapping("/admin/branches/{id}") public BranchResponse updateBranch(@PathVariable UUID id, @Valid @RequestBody BranchRequest request) { return service.updateBranch(id, request); }
    @GetMapping("/admin/products") public List<ProductManagementResponse> products() { return service.products(); }
    @PostMapping("/admin/products") public ProductManagementResponse createProduct(@Valid @RequestBody ProductManagementRequest request) { return service.createProduct(request); }
    @PutMapping("/admin/products/{id}") public ProductManagementResponse updateProduct(@PathVariable UUID id, @Valid @RequestBody ProductManagementRequest request) { return service.updateProduct(id, request); }
    @GetMapping("/admin/inventory") public List<InventoryResponse> inventory(@RequestParam UUID branchId) { return service.inventory(branchId); }
    @PatchMapping("/admin/inventory/{productId}") public InventoryResponse adjustInventory(@AuthenticationPrincipal AuthUser admin, @PathVariable UUID productId, @Valid @RequestBody InventoryAdjustmentRequest request) { return service.adjustInventory(admin, productId, request); }
    @PostMapping("/admin/inventory") public InventoryResponse addInventory(@AuthenticationPrincipal AuthUser admin, @Valid @RequestBody AddInventoryRequest request) { return service.addInventory(admin, request); }
    @GetMapping("/admin/table-zones") public List<TableZoneResponse> tableZones(@AuthenticationPrincipal AuthUser user, @RequestParam UUID branchId) { return service.tableZones(user, branchId); }
    @GetMapping("/admin/table-features") public List<TableFeatureResponse> tableFeatures(@AuthenticationPrincipal AuthUser user) { return service.tableFeatures(user); }
    @GetMapping("/admin/tables") public List<AdminTableResponse> tables(@AuthenticationPrincipal AuthUser user, @RequestParam UUID branchId) { return service.tables(user, branchId); }
    @PostMapping("/admin/tables") public AdminTableResponse createTable(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody AdminTableRequest request) { return service.createTable(user, request); }
    @PutMapping("/admin/tables/{id}") public AdminTableResponse updateTable(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id, @Valid @RequestBody AdminTableRequest request) { return service.updateTable(user, id, request); }
    @DeleteMapping("/admin/tables/{id}") public AdminTableResponse deactivateTable(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) { return service.deactivateTable(user, id); }
}
