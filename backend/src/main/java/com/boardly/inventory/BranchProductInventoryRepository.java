package com.boardly.inventory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

public interface BranchProductInventoryRepository extends JpaRepository<BranchProductInventory, BranchProductInventoryId> {
    @Query("select coalesce(sum(i.quantityOnHand - i.reservedQuantity), 0) from BranchProductInventory i where i.product.id = :productId")
    Long availableStockByProductId(UUID productId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from BranchProductInventory i where i.branch.id = :branchId and i.product.id = :productId")
    Optional<BranchProductInventory> findForUpdate(UUID branchId, UUID productId);

    @Query("select inventory from BranchProductInventory inventory join fetch inventory.product product where inventory.branch.id = :branchId order by product.name")
    List<BranchProductInventory> findForBranch(UUID branchId);
}
