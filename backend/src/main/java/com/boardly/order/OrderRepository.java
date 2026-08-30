package com.boardly.order;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    Optional<Order> findByOrderNumberAndUserId(String orderNumber, UUID userId);
    List<Order> findByUserIdOrderByPlacedAtDesc(UUID userId);
    List<Order> findAllByOrderByPlacedAtDesc();
    List<Order> findByPickupBranchIdInOrderByPlacedAtDesc(List<UUID> branchIds);
    long countByUserId(UUID userId);
    long countByPickupBranchId(UUID branchId);
}
