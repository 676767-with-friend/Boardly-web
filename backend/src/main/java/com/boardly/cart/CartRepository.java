package com.boardly.cart;

import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface CartRepository extends JpaRepository<Cart, UUID> {
    Optional<Cart> findByUserIdAndStatus(UUID userId, Cart.CartStatus status);
    Optional<Cart> findByGuestSessionKeyAndStatus(String guestSessionKey, Cart.CartStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select cart from Cart cart where cart.user.id = :userId and cart.status = :status")
    Optional<Cart> findByUserIdAndStatusForUpdate(UUID userId, Cart.CartStatus status);
}
