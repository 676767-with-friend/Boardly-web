package com.boardly.management;

import com.boardly.auth.AuthUser;
import com.boardly.branch.Branch;
import com.boardly.branch.BranchRepository;
import com.boardly.branch.StoreTable;
import com.boardly.branch.StoreTableFeature;
import com.boardly.branch.StoreTableFeatureId;
import com.boardly.branch.StoreTableFeatureRepository;
import com.boardly.branch.StoreTableRepository;
import com.boardly.branch.TableFeature;
import com.boardly.branch.TableFeatureRepository;
import com.boardly.branch.TableZone;
import com.boardly.branch.TableZoneRepository;
import com.boardly.common.exception.BoardlyException;
import com.boardly.inventory.BranchProductInventory;
import com.boardly.inventory.BranchProductInventoryId;
import com.boardly.inventory.BranchProductInventoryRepository;
import com.boardly.inventory.InventoryMovement;
import com.boardly.inventory.InventoryMovementRepository;
import com.boardly.management.ManagementDtos.*;
import com.boardly.order.Order;
import com.boardly.order.OrderItemRepository;
import com.boardly.order.OrderRepository;
import com.boardly.product.Product;
import com.boardly.product.ProductCategory;
import com.boardly.product.ProductCategoryRepository;
import com.boardly.product.ProductRepository;
import com.boardly.reservation.PlaySession;
import com.boardly.reservation.PlaySessionRepository;
import com.boardly.reservation.ReservationRepository;
import com.boardly.user.Role;
import com.boardly.user.RoleRepository;
import com.boardly.user.StaffBranchAssignment;
import com.boardly.user.StaffBranchAssignmentId;
import com.boardly.user.StaffBranchAssignmentRepository;
import com.boardly.user.User;
import com.boardly.user.UserRepository;
import com.boardly.user.UserRole;
import com.boardly.user.UserRoleId;
import com.boardly.user.UserRoleRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ManagementService {
    private final UserRepository users;
    private final UserRoleRepository userRoles;
    private final RoleRepository roles;
    private final StaffBranchAssignmentRepository assignments;
    private final BranchRepository branches;
    private final StoreTableRepository tables;
    private final ReservationRepository reservations;
    private final PlaySessionRepository sessions;
    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final ProductRepository products;
    private final ProductCategoryRepository categories;
    private final BranchProductInventoryRepository inventory;
    private final InventoryMovementRepository movements;
    private final TableZoneRepository zones;
    private final TableFeatureRepository features;
    private final StoreTableFeatureRepository tableFeatures;
    private final PasswordEncoder passwordEncoder;

    public ManagementService(UserRepository users, UserRoleRepository userRoles, RoleRepository roles,
            StaffBranchAssignmentRepository assignments, BranchRepository branches, StoreTableRepository tables,
            ReservationRepository reservations, PlaySessionRepository sessions, OrderRepository orders,
            OrderItemRepository orderItems, ProductRepository products, ProductCategoryRepository categories,
            BranchProductInventoryRepository inventory, InventoryMovementRepository movements,
            TableZoneRepository zones, TableFeatureRepository features,
            StoreTableFeatureRepository tableFeatures, PasswordEncoder passwordEncoder) {
        this.users = users; this.userRoles = userRoles; this.roles = roles; this.assignments = assignments;
        this.branches = branches; this.tables = tables; this.reservations = reservations; this.sessions = sessions;
        this.orders = orders; this.orderItems = orderItems; this.products = products; this.categories = categories;
        this.inventory = inventory; this.movements = movements; this.passwordEncoder = passwordEncoder;
        this.zones = zones; this.features = features; this.tableFeatures = tableFeatures;
    }

    @Transactional(readOnly = true)
    public ProfileResponse profile(AuthUser principal) { return profile(requiredUser(principal.id())); }

    @Transactional
    public ProfileResponse updateProfile(AuthUser principal, UpdateProfileRequest request) {
        User user = requiredUser(principal.id());
        user.setFirstName(request.firstName().trim()); user.setLastName(request.lastName().trim());
        user.setDisplayName(blankToNull(request.displayName())); user.setPhone(blankToNull(request.phone()));
        user.setUpdatedAt(OffsetDateTime.now());
        return profile(users.save(user));
    }

    @Transactional(readOnly = true)
    public DashboardResponse staffDashboard(AuthUser principal) { return dashboard(staffBranch(principal)); }

    @Transactional(readOnly = true)
    public List<OrderSummaryResponse> staffOrders(AuthUser principal) {
        List<UUID> branchIds = branchIds(principal);
        return orders.findByPickupBranchIdInOrderByPlacedAtDesc(branchIds).stream().map(this::order).toList();
    }

    @Transactional(readOnly = true)
    public List<InventoryResponse> staffInventory(AuthUser principal, UUID branchId) {
        requireBranchScope(principal, branchId);
        return inventory(branchId);
    }

    @Transactional(readOnly = true)
    public List<StaffBranchResponse> staffBranches(AuthUser principal) {
        return branchIds(principal).stream().map(this::requiredBranch)
                .map(branch -> new StaffBranchResponse(branch.getId(), branch.getName())).toList();
    }

    @Transactional
    public InventoryResponse adjustStaffInventory(AuthUser principal, UUID productId,
            InventoryAdjustmentRequest request) {
        requireBranchScope(principal, request.branchId());
        return adjustInventoryRecord(principal, productId, request, "staff_adjustment");
    }

    @Transactional(readOnly = true)
    public List<UserSummaryResponse> staffUsers(AuthUser principal, String search) {
        branchIds(principal);
        return users.findAllByOrderByCreatedAtDesc().stream()
                .filter(user -> user.getStatus() == User.UserStatus.active)
                .filter(user -> userRoles.findActiveRoleCodesByUserId(user.getId()).contains("customer"))
                .filter(user -> matches(user, search)).map(this::user).toList();
    }

    @Transactional(readOnly = true)
    public DashboardResponse adminDashboard() {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime start = now.withOffsetSameInstant(ZoneOffset.UTC).toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);
        long activeBranches = branches.findAll().stream().filter(branch -> branch.getStatus() == Branch.BranchStatus.active).count();
        long activeStaff = users.findAll().stream().filter(user -> user.getStatus() == User.UserStatus.active).filter(user -> userRoles.findActiveRoleCodesByUserId(user.getId()).contains("staff")).count();
        long activeSessions = sessions.findAll().stream().filter(session -> session.getStatus() == PlaySession.PlaySessionStatus.active).count();
        long reservationsToday = reservations.findAll().stream().filter(reservation -> !reservation.getStartsAt().isBefore(start) && reservation.getStartsAt().isBefore(start.plusDays(1))).count();
        BigDecimal salesToday = orders.findAll().stream().filter(order -> !order.getPlacedAt().isBefore(start) && order.getPlacedAt().isBefore(start.plusDays(1))).map(Order::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        long activeTables = tables.findAll().stream().filter(StoreTable::isActive).count();
        long unavailableTables = tables.findAll().stream().filter(table -> !table.isActive() || table.getOperationalStatus() == StoreTable.OperationalStatus.unavailable).count();
        return new DashboardResponse("All branches", activeTables, Math.max(0, activeTables - unavailableTables), unavailableTables, activeSessions, reservationsToday, orders.count(), activeBranches, activeStaff, salesToday);
    }

    @Transactional(readOnly = true)
    public List<OrderSummaryResponse> adminOrders() { return orders.findAllByOrderByPlacedAtDesc().stream().map(this::order).toList(); }

    @Transactional(readOnly = true)
    public List<UserSummaryResponse> adminUsers(String search) { return users.findAllByOrderByCreatedAtDesc().stream().filter(user -> matches(user, search)).map(this::user).toList(); }

    @Transactional
    public UserSummaryResponse updateUserStatus(UUID userId, UpdateUserStatusRequest request) {
        User user = requiredUser(userId);
        user.setStatus(enumValue(User.UserStatus.class, request.status(), "User status"));
        user.setUpdatedAt(OffsetDateTime.now());
        return user(users.save(user));
    }

    @Transactional(readOnly = true)
    public List<StaffResponse> staff() {
        return users.findAllByOrderByCreatedAtDesc().stream().filter(user -> userRoles.findActiveRoleCodesByUserId(user.getId()).contains("staff")).map(this::staff).toList();
    }

    @Transactional
    public StaffResponse createStaff(AuthUser admin, CreateStaffRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.findByEmailIgnoreCase(email).isPresent()) throw conflict("An account already exists for that email");
        validateBranches(request.branchIds(), request.primaryBranchId());
        OffsetDateTime now = OffsetDateTime.now();
        User user = new User(); user.setFirstName(request.firstName().trim()); user.setLastName(request.lastName().trim());
        user.setDisplayName(blankToNull(request.displayName())); user.setEmail(email); user.setPhone(blankToNull(request.phone()));
        user.setPasswordHash(passwordEncoder.encode(request.password())); user.setStatus(User.UserStatus.active); user.setCreatedAt(now); user.setUpdatedAt(now);
        user = users.save(user); assignRole(user, "staff", admin.id(), now); replaceAssignments(user, request.branchIds(), request.primaryBranchId(), admin.id(), now);
        return staff(user);
    }

    @Transactional
    public StaffResponse updateStaff(AuthUser admin, UUID userId, UpdateStaffRequest request) {
        User user = requiredUser(userId);
        if (!userRoles.findActiveRoleCodesByUserId(userId).contains("staff")) throw notFound("Staff member");
        validateBranches(request.branchIds(), request.primaryBranchId());
        user.setFirstName(request.firstName().trim()); user.setLastName(request.lastName().trim()); user.setDisplayName(blankToNull(request.displayName())); user.setPhone(blankToNull(request.phone()));
        user.setStatus(enumValue(User.UserStatus.class, request.status(), "User status")); user.setUpdatedAt(OffsetDateTime.now()); users.save(user);
        replaceAssignments(user, request.branchIds(), request.primaryBranchId(), admin.id(), OffsetDateTime.now()); return staff(user);
    }

    @Transactional(readOnly = true)
    public List<BranchResponse> branches() { return branches.findAll().stream().sorted(Comparator.comparing(Branch::getName)).map(this::branch).toList(); }

    @Transactional
    public BranchResponse createBranch(BranchRequest request) { Branch branch = new Branch(); applyBranch(branch, request); return branch(branches.save(branch)); }

    @Transactional
    public BranchResponse updateBranch(UUID id, BranchRequest request) { Branch branch = requiredBranch(id); applyBranch(branch, request); return branch(branches.save(branch)); }

    @Transactional(readOnly = true)
    public List<ProductManagementResponse> products() { return products.findAll().stream().sorted(Comparator.comparing(Product::getName)).map(this::product).toList(); }

    @Transactional
    public ProductManagementResponse createProduct(ProductManagementRequest request) { Product product = new Product(); applyProduct(product, request); return product(products.save(product)); }

    @Transactional
    public ProductManagementResponse updateProduct(UUID id, ProductManagementRequest request) { Product product = products.findById(id).orElseThrow(() -> notFound("Product")); applyProduct(product, request); return product(products.save(product)); }

    @Transactional(readOnly = true)
    public List<InventoryResponse> inventory(UUID branchId) { requiredBranch(branchId); return inventory.findForBranch(branchId).stream().map(this::inventory).toList(); }

    @Transactional
    public InventoryResponse adjustInventory(AuthUser admin, UUID productId, InventoryAdjustmentRequest request) {
        return adjustInventoryRecord(admin, productId, request, "admin_adjustment");
    }

    @Transactional
    public InventoryResponse addInventory(AuthUser admin, AddInventoryRequest request) {
        Branch branch = requiredBranch(request.branchId());
        Product product = products.findById(request.productId()).orElseThrow(() -> notFound("Product"));
        BranchProductInventoryId id = new BranchProductInventoryId(branch.getId(), product.getId());
        if (inventory.existsById(id)) throw conflict("This product is already stocked at the selected branch");
        BranchProductInventory item = new BranchProductInventory();
        item.setId(id); item.setBranch(branch); item.setProduct(product);
        item.setQuantityOnHand(request.quantityOnHand()); item.setReservedQuantity(0);
        item.setLowStockThreshold(request.lowStockThreshold()); item.setUpdatedAt(OffsetDateTime.now());
        inventory.save(item);
        if (request.quantityOnHand() > 0) {
            recordMovement(admin, item, request.quantityOnHand(), "admin_initial_stock", null);
        }
        return inventory(item);
    }

    @Transactional(readOnly = true)
    public List<TableZoneResponse> tableZones(UUID branchId) {
        requiredBranch(branchId);
        return zones.findByBranchIdOrderBySortOrderAscNameAsc(branchId).stream()
                .map(zone -> new TableZoneResponse(zone.getId(), branchId, zone.getName(), zone.getSortOrder()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TableFeatureResponse> tableFeatures() {
        return features.findByIsActiveTrueOrderByNameAsc().stream()
                .map(feature -> new TableFeatureResponse(feature.getId(), feature.getName())).toList();
    }

    @Transactional(readOnly = true)
    public List<AdminTableResponse> tables(UUID branchId) {
        requiredBranch(branchId);
        return tables.findByBranchIdOrderBySortOrderAsc(branchId).stream().map(this::table).toList();
    }

    @Transactional
    public AdminTableResponse createTable(AdminTableRequest request) {
        validateTableRequest(request);
        if (tables.existsByBranchIdAndCodeIgnoreCase(request.branchId(), request.code().trim())) {
            throw conflict("A table with this code already exists at the selected branch");
        }
        StoreTable table = new StoreTable();
        table.setBranch(requiredBranch(request.branchId()));
        OffsetDateTime now = OffsetDateTime.now();
        applyTable(table, request); table.setCreatedAt(now); table.setUpdatedAt(now);
        table = tables.save(table); replaceTableFeatures(table, request.featureIds());
        return table(table);
    }

    @Transactional
    public AdminTableResponse updateTable(UUID id, AdminTableRequest request) {
        validateTableRequest(request);
        StoreTable table = tables.findById(id).orElseThrow(() -> notFound("Table"));
        if (!table.getBranch().getId().equals(request.branchId())) {
            throw badRequest("A table cannot be moved to another branch");
        }
        if (tables.existsByBranchIdAndCodeIgnoreCaseAndIdNot(request.branchId(), request.code().trim(), id)) {
            throw conflict("A table with this code already exists at the selected branch");
        }
        if (sessions.existsByTableIdAndStatus(id, PlaySession.PlaySessionStatus.active)) {
            throw conflict("An active play session is using this table");
        }
        boolean hasFutureReservation = reservations.existsByTableIdAndStatusInAndEndsAtGreaterThan(id,
                List.of(com.boardly.reservation.Reservation.ReservationStatus.pending,
                        com.boardly.reservation.Reservation.ReservationStatus.confirmed), OffsetDateTime.now());
        if (hasFutureReservation && (!request.active()
                || !"available".equalsIgnoreCase(request.operationalStatus()))) {
            throw conflict("Cancel or reassign future reservations before making this table unavailable");
        }
        if (reservations.findByTableIdAndStatusInAndEndsAtGreaterThan(id,
                        List.of(com.boardly.reservation.Reservation.ReservationStatus.pending,
                                com.boardly.reservation.Reservation.ReservationStatus.confirmed),
                        OffsetDateTime.now()).stream()
                .anyMatch(reservation -> reservation.getPlayerCount() < request.minPlayers()
                        || reservation.getPlayerCount() > request.maxPlayers())) {
            throw conflict("The new capacity would invalidate a future reservation");
        }
        applyTable(table, request); table.setUpdatedAt(OffsetDateTime.now()); tables.save(table);
        replaceTableFeatures(table, request.featureIds());
        return table(table);
    }

    @Transactional
    public AdminTableResponse deactivateTable(UUID id) {
        StoreTable table = tables.findById(id).orElseThrow(() -> notFound("Table"));
        if (sessions.existsByTableIdAndStatus(id, PlaySession.PlaySessionStatus.active)) {
            throw conflict("An active play session is using this table");
        }
        if (reservations.existsByTableIdAndStatusInAndEndsAtGreaterThan(id,
                List.of(com.boardly.reservation.Reservation.ReservationStatus.pending,
                        com.boardly.reservation.Reservation.ReservationStatus.confirmed), OffsetDateTime.now())) {
            throw conflict("Cancel or reassign future reservations before deactivating this table");
        }
        table.setActive(false); table.setOperationalStatus(StoreTable.OperationalStatus.unavailable);
        table.setUpdatedAt(OffsetDateTime.now());
        return table(tables.save(table));
    }

    private InventoryResponse adjustInventoryRecord(AuthUser actor, UUID productId,
            InventoryAdjustmentRequest request, String referenceType) {
        if (request.quantityDelta() == 0) throw badRequest("Quantity adjustment cannot be zero");
        BranchProductInventory item = inventory.findForUpdate(request.branchId(), productId)
                .orElseThrow(() -> notFound("Inventory record"));
        int next = item.getQuantityOnHand() + request.quantityDelta();
        if (next < item.getReservedQuantity()) {
            throw badRequest("The adjustment would reduce stock below the reserved quantity");
        }
        item.setQuantityOnHand(next); item.setUpdatedAt(OffsetDateTime.now()); inventory.save(item);
        recordMovement(actor, item, request.quantityDelta(), referenceType, blankToNull(request.note()));
        return inventory(item);
    }

    private void recordMovement(AuthUser actor, BranchProductInventory item, int delta,
            String referenceType, String note) {
        InventoryMovement movement = new InventoryMovement();
        movement.setBranch(item.getBranch()); movement.setProduct(item.getProduct());
        movement.setMovementType("adjustment"); movement.setQuantityDelta(delta);
        movement.setReferenceType(referenceType); movement.setNote(note);
        movement.setCreatedBy(requiredUser(actor.id())); movement.setCreatedAt(OffsetDateTime.now());
        movements.save(movement);
    }

    private void validateTableRequest(AdminTableRequest request) {
        if (request.maxPlayers() < request.minPlayers()) {
            throw badRequest("Maximum players must be at least minimum players");
        }
        requiredBranch(request.branchId());
        zones.findByIdAndBranchId(request.zoneId(), request.branchId())
                .orElseThrow(() -> badRequest("The selected zone does not belong to this branch"));
        for (UUID featureId : new LinkedHashSet<>(request.featureIds())) {
            TableFeature feature = features.findById(featureId).orElseThrow(() -> notFound("Table feature"));
            if (!feature.isActive()) throw badRequest("Inactive table features cannot be assigned");
        }
        enumValue(StoreTable.OperationalStatus.class, request.operationalStatus(), "Operational status");
    }

    private void applyTable(StoreTable table, AdminTableRequest request) {
        table.setCode(request.code().trim().toUpperCase(Locale.ROOT));
        table.setZone(zones.findByIdAndBranchId(request.zoneId(), request.branchId())
                .orElseThrow(() -> badRequest("The selected zone does not belong to this branch")));
        table.setMinPlayers(request.minPlayers()); table.setMaxPlayers(request.maxPlayers());
        table.setOperationalStatus(enumValue(StoreTable.OperationalStatus.class,
                request.operationalStatus(), "Operational status"));
        table.setSortOrder(request.sortOrder()); table.setActive(request.active());
    }

    private void replaceTableFeatures(StoreTable table, List<UUID> featureIds) {
        tableFeatures.deleteByTableId(table.getId());
        for (UUID featureId : new LinkedHashSet<>(featureIds)) {
            TableFeature feature = features.findById(featureId).orElseThrow(() -> notFound("Table feature"));
            StoreTableFeature link = new StoreTableFeature();
            link.setId(new StoreTableFeatureId(table.getId(), featureId));
            link.setTable(table); link.setFeature(feature); tableFeatures.save(link);
        }
    }

    private AdminTableResponse table(StoreTable table) {
        List<StoreTableFeature> assigned = tableFeatures.findByTableId(table.getId());
        return new AdminTableResponse(table.getId(), table.getBranch().getId(), table.getBranch().getName(),
                table.getCode(), table.getZone().getId(), table.getZone().getName(), table.getMinPlayers(),
                table.getMaxPlayers(), table.getOperationalStatus().name(), table.getSortOrder(), table.isActive(),
                assigned.stream().map(item -> item.getFeature().getId()).toList(),
                assigned.stream().map(item -> item.getFeature().getName()).toList());
    }

    private DashboardResponse dashboard(Branch branch) {
        OffsetDateTime now = OffsetDateTime.now(); OffsetDateTime dayStart = now.withOffsetSameInstant(ZoneOffset.UTC).toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);
        long total = tables.countByBranchIdAndIsActiveTrue(branch.getId());
        long unavailable = tables.countByBranchIdAndIsActiveTrueAndOperationalStatus(branch.getId(), StoreTable.OperationalStatus.unavailable);
        long activeSessions = sessions.countByBranchIdAndStatus(branch.getId(), PlaySession.PlaySessionStatus.active);
        long reservationsToday = reservations.countByBranchIdAndStartsAtBetween(branch.getId(), dayStart, dayStart.plusDays(1));
        List<Order> branchOrders = orders.findByPickupBranchIdInOrderByPlacedAtDesc(List.of(branch.getId()));
        BigDecimal salesToday = branchOrders.stream().filter(order -> !order.getPlacedAt().isBefore(dayStart) && order.getPlacedAt().isBefore(dayStart.plusDays(1))).map(Order::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new DashboardResponse(branch.getName(), total, Math.max(0, total - unavailable - activeSessions), unavailable, activeSessions, reservationsToday, branchOrders.size(), 0, 0, salesToday);
    }

    private ProfileResponse profile(User user) { return new ProfileResponse(user.getId(), user.getFirstName(), user.getLastName(), user.getDisplayName(), user.getEmail(), user.getPhone()); }
    private OrderSummaryResponse order(Order order) { return new OrderSummaryResponse(order.getOrderNumber(), order.getContactFirstName() + " " + order.getContactLastName(), order.getStatus(), order.getFulfillmentMethod().getName(), order.getPickupBranch() == null ? null : order.getPickupBranch().getName(), order.getTotalAmount(), order.getCurrency(), (int) orderItems.countByOrderId(order.getId()), order.getPlacedAt()); }
    private UserSummaryResponse user(User user) { return new UserSummaryResponse(user.getId(), displayName(user), user.getEmail(), user.getPhone(), user.getStatus().name(), userRoles.findActiveRoleCodesByUserId(user.getId()), orders.countByUserId(user.getId()), reservations.countByUserId(user.getId()), sessions.countByUserIdAndStatus(user.getId(), PlaySession.PlaySessionStatus.completed), user.getLastLoginAt() == null ? user.getCreatedAt() : user.getLastLoginAt()); }
    private StaffResponse staff(User user) { List<StaffBranchAssignment> list = assignments.findByUserIdOrderByIsPrimaryDescAssignedAtAsc(user.getId()); return new StaffResponse(user.getId(), displayName(user), user.getEmail(), user.getPhone(), user.getStatus().name(), list.stream().map(item -> item.getBranch().getId()).toList(), list.stream().map(item -> item.getBranch().getName()).toList(), user.getLastLoginAt()); }
    private BranchResponse branch(Branch branch) { OffsetDateTime now = OffsetDateTime.now(); OffsetDateTime dayStart = now.withOffsetSameInstant(ZoneOffset.UTC).toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC); long staffCount = assignments.findAllByOrderByAssignedAtDesc().stream().filter(item -> item.getBranch().getId().equals(branch.getId())).map(item -> item.getUser().getId()).distinct().count(); return new BranchResponse(branch.getId(), branch.getCode(), branch.getName(), branch.getAddressLine1(), branch.getDistrict(), branch.getProvince(), branch.getPostalCode(), branch.getPhone(), branch.getStatus().name(), branch.isAllowReservations(), tables.countByBranchIdAndIsActiveTrue(branch.getId()), staffCount, reservations.countByBranchIdAndStartsAtBetween(branch.getId(), dayStart, dayStart.plusDays(1))); }
    private ProductManagementResponse product(Product product) { long stock = inventory.availableStockByProductId(product.getId()); return new ProductManagementResponse(product.getId(), product.getSku(), product.getName(), product.getCategory().getId(), product.getCategory().getName(), product.getBasePrice(), product.getSalePrice(), product.getMinPlayers(), product.getMaxPlayers(), product.getMinPlayTimeMinutes(), product.getMaxPlayTimeMinutes(), product.getMinAge(), product.getDifficulty().name(), product.getDescription(), product.isActive(), stock); }
    private InventoryResponse inventory(BranchProductInventory item) { return new InventoryResponse(item.getBranch().getId(), item.getBranch().getName(), item.getProduct().getId(), item.getProduct().getName(), item.getProduct().getSku(), item.getQuantityOnHand(), item.getReservedQuantity(), item.getQuantityOnHand() - item.getReservedQuantity(), item.getLowStockThreshold()); }

    private void applyBranch(Branch branch, BranchRequest request) { branch.setCode(request.code().trim().toUpperCase(Locale.ROOT)); branch.setName(request.name().trim()); branch.setAddressLine1(request.address().trim()); branch.setDistrict(request.district().trim()); branch.setProvince(blankToNull(request.province())); branch.setPostalCode(blankToNull(request.postalCode())); branch.setPhone(blankToNull(request.phone())); branch.setStatus(enumValue(Branch.BranchStatus.class, request.status(), "Branch status")); branch.setAllowReservations(request.allowReservations()); }
    private void applyProduct(Product product, ProductManagementRequest request) { if (request.maxPlayers() < request.minPlayers()) throw badRequest("Maximum players must be at least minimum players"); if (request.salePrice() != null && request.salePrice().compareTo(request.basePrice()) > 0) throw badRequest("Sale price cannot exceed base price"); product.setSku(request.sku().trim().toUpperCase(Locale.ROOT)); product.setName(request.name().trim()); product.setCategory(categories.findById(request.categoryId()).orElseThrow(() -> notFound("Product category"))); product.setBasePrice(request.basePrice()); product.setSalePrice(request.salePrice()); product.setMinPlayers(request.minPlayers()); product.setMaxPlayers(request.maxPlayers()); product.setMinPlayTimeMinutes(request.minPlayTimeMinutes()); product.setMaxPlayTimeMinutes(request.maxPlayTimeMinutes()); product.setMinAge(request.minAge()); product.setDifficulty(enumValue(Product.ProductDifficulty.class, request.difficulty(), "Product difficulty")); product.setDescription(blankToNull(request.description())); product.setActive(request.active()); product.setUpdatedAt(OffsetDateTime.now()); }
    private void assignRole(User user, String code, UUID assignedBy, OffsetDateTime now) { Role role = roles.findByCodeAndIsActiveTrue(code).orElseThrow(() -> new IllegalStateException("Required role is not configured")); UserRole userRole = new UserRole(); userRole.setId(new UserRoleId(user.getId(), role.getId())); userRole.setUser(user); userRole.setRole(role); userRole.setAssignedAt(now); userRole.setAssignedBy(assignedBy); userRoles.save(userRole); }
    private void replaceAssignments(User user, List<UUID> branchIds, UUID primaryBranchId, UUID assignedBy, OffsetDateTime now) { assignments.deleteAllByUserId(user.getId()); for (UUID branchId : new LinkedHashSet<>(branchIds)) { StaffBranchAssignment assignment = new StaffBranchAssignment(); assignment.setId(new StaffBranchAssignmentId(user.getId(), branchId)); assignment.setUser(user); assignment.setBranch(requiredBranch(branchId)); assignment.setAssignedAt(now); assignment.setAssignedBy(assignedBy); assignment.setPrimary(branchId.equals(primaryBranchId)); assignments.save(assignment); } }
    private void validateBranches(List<UUID> branchIds, UUID primaryBranchId) { if (!branchIds.contains(primaryBranchId)) throw badRequest("Primary branch must be one of the assigned branches"); for (UUID branchId : new LinkedHashSet<>(branchIds)) requiredBranch(branchId); }
    private Branch staffBranch(AuthUser principal) { List<UUID> ids = branchIds(principal); return requiredBranch(ids.getFirst()); }
    private List<UUID> branchIds(AuthUser principal) { if (principal.roles().contains("admin")) { return branches.findAll().stream().filter(branch -> branch.getStatus() == Branch.BranchStatus.active).map(Branch::getId).toList(); } List<UUID> ids = assignments.findByUserIdOrderByIsPrimaryDescAssignedAtAsc(principal.id()).stream().map(item -> item.getBranch().getId()).toList(); if (ids.isEmpty()) throw new BoardlyException("No branch assignment is configured for this staff account", HttpStatus.FORBIDDEN.value(), "BRANCH_ACCESS_DENIED"); return ids; }
    private void requireBranchScope(AuthUser principal, UUID branchId) { if (!branchIds(principal).contains(branchId)) throw new BoardlyException("You are not assigned to this branch", HttpStatus.FORBIDDEN.value(), "BRANCH_ACCESS_DENIED"); }
    private User requiredUser(UUID id) { return users.findById(id).orElseThrow(() -> notFound("User")); }
    private Branch requiredBranch(UUID id) { return branches.findById(id).orElseThrow(() -> notFound("Branch")); }
    private boolean matches(User user, String search) { if (search == null || search.isBlank()) return true; String needle = search.trim().toLowerCase(Locale.ROOT); return displayName(user).toLowerCase(Locale.ROOT).contains(needle) || user.getEmail().toLowerCase(Locale.ROOT).contains(needle) || (user.getPhone() != null && user.getPhone().contains(needle)); }
    private String displayName(User user) { return user.getDisplayName() == null || user.getDisplayName().isBlank() ? user.getFirstName() + " " + user.getLastName() : user.getDisplayName(); }
    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private <T extends Enum<T>> T enumValue(Class<T> type, String value, String label) { try { return Enum.valueOf(type, value.trim().toLowerCase(Locale.ROOT)); } catch (Exception ignored) { throw badRequest(label + " is invalid"); } }
    private BoardlyException notFound(String label) { return new BoardlyException(label + " not found", HttpStatus.NOT_FOUND.value(), "NOT_FOUND"); }
    private BoardlyException badRequest(String message) { return new BoardlyException(message, HttpStatus.BAD_REQUEST.value(), "VALIDATION_ERROR"); }
    private BoardlyException conflict(String message) { return new BoardlyException(message, HttpStatus.CONFLICT.value(), "CONFLICT"); }
}
