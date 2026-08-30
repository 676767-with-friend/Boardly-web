package com.boardly.inventory;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, UUID> {
}
