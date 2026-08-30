package com.boardly.cart;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CartRepository extends JpaRepository<Cart, UUID> {
    Optional<Cart> findByUserIdAndStatus(UUID userId, Cart.CartStatus status);
    Optional<Cart> findByGuestSessionKeyAndStatus(String guestSessionKey, Cart.CartStatus status);
}
