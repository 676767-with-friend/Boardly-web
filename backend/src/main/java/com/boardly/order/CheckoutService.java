package com.boardly.order;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.boardly.auth.AuthUser;
import com.boardly.branch.Branch;
import com.boardly.branch.BranchRepository;
import com.boardly.cart.Cart;
import com.boardly.cart.CartItem;
import com.boardly.cart.CartService;
import com.boardly.common.exception.BoardlyException;
import com.boardly.inventory.BranchProductInventory;
import com.boardly.inventory.BranchProductInventoryRepository;
import com.boardly.inventory.InventoryMovement;
import com.boardly.inventory.InventoryMovementRepository;
import com.boardly.product.Product;
import com.boardly.product.ProductRepository;
import com.boardly.user.User;
import com.boardly.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CheckoutService {
    private static final String CURRENCY = "THB";

    private final CartService cartService;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final BranchRepository branchRepository;
    private final BranchProductInventoryRepository inventoryRepository;
    private final InventoryMovementRepository movementRepository;
    private final FulfillmentMethodRepository fulfillmentMethodRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;

    public CheckoutService(CartService cartService, UserRepository userRepository, ProductRepository productRepository,
                           BranchRepository branchRepository, BranchProductInventoryRepository inventoryRepository,
                           InventoryMovementRepository movementRepository, FulfillmentMethodRepository fulfillmentMethodRepository,
                           PaymentMethodRepository paymentMethodRepository, OrderRepository orderRepository,
                           OrderItemRepository orderItemRepository, PaymentRepository paymentRepository,
                           PaymentService paymentService) {
        this.cartService = cartService;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.branchRepository = branchRepository;
        this.inventoryRepository = inventoryRepository;
        this.movementRepository = movementRepository;
        this.fulfillmentMethodRepository = fulfillmentMethodRepository;
        this.paymentMethodRepository = paymentMethodRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.paymentRepository = paymentRepository;
        this.paymentService = paymentService;
    }

    @Transactional(readOnly = true)
    public CheckoutDtos.CheckoutOptionsResponse options(AuthUser authUser) {
        List<CheckoutDtos.FulfillmentOptionResponse> fulfillment = fulfillmentMethodRepository.findByIsActiveTrueOrderByNameAsc().stream()
                .map(method -> new CheckoutDtos.FulfillmentOptionResponse(
                        method.getId(), method.getCode(), method.getName(), money(method.getBaseFee()), method.getEtaMinDays(),
                        method.getEtaMaxDays(), method.isStorePickup(), method.isStorePickup(),
                        method.isStorePickup() ? null : "Delivery is unavailable until Boardly defines a delivery inventory source."))
                .toList();
        List<CheckoutDtos.PaymentMethodResponse> paymentMethods = paymentMethodRepository.findByIsActiveTrueOrderByNameAsc().stream()
                .map(method -> new CheckoutDtos.PaymentMethodResponse(method.getId(), method.getCode(), method.getName())).toList();
        Cart cart = cartService.requireActiveCart(authUser, null);
        List<CartItem> cartItems = cartService.activeItems(cart);
        List<CheckoutDtos.PickupBranchResponse> eligiblePickupBranches = branchRepository.findAll().stream()
                .filter(branch -> branch.getStatus() == Branch.BranchStatus.active)
                .filter(branch -> canFulfillWholeCart(branch, cartItems))
                .sorted(java.util.Comparator.comparing(Branch::getName))
                .map(branch -> new CheckoutDtos.PickupBranchResponse(branch.getId(), branch.getName(), branch.getAddressLine1(), branch.getDistrict()))
                .toList();
        return new CheckoutDtos.CheckoutOptionsResponse(fulfillment, paymentMethods, eligiblePickupBranches);
    }

    @Transactional
    public CheckoutDtos.OrderResponse checkout(AuthUser authUser, CheckoutDtos.CheckoutRequest request) {
        User user = userRepository.findById(authUser.id())
                .orElseThrow(() -> new BoardlyException("Your account is unavailable.", HttpStatus.UNAUTHORIZED.value(), "AUTHENTICATION_REQUIRED"));
        Cart cart = cartService.requireActiveCart(authUser, null);
        List<CartItem> cartItems = cartService.activeItems(cart);
        if (cartItems.isEmpty()) {
            throw new BoardlyException("Your cart is empty.", HttpStatus.UNPROCESSABLE_ENTITY.value(), "CART_EMPTY");
        }

        FulfillmentMethod fulfillmentMethod = fulfillmentMethodRepository.findById(request.fulfillmentMethodId())
                .filter(FulfillmentMethod::isActive)
                .orElseThrow(() -> new BoardlyException("The fulfillment method is unavailable.", HttpStatus.BAD_REQUEST.value(), "FULFILLMENT_METHOD_INVALID"));
        if (!fulfillmentMethod.isStorePickup()) {
            throw new BoardlyException("Delivery checkout is unavailable until a delivery inventory source is defined.",
                    HttpStatus.UNPROCESSABLE_ENTITY.value(), "DELIVERY_INVENTORY_UNRESOLVED");
        }
        if (request.pickupBranchId() == null) {
            throw new BoardlyException("A pickup branch is required for store pickup.", HttpStatus.BAD_REQUEST.value(), "PICKUP_BRANCH_REQUIRED");
        }
        Branch pickupBranch = branchRepository.findById(request.pickupBranchId())
                .filter(branch -> branch.getStatus() == Branch.BranchStatus.active)
                .orElseThrow(() -> new BoardlyException("The pickup branch is unavailable.", HttpStatus.BAD_REQUEST.value(), "PICKUP_BRANCH_INVALID"));
        PaymentMethod paymentMethod = paymentMethodRepository.findById(request.paymentMethodId())
                .filter(PaymentMethod::isActive)
                .orElseThrow(() -> new BoardlyException("The payment method is unavailable.", HttpStatus.BAD_REQUEST.value(), "PAYMENT_METHOD_INVALID"));

        BigDecimal subtotal = cartItems.stream().map(item -> {
            Product product = productRepository.findById(item.getProduct().getId()).filter(Product::isActive)
                    .orElseThrow(() -> new BoardlyException("A cart product is unavailable.", HttpStatus.UNPROCESSABLE_ENTITY.value(), "PRODUCT_UNAVAILABLE"));
            return CartService.currentPrice(product).multiply(BigDecimal.valueOf(item.getQuantity()));
        }).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal shippingFee = money(fulfillmentMethod.getBaseFee());
        OffsetDateTime now = OffsetDateTime.now();

        Order order = new Order();
        order.setOrderNumber(nextOrderNumber());
        order.setUser(user);
        order.setStatus("new");
        order.setFulfillmentMethod(fulfillmentMethod);
        order.setPickupBranch(pickupBranch);
        order.setContactFirstName(request.contactFirstName().trim());
        order.setContactLastName(request.contactLastName().trim());
        order.setContactEmail(request.contactEmail().trim().toLowerCase());
        order.setContactPhone(blankToNull(request.contactPhone()));
        order.setShippingAddress(null);
        order.setShippingDistrict(null);
        order.setShippingProvince(null);
        order.setShippingPostalCode(null);
        order.setSubtotal(money(subtotal));
        order.setShippingFee(shippingFee);
        order.setTotalAmount(money(subtotal.add(shippingFee)));
        order.setCurrency(CURRENCY);
        order.setPlacedAt(now);
        order.setCreatedAt(now);
        order.setUpdatedAt(now);
        order = orderRepository.save(order);

        for (CartItem cartItem : cartItems) {
            Product product = productRepository.findById(cartItem.getProduct().getId()).filter(Product::isActive)
                    .orElseThrow(() -> new BoardlyException("A cart product is unavailable.", HttpStatus.UNPROCESSABLE_ENTITY.value(), "PRODUCT_UNAVAILABLE"));
            BranchProductInventory inventory = inventoryRepository.findForUpdate(pickupBranch.getId(), product.getId())
                    .orElseThrow(() -> new BoardlyException("This product is not stocked at the selected pickup branch.",
                            HttpStatus.UNPROCESSABLE_ENTITY.value(), "PICKUP_STOCK_UNAVAILABLE"));
            int available = inventory.getQuantityOnHand() - inventory.getReservedQuantity();
            if (cartItem.getQuantity() > available) {
                throw new BoardlyException("One or more products are out of stock at the selected pickup branch.",
                        HttpStatus.UNPROCESSABLE_ENTITY.value(), "PICKUP_STOCK_UNAVAILABLE");
            }
            inventory.setReservedQuantity(inventory.getReservedQuantity() + cartItem.getQuantity());
            inventory.setUpdatedAt(now);
            inventoryRepository.save(inventory);

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProduct(product);
            orderItem.setProductNameSnapshot(product.getName());
            orderItem.setSkuSnapshot(product.getSku());
            orderItem.setUnitPrice(CartService.currentPrice(product));
            orderItem.setQuantity(cartItem.getQuantity());
            orderItemRepository.save(orderItem);

            InventoryMovement movement = new InventoryMovement();
            movement.setBranch(pickupBranch);
            movement.setProduct(product);
            movement.setMovementType("reserve");
            movement.setQuantityDelta(cartItem.getQuantity());
            movement.setReferenceType("order");
            movement.setReferenceId(order.getId());
            movement.setNote("Pickup order reservation");
            movement.setCreatedBy(user);
            movement.setCreatedAt(now);
            movementRepository.save(movement);
        }

        paymentService.createPendingPayment(order, paymentMethod, order.getTotalAmount(), CURRENCY);
        cart.setStatus(Cart.CartStatus.converted);
        cart.setUpdatedAt(now);
        return toResponse(order);
    }

    @Transactional(readOnly = true)
    public CheckoutDtos.OrderResponse getOrder(AuthUser authUser, String orderNumber) {
        Order order = orderRepository.findByOrderNumberAndUserId(orderNumber, authUser.id())
                .orElseThrow(() -> new BoardlyException("The order was not found.", HttpStatus.NOT_FOUND.value(), "ORDER_NOT_FOUND"));
        return toResponse(order);
    }

    @Transactional(readOnly = true)
    public List<CheckoutDtos.OrderResponse> myOrders(AuthUser authUser) {
        return orderRepository.findByUserIdOrderByPlacedAtDesc(authUser.id()).stream().map(this::toResponse).toList();
    }

    private CheckoutDtos.OrderResponse toResponse(Order order) {
        List<CheckoutDtos.OrderItemResponse> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId()).stream()
                .map(item -> new CheckoutDtos.OrderItemResponse(item.getProduct() == null ? null : item.getProduct().getId(),
                        item.getProductNameSnapshot(), item.getSkuSnapshot(), item.getUnitPrice(), item.getQuantity(),
                        money(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))))
                .toList();
        Payment payment = paymentRepository.findFirstByOrderIdOrderByCreatedAtAsc(order.getId()).orElse(null);
        return new CheckoutDtos.OrderResponse(order.getOrderNumber(), order.getStatus(), order.getFulfillmentMethod().getName(),
                order.getPickupBranch() == null ? null : order.getPickupBranch().getName(), order.getSubtotal(), order.getShippingFee(),
                order.getTotalAmount(), order.getCurrency(), order.getEstimatedDeliveryDate(),
                payment == null ? null : payment.getStatus().name(), payment == null ? null : payment.getPaymentMethod().getName(), items);
    }

    private static String nextOrderNumber() {
        return "BG-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
    }

    private boolean canFulfillWholeCart(Branch branch, List<CartItem> cartItems) {
        java.util.Map<UUID, Integer> availableByProduct = inventoryRepository.findForBranch(branch.getId()).stream()
                .collect(java.util.stream.Collectors.toMap(item -> item.getProduct().getId(), item -> item.getQuantityOnHand() - item.getReservedQuantity()));
        return cartItems.stream().allMatch(item -> availableByProduct.getOrDefault(item.getProduct().getId(), 0) >= item.getQuantity());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static BigDecimal money(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }
}
