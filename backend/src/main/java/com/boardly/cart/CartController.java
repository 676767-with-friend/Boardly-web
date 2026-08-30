package com.boardly.cart;

import java.util.UUID;

import com.boardly.auth.AuthUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cart")
public class CartController {
    private static final String GUEST_SESSION_HEADER = "X-Guest-Session-Key";
    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public CartDtos.CartResponse getCart(@AuthenticationPrincipal AuthUser authUser,
                                         @RequestHeader(value = GUEST_SESSION_HEADER, required = false) String guestSessionKey) {
        return cartService.getCart(authUser, guestSessionKey);
    }

    @PostMapping("/items")
    public ResponseEntity<CartDtos.CartResponse> addItem(@AuthenticationPrincipal AuthUser authUser,
                                                          @RequestHeader(value = GUEST_SESSION_HEADER, required = false) String guestSessionKey,
                                                          @Valid @RequestBody CartDtos.AddCartItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cartService.addItem(authUser, guestSessionKey, request));
    }

    @PatchMapping("/items/{itemId}")
    public CartDtos.CartResponse updateItem(@AuthenticationPrincipal AuthUser authUser,
                                            @RequestHeader(value = GUEST_SESSION_HEADER, required = false) String guestSessionKey,
                                            @PathVariable UUID itemId,
                                            @Valid @RequestBody CartDtos.UpdateCartItemRequest request) {
        return cartService.updateItem(authUser, guestSessionKey, itemId, request);
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<Void> removeItem(@AuthenticationPrincipal AuthUser authUser,
                                           @RequestHeader(value = GUEST_SESSION_HEADER, required = false) String guestSessionKey,
                                           @PathVariable UUID itemId) {
        cartService.removeItem(authUser, guestSessionKey, itemId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> clear(@AuthenticationPrincipal AuthUser authUser,
                                      @RequestHeader(value = GUEST_SESSION_HEADER, required = false) String guestSessionKey) {
        cartService.clear(authUser, guestSessionKey);
        return ResponseEntity.noContent().build();
    }
}
