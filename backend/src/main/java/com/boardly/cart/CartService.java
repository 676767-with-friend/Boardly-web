package com.boardly.cart;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.boardly.auth.AuthUser;
import com.boardly.common.exception.BoardlyException;
import com.boardly.product.Product;
import com.boardly.product.ProductMediaRepository;
import com.boardly.product.ProductRepository;
import com.boardly.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CartService {
    private static final String CURRENCY = "THB";

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final ProductMediaRepository mediaRepository;
    private final UserRepository userRepository;

    public CartService(CartRepository cartRepository, CartItemRepository cartItemRepository,
                       ProductRepository productRepository, ProductMediaRepository mediaRepository,
                       UserRepository userRepository) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.mediaRepository = mediaRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public CartDtos.CartResponse getCart(AuthUser authUser, String guestSessionKey) {
        return findActiveCart(authUser, guestSessionKey).map(this::toResponse)
                .orElseGet(() -> new CartDtos.CartResponse(null, List.of(), 0, money(BigDecimal.ZERO), CURRENCY));
    }

    @Transactional
    public CartDtos.CartResponse addItem(AuthUser authUser, String guestSessionKey, CartDtos.AddCartItemRequest request) {
        Cart cart = findOrCreateActiveCart(authUser, guestSessionKey);
        Product product = productRepository.findById(request.productId())
                .filter(Product::isActive)
                .orElseThrow(() -> new BoardlyException("The selected product is unavailable.", HttpStatus.NOT_FOUND.value(), "PRODUCT_NOT_FOUND"));

        CartItem item = cartItemRepository.findByCartIdAndProductId(cart.getId(), product.getId()).orElseGet(CartItem::new);
        int quantity = item.getId() == null ? request.quantity() : item.getQuantity() + request.quantity();
        validateQuantity(quantity);
        OffsetDateTime now = OffsetDateTime.now();
        item.setCart(cart);
        item.setProduct(product);
        item.setQuantity(quantity);
        if (item.getCreatedAt() == null) item.setCreatedAt(now);
        item.setUpdatedAt(now);
        cartItemRepository.save(item);
        cart.setUpdatedAt(now);
        cartRepository.save(cart);
        return toResponse(cart);
    }

    @Transactional
    public CartDtos.CartResponse updateItem(AuthUser authUser, String guestSessionKey, UUID itemId, CartDtos.UpdateCartItemRequest request) {
        validateQuantity(request.quantity());
        Cart cart = requireActiveCart(authUser, guestSessionKey);
        CartItem item = cartItemRepository.findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> new BoardlyException("The cart item was not found.", HttpStatus.NOT_FOUND.value(), "CART_ITEM_NOT_FOUND"));
        item.setQuantity(request.quantity());
        item.setUpdatedAt(OffsetDateTime.now());
        cartItemRepository.save(item);
        return toResponse(cart);
    }

    @Transactional
    public void removeItem(AuthUser authUser, String guestSessionKey, UUID itemId) {
        Cart cart = requireActiveCart(authUser, guestSessionKey);
        CartItem item = cartItemRepository.findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> new BoardlyException("The cart item was not found.", HttpStatus.NOT_FOUND.value(), "CART_ITEM_NOT_FOUND"));
        cartItemRepository.delete(item);
    }

    @Transactional
    public void clear(AuthUser authUser, String guestSessionKey) {
        findActiveCart(authUser, guestSessionKey).ifPresent(cart -> cartItemRepository.deleteAll(cartItemRepository.findByCartIdOrderByCreatedAtAsc(cart.getId())));
    }

    @Transactional(readOnly = true)
    public Cart requireActiveCart(AuthUser authUser, String guestSessionKey) {
        return findActiveCart(authUser, guestSessionKey)
                .orElseThrow(() -> new BoardlyException("Your cart is empty.", HttpStatus.UNPROCESSABLE_ENTITY.value(), "CART_EMPTY"));
    }

    @Transactional(readOnly = true)
    public List<CartItem> activeItems(Cart cart) {
        return cartItemRepository.findByCartIdOrderByCreatedAtAsc(cart.getId());
    }

    private Optional<Cart> findActiveCart(AuthUser authUser, String guestSessionKey) {
        if (authUser != null) return cartRepository.findByUserIdAndStatus(authUser.id(), Cart.CartStatus.active);
        return cartRepository.findByGuestSessionKeyAndStatus(requireGuestSessionKey(guestSessionKey), Cart.CartStatus.active);
    }

    private Cart findOrCreateActiveCart(AuthUser authUser, String guestSessionKey) {
        Optional<Cart> existing = findActiveCart(authUser, guestSessionKey);
        if (existing.isPresent()) return existing.get();

        OffsetDateTime now = OffsetDateTime.now();
        Cart cart = new Cart();
        cart.setStatus(Cart.CartStatus.active);
        cart.setCreatedAt(now);
        cart.setUpdatedAt(now);
        if (authUser != null) {
            cart.setUser(userRepository.getReferenceById(authUser.id()));
        } else {
            cart.setGuestSessionKey(requireGuestSessionKey(guestSessionKey));
            cart.setExpiresAt(now.plusDays(30));
        }
        return cartRepository.save(cart);
    }

    private CartDtos.CartResponse toResponse(Cart cart) {
        List<CartDtos.CartItemResponse> items = cartItemRepository.findByCartIdOrderByCreatedAtAsc(cart.getId()).stream()
                .map(item -> {
                    Product product = item.getProduct();
                    BigDecimal price = currentPrice(product);
                    String image = mediaRepository.findByProductIdOrderBySortOrderAsc(product.getId()).stream()
                            .filter(media -> media.isPrimary() && media.getMediaType().name().equals("image"))
                            .findFirst()
                            .or(() -> mediaRepository.findByProductIdOrderBySortOrderAsc(product.getId()).stream().findFirst())
                            .map(media -> media.getMediaUrl()).orElse(null);
                    return new CartDtos.CartItemResponse(item.getId(), product.getId(), product.getName(), product.getSku(), image,
                            price, item.getQuantity(), money(price.multiply(BigDecimal.valueOf(item.getQuantity()))));
                }).toList();
        BigDecimal subtotal = items.stream().map(CartDtos.CartItemResponse::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        int itemCount = items.stream().mapToInt(CartDtos.CartItemResponse::quantity).sum();
        return new CartDtos.CartResponse(cart.getId(), items, itemCount, money(subtotal), CURRENCY);
    }

    public static BigDecimal currentPrice(Product product) {
        return money(product.getSalePrice() != null ? product.getSalePrice() : product.getBasePrice());
    }

    private static BigDecimal money(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private static void validateQuantity(int quantity) {
        if (quantity < 1 || quantity > 99) {
            throw new BoardlyException("Quantity must be between 1 and 99.", HttpStatus.BAD_REQUEST.value(), "INVALID_QUANTITY");
        }
    }

    private static String requireGuestSessionKey(String guestSessionKey) {
        if (guestSessionKey == null || guestSessionKey.isBlank() || guestSessionKey.length() > 255) {
            throw new BoardlyException("A cart session is required.", HttpStatus.UNAUTHORIZED.value(), "CART_SESSION_REQUIRED");
        }
        try {
            UUID.fromString(guestSessionKey);
            return guestSessionKey;
        } catch (IllegalArgumentException ex) {
            throw new BoardlyException("A cart session is required.", HttpStatus.UNAUTHORIZED.value(), "CART_SESSION_REQUIRED");
        }
    }
}
